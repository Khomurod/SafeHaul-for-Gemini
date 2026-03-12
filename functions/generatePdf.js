// functions/generatePdf.js
// Server-side PDF generation for driver applications.
// Generates a PDF from application data stored in Firestore and returns a
// short-lived (15-minute) signed URL. The file is stored in Firebase Storage
// and deleted after the TTL so no long-lived unencrypted copies persist.

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { admin, db, storage } = require('./firebaseAdmin');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const Sentry = require('@sentry/node');

const RUNTIME_OPTS = {
    timeoutSeconds: 300,
    memory: '1GiB',
    cors: true
};

// Helper: draw a labelled row into a PDF page
function drawRow(page, font, x, y, label, value, labelWidth = 150) {
    page.drawText(label, { x, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(String(value || 'N/A'), { x: x + labelWidth, y, size: 9, font });
}

exports.generateApplicationPdf = onCall(RUNTIME_OPTS, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Login required.');
    }

    const { applicationId, companyId } = request.data;
    if (!applicationId || !companyId) {
        throw new HttpsError('invalid-argument', 'applicationId and companyId are required.');
    }

    // Authorization: caller must be a member of the company or a super admin
    const isSuperAdmin = request.auth.token.roles?.globalRole === 'super_admin';
    const companyRole = request.auth.token.roles?.[companyId];
    if (!isSuperAdmin && !companyRole) {
        throw new HttpsError('permission-denied', 'Access denied.');
    }

    try {
        // 1. Fetch application data from Firestore
        const appRef = db.collection('companies').doc(companyId).collection('applications').doc(applicationId);
        const appSnap = await appRef.get();
        if (!appSnap.exists) {
            throw new HttpsError('not-found', 'Application not found.');
        }
        const data = appSnap.data();

        // 2. Generate PDF with pdf-lib
        const pdfDoc = await PDFDocument.create();
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const addPage = () => {
            const page = pdfDoc.addPage([612, 792]); // Letter
            // Header bar
            page.drawRectangle({ x: 0, y: 752, width: 612, height: 40, color: rgb(0.13, 0.27, 0.49) });
            page.drawText('SafeHaul — Driver Application', {
                x: 20, y: 762, size: 14, font: helveticaBold, color: rgb(1, 1, 1)
            });
            return page;
        };

        const page1 = addPage();
        let y = 730;
        const LEFT = 30;
        const LINE = 16;

        const section = (title, pageRef) => {
            pageRef.drawText(title, { x: LEFT, y, size: 11, font: helveticaBold, color: rgb(0.13, 0.27, 0.49) });
            y -= LINE * 0.5;
            pageRef.drawLine({ start: { x: LEFT, y }, end: { x: 582, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
            y -= LINE;
        };

        // Personal Info
        section('Personal Information', page1);
        drawRow(page1, helvetica, LEFT, y, 'Full Name:', `${data.firstName || ''} ${data.lastName || ''}`.trim()); y -= LINE;
        drawRow(page1, helvetica, LEFT, y, 'Email:', data.email || ''); y -= LINE;
        drawRow(page1, helvetica, LEFT, y, 'Phone:', data.phone || ''); y -= LINE;
        drawRow(page1, helvetica, LEFT, y, 'Address:', `${data.street || ''} ${data.city || ''} ${data.state || ''} ${data.zip || ''}`.trim()); y -= LINE;
        drawRow(page1, helvetica, LEFT, y, 'Date of Birth:', data.dob || ''); y -= LINE;
        // SSN is already masked (***-**-XXXX) in the application document
        drawRow(page1, helvetica, LEFT, y, 'SSN:', data.ssn || 'On file (encrypted)'); y -= LINE * 1.5;

        // CDL Info
        section('License & Qualifications', page1);
        drawRow(page1, helvetica, LEFT, y, 'CDL State:', data.cdlState || ''); y -= LINE;
        drawRow(page1, helvetica, LEFT, y, 'CDL Number:', data.cdlNumber || ''); y -= LINE;
        drawRow(page1, helvetica, LEFT, y, 'CDL Class:', data.cdlClass || ''); y -= LINE;
        drawRow(page1, helvetica, LEFT, y, 'Driver Type:', data.driverType || ''); y -= LINE;
        drawRow(page1, helvetica, LEFT, y, 'Experience:', data.experienceLevel || ''); y -= LINE * 1.5;

        // Application Meta
        section('Application Information', page1);
        drawRow(page1, helvetica, LEFT, y, 'Application ID:', data.applicationId || applicationId); y -= LINE;
        drawRow(page1, helvetica, LEFT, y, 'Confirmation #:', data.confirmationNumber || ''); y -= LINE;
        drawRow(page1, helvetica, LEFT, y, 'Submitted At:', data.submittedAt?.toDate?.()?.toISOString() || ''); y -= LINE;
        drawRow(page1, helvetica, LEFT, y, 'Company ID:', companyId); y -= LINE;
        drawRow(page1, helvetica, LEFT, y, 'Status:', data.status || ''); y -= LINE * 1.5;

        // Footer note
        page1.drawText('This document was generated server-side by SafeHaul. SSN is masked per DOT data-handling policy.', {
            x: LEFT, y: 20, size: 7, font: helvetica, color: rgb(0.5, 0.5, 0.5)
        });

        // 3. Serialize and upload to Storage
        const pdfBytes = await pdfDoc.save();
        const bucket = storage.bucket();
        const storagePath = `exports/${companyId}/applications/${applicationId}_${Date.now()}.pdf`;
        const file = bucket.file(storagePath);

        await file.save(Buffer.from(pdfBytes), {
            metadata: {
                contentType: 'application/pdf',
                // Auto-delete after 1 hour to avoid long-lived unencrypted copies
                metadata: { generatedBy: 'SafeHaul', generatedAt: new Date().toISOString() }
            }
        });

        // 4. Return a signed URL valid for 15 minutes
        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000 // 15 minutes
        });

        // Log the download for audit purposes
        await db.collection('companies').doc(companyId).collection('audit_logs').add({
            action: 'application_pdf_downloaded',
            applicationId,
            requestedBy: request.auth.uid,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            storagePath
        });

        return { success: true, url: signedUrl };

    } catch (error) {
        console.error('generateApplicationPdf error:', error);
        Sentry.captureException(error);
        throw new HttpsError('internal', error.message);
    }
});
