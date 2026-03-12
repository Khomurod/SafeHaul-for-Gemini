// functions/digitalSealing.js
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { admin, db, storage } = require('./firebaseAdmin');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

// Fail-fast: If pdf-lib is missing, crash immediately at cold start
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

exports.sealDocument = onDocumentUpdated({
    document: 'companies/{companyId}/signing_requests/{requestId}',
    memory: '1GiB',
    timeoutSeconds: 300
}, async (event) => {
        const newData = event.data.after.data();
        const previousData = event.data.before.data();

        // 1. Only run if status changed to 'pending_seal'
        if (newData.status !== 'pending_seal' || previousData.status === 'pending_seal') {
            return null;
        }

        // pdf-lib is guaranteed to exist (fail-fast at cold start)

        const { companyId, requestId } = event.params;
        const tempPdfPath = path.join(os.tmpdir(), `orig_${requestId}.pdf`);
        const outputPdfPath = path.join(os.tmpdir(), `final_${requestId}.pdf`);
        const tempSigPaths = [];

        try {
            const bucket = storage.bucket();

            // 2. Download Original PDF
            let srcPath = newData.storagePath;
            if (srcPath.startsWith('gs://')) {
                srcPath = srcPath.replace(`gs://${bucket.name}/`, '');
            }
            await bucket.file(srcPath).download({ destination: tempPdfPath });

            // 3. Load PDF
            const pdfBytes = fs.readFileSync(tempPdfPath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

            // 4. PROCESS FIELDS
            const fields = newData.fields || [];
            const values = newData.fieldValues || {};

            for (const field of fields) {
                const val = values[field.id];
                if (!val) continue;

                const pageIndex = Math.max(0, (field.pageNumber || 1) - 1);
                if (pageIndex >= pdfDoc.getPages().length) continue;

                const page = pdfDoc.getPages()[pageIndex];
                const { width, height } = page.getSize();

                // Calculate Coordinates from Percentages
                const x = (field.xPosition / 100) * width;
                const y = height - ((field.yPosition / 100) * height);
                const fieldW = (field.width / 100) * width;
                const fieldH = (field.height / 100) * height;

                if (field.type === 'text' || field.type === 'date') {
                    // DYNAMIC FONT SCALING
                    // Calculate size based on field height (approx 70% of box height)
                    const calculatedSize = Math.max(6, fieldH * 0.7);

                    page.drawText(String(val), {
                        x: x + 2,
                        y: y - (fieldH * 0.8), // Vertical centering adjustment
                        size: calculatedSize,
                        font: helvetica,
                        color: rgb(0, 0, 0),
                        maxWidth: fieldW - 4 // Prevent text from bleeding out of the box
                    });
                }
                else if (field.type === 'checkbox' && val === true) {
                    // DRAW CHECKMARK (X) scaled to field size
                    const inset = fieldW * 0.2;
                    page.drawLine({
                        start: { x: x + inset, y: y - inset },
                        end: { x: x + fieldW - inset, y: y - fieldH + inset },
                        thickness: Math.max(1, fieldW * 0.1),
                        color: rgb(0, 0, 0),
                    });
                    page.drawLine({
                        start: { x: x + fieldW - inset, y: y - inset },
                        end: { x: x + inset, y: y - fieldH + inset },
                        thickness: Math.max(1, fieldW * 0.1),
                        color: rgb(0, 0, 0),
                    });
                }
                else if (field.type === 'signature') {
                    const sigTempPath = path.join(os.tmpdir(), `sig_${field.id}.png`);
                    try {
                        let sigPath = val;
                        if (sigPath.startsWith('gs://')) {
                            sigPath = sigPath.replace(`gs://${bucket.name}/`, '');
                        }

                        await bucket.file(sigPath).download({ destination: sigTempPath });
                        tempSigPaths.push(sigTempPath);

                        const sigBytes = fs.readFileSync(sigTempPath);
                        const sigImage = await pdfDoc.embedPng(sigBytes);

                        // Scale image to fit the drawn box while maintaining aspect ratio
                        const scale = Math.min(fieldW / sigImage.width, fieldH / sigImage.height);
                        const sigDims = sigImage.scale(scale);

                        page.drawImage(sigImage, {
                            x: x,
                            y: y - sigDims.height,
                            width: sigDims.width,
                            height: sigDims.height,
                        });
                    } catch (sigErr) {
                        console.error(`Failed to load signature ${field.id}:`, sigErr);
                    }
                }
            }

            // 5. Compute SHA-256 hash of the original PDF for tamper detection
            const originalHash = crypto.createHash('sha256').update(pdfBytes).digest('hex');

            // 6. Append Enhanced Audit Trail Page
            const auditPage = pdfDoc.addPage();
            const auditHeight = auditPage.getHeight();

            auditPage.drawText('Certificate of Completion', { x: 50, y: auditHeight - 50, size: 24, font: helvetica });
            auditPage.drawText(`Envelope ID: ${requestId}`, { x: 50, y: auditHeight - 80, size: 10, font: helvetica, color: rgb(0.5, 0.5, 0.5) });

            // Placeholder — final hash is computed below and stored in Firestore alongside the PDF.
            const auditLog = `
        DOCUMENT TITLE: ${newData.title || 'Untitled Document'}
        SIGNER NAME: ${newData.recipientName || 'Authorized User'}
        SIGNER EMAIL: ${newData.recipientEmail || 'N/A'}
        COMPLETED AT: ${new Date().toISOString()}
        IP ADDRESS: ${newData.auditTrail?.ip || 'Recorded'}
        USER AGENT: ${newData.auditTrail?.userAgent || 'N/A'}

        INTEGRITY VERIFICATION:
        This document was securely signed and sealed via SafeHaul.
        Original Document SHA-256: ${originalHash}
        The signed document hash is stored separately in the platform audit log.
      `;

            auditPage.drawText(auditLog, {
                x: 50,
                y: auditHeight - 150,
                size: 10,
                font: helvetica,
                lineHeight: 16
            });

            // 7. Save & Upload Final PDF
            const finalPdfBytes = await pdfDoc.save();
            fs.writeFileSync(outputPdfPath, finalPdfBytes);

            // Compute SHA-256 hash of the final (signed) PDF
            const signedHash = crypto.createHash('sha256').update(Buffer.from(finalPdfBytes)).digest('hex');

            const finalStoragePath = `secure_documents/${companyId}/completed/${requestId}_signed.pdf`;

            await bucket.upload(outputPdfPath, {
                destination: finalStoragePath,
                metadata: { contentType: 'application/pdf' }
            });

            // 8. Update Firestore — store hashes for tamper detection
            await event.data.after.ref.update({
                status: 'signed',
                signedPdfUrl: finalStoragePath,
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
                'auditTrail.originalDocumentHash': originalHash,
                'auditTrail.signedDocumentHash': signedHash
            });

        } catch (err) {
            console.error("Sealing Failed:", err);
            await event.data.after.ref.update({ status: 'error_sealing', errorLog: err.message });
        } finally {
            try {
                if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
                if (fs.existsSync(outputPdfPath)) fs.unlinkSync(outputPdfPath);
                tempSigPaths.forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
            } catch (e) { }
        }
});