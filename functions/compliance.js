const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const db = admin.firestore();

// --- EMAIL CONFIGURATION ---
// In production, run: firebase functions:config:set gmail.email="your@email.com" gmail.password="app_password"
const gmailEmail = functions.config().gmail?.email;
const gmailPassword = functions.config().gmail?.password;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailEmail || 'placeholder@gmail.com', // Fallback to prevent crash
        pass: gmailPassword || 'placeholder_password'
    }
});

/**
 * Sends a Verification of Employment (VOE) request via Email.
 * Creates a secure document in 'verification_requests' and emails the link.
 */
exports.sendVOERequest = functions.https.onCall(async (data, context) => {
    // 1. Security Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { companyId, applicationId, employer, recipientEmail } = data;

    if (!companyId || !applicationId || !employer || !recipientEmail) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
    }

    try {
        // 2. Get Application Data for Context
        const appRef = db.collection('companies').doc(companyId).collection('applications').doc(applicationId);
        const appSnap = await appRef.get();
        
        if (!appSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Application not found.');
        }

        const appData = appSnap.data();

        // 3. Create Verification Request Document
        // We create a new doc ID automatically
        const requestRef = db.collection('verification_requests').doc();
        const requestId = requestRef.id;
        
        // Construct the Link (Update this domain for Production!)
        // e.g. https://your-app.web.app/verify/xyz...
        const baseUrl = 'https://safehaul-platform.web.app'; 
        const verificationLink = `${baseUrl}/verify/${requestId}`;

        const requestDoc = {
            requestId: requestId,
            companyId: companyId,
            requestingCompany: appData.companyName || 'SafeHaul Carrier',
            applicationId: applicationId,
            driverId: appData.driverId || appData.userId,
            driverName: `${appData.firstName} ${appData.lastName}`,
            
            // Employer Data to Verify
            employerName: employer.name,
            claimedStartDate: employer.dates?.split('-')[0]?.trim() || '', 
            claimedEndDate: employer.dates?.split('-')[1]?.trim() || '',
            
            recipientEmail: recipientEmail,
            status: 'Pending', // Pending -> Completed
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            type: 'VOE'
        };

        await requestRef.set(requestDoc);

        // 4. Send the Email
        if (gmailEmail && gmailPassword) {
            const mailOptions = {
                from: `"SafeHaul Compliance" <${gmailEmail}>`,
                to: recipientEmail,
                subject: `Employment Verification Request: ${appData.firstName} ${appData.lastName}`,
                html: `
                    <div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                        <h2 style="color: #2563EB; margin-top: 0;">Employment Verification Request</h2>
                        <p style="color: #333; line-height: 1.5;">Hello,</p>
                        <p style="color: #333; line-height: 1.5;">
                            <strong>${appData.companyName}</strong> is requesting employment verification for a former employee, 
                            <strong>${appData.firstName} ${appData.lastName}</strong>.
                        </p>
                        <p style="color: #333; line-height: 1.5;">
                            Please verify their employment dates and safety history by clicking the secure link below. 
                            No login or account creation is required.
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationLink}" style="background-color: #2563EB; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                Verify Employment Record
                            </a>
                        </div>

                        <p style="font-size: 12px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
                            Reference ID: ${requestId}<br/>
                            If you are not the intended recipient, please ignore this email.
                        </p>
                    </div>
                `
            };
            await transporter.sendMail(mailOptions);
        } else {
            console.warn("⚠️ Email not sent: Gmail config missing. Run 'firebase functions:config:set gmail.email=...'");
        }

        return { success: true, message: 'Verification request created!', requestId, link: verificationLink };

    } catch (error) {
        console.error("VOE System Error:", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Scheduled Job: Check for Expiring Drivers
 * Runs every 24 hours to find expiring CDLs/Med Cards
 */
exports.checkDriverExpirations = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    try {
        // Query all drivers
        // Note: Ideally, query only active drivers if you have a status field in the root
        const driversRef = db.collection('drivers'); 
        const snapshot = await driversRef.get();
        
        const updates = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const alerts = [];

            // Check CDL
            if (data.cdlExpiration) {
                const cdlDate = data.cdlExpiration.toDate(); // Assuming Timestamp
                if (cdlDate < today) alerts.push('CDL Expired');
                else if (cdlDate < thirtyDaysFromNow) alerts.push('CDL Expiring Soon');
            }

            // Check Med Card
            if (data.medCardExpiration) {
                const medDate = data.medCardExpiration.toDate();
                if (medDate < today) alerts.push('Medical Card Expired');
                else if (medDate < thirtyDaysFromNow) alerts.push('Medical Card Expiring Soon');
            }

            // Update Driver Record with Flags if needed
            if (alerts.length > 0) {
                updates.push(doc.ref.update({
                    complianceAlerts: alerts,
                    lastComplianceCheck: admin.firestore.FieldValue.serverTimestamp()
                }));
            }
        });

        await Promise.all(updates);
        console.log(`Compliance Check Complete. Updated ${updates.length} records.`);
        return null;

    } catch (error) {
        console.error("Compliance Monitor Error:", error);
        return null;
    }
});
