const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, admin } = require("./firebaseAdmin");

// 1. GET PUBLIC DOCUMENT (Read Only)
exports.getPublicEnvelope = onCall({ cors: true }, async (request) => {
    const { companyId, requestId, accessToken } = request.data;

    if (!companyId || !requestId || !accessToken) {
        throw new HttpsError('invalid-argument', 'Missing parameters.');
    }

    try {
        const docRef = db.collection('companies').doc(companyId).collection('signing_requests').doc(requestId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            throw new HttpsError('not-found', 'Document not found.');
        }

        const data = docSnap.data();

        // SECURITY CHECK: Does the token match?
        if (data.accessToken !== accessToken) {
            console.warn(`Invalid token attempt for ${requestId}`);
            throw new HttpsError('permission-denied', 'Invalid Access Token.');
        }

        if (data.status === 'signed') {
             throw new HttpsError('failed-precondition', 'This document has already been signed.');
        }

        // GENERATE SIGNED URL
        // Since the public user can't access Storage directly, we give them a 
        // temporary (60 minute) link to view the blank PDF.
        const bucket = admin.storage().bucket();
        // Handle cases where storagePath might be full URL or relative path
        const filePath = data.storagePath.replace(/^(gs:\/\/[^\/]+\/)/, ''); 
        const fileRef = bucket.file(filePath);
        
        const [url] = await fileRef.getSignedUrl({
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000 // 1 hour
        });

        // Return only safe data to the frontend
        return {
            title: data.title,
            recipientName: data.recipientName,
            recipientEmail: data.recipientEmail,
            fields: data.fields || [],
            pdfUrl: url,
            status: data.status
        };

    } catch (error) {
        console.error("Get Public Envelope Error:", error);
        throw new HttpsError('internal', error.message);
    }
});

// 2. SUBMIT SIGNED DOCUMENT (Write)
exports.submitPublicEnvelope = onCall({ cors: true }, async (request) => {
    const { companyId, requestId, accessToken, fieldValues, auditData } = request.data;

    if (!companyId || !requestId || !accessToken) {
        throw new HttpsError('invalid-argument', 'Missing parameters.');
    }

    const docRef = db.collection('companies').doc(companyId).collection('signing_requests').doc(requestId);

    try {
        const docSnap = await docRef.get();
        if (!docSnap.exists) throw new HttpsError('not-found', 'Document not found');
        
        const data = docSnap.data();
        if (data.accessToken !== accessToken) throw new HttpsError('permission-denied', 'Unauthorized');
        if (data.status === 'signed' || data.status === 'pending_seal') throw new HttpsError('failed-precondition', 'Already submitted');

        const bucket = admin.storage().bucket();
        const finalValues = {};

        // PROCESS FIELDS
        // If a field value looks like an image (Base64), we upload it to Storage
        for (const [key, value] of Object.entries(fieldValues)) {
            if (typeof value === 'string' && value.startsWith('data:image')) {
                // Decode Base64 Signature
                const base64Image = value.split(';base64,').pop();
                const buffer = Buffer.from(base64Image, 'base64');
                
                const filePath = `secure_documents/${companyId}/signatures/${requestId}_${key}.png`;
                const file = bucket.file(filePath);
                
                await file.save(buffer, {
                    metadata: { contentType: 'image/png' }
                });
                
                // Save the STORAGE PATH to Firestore (so the Sealer can find it)
                finalValues[key] = filePath; 
            } else {
                // Text/Date/Checkbox values pass through directly
                finalValues[key] = value;
            }
        }

        // UPDATE DATABASE
        // This triggers the 'sealDocument' function we wrote earlier
        await docRef.update({
            status: 'pending_seal',
            fieldValues: finalValues,
            signedAt: admin.firestore.FieldValue.serverTimestamp(),
            auditTrail: {
                ...auditData,
                timestamp: new Date().toISOString(),
                method: 'Public Secure Link'
            }
        });

        return { success: true };

    } catch (error) {
        console.error("Submit Error:", error);
        throw new HttpsError('internal', error.message);
    }
});