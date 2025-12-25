// FIX: We must require 'v1' explicitly to support the .document() syntax
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Lazy load pdf-lib to prevent cold-start crashes if installation failed
let PDFDocument, StandardFonts, rgb;
try {
    const pdfLib = require('pdf-lib');
    PDFDocument = pdfLib.PDFDocument;
    StandardFonts = pdfLib.StandardFonts;
    rgb = pdfLib.rgb;
} catch (e) {
    console.warn("WARNING: pdf-lib dependency is missing. Sealing will fail.");
}

// Ensure Admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

exports.sealDocument = functions.firestore
  .document('companies/{companyId}/signing_requests/{requestId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();

    // 1. Only run if status changed to 'pending_seal'
    if (newData.status !== 'pending_seal' || previousData.status === 'pending_seal') {
      return null;
    }

    // 2. Dependency Check
    if (!PDFDocument) {
        console.error("Critical Error: pdf-lib not installed.");
        await change.after.ref.update({ 
            status: 'error_system', 
            errorLog: "Backend dependency 'pdf-lib' is missing." 
        });
        return null;
    }

    const { companyId, requestId } = context.params;
    console.log(`Starting seal for Request: ${requestId}`);

    const tempPdfPath = path.join(os.tmpdir(), `orig_${requestId}.pdf`);
    const tempSigPath = path.join(os.tmpdir(), `sig_${requestId}.png`);
    const outputPdfPath = path.join(os.tmpdir(), `final_${requestId}.pdf`);

    try {
      const bucket = storage.bucket();

      // 3. Download Files
      await bucket.file(newData.storagePath).download({ destination: tempPdfPath });
      await bucket.file(newData.signatureUrl).download({ destination: tempSigPath });

      // 4. Load PDF & Signature
      const pdfBytes = fs.readFileSync(tempPdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const sigBytes = fs.readFileSync(tempSigPath);
      const sigImage = await pdfDoc.embedPng(sigBytes);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // 5. COORDINATE MATH
      // Default to Page 1 if config is missing
      const pageNum = newData.signatureConfig?.pageNumber || 1;
      const xPercent = newData.signatureConfig?.xPosition || 50;
      const yPercent = newData.signatureConfig?.yPosition || 50;

      // Get page (0-indexed)
      const pageIndex = Math.max(0, pageNum - 1);
      const pages = pdfDoc.getPages();
      
      if (pageIndex < pages.length) {
          const page = pages[pageIndex];
          const { width, height } = page.getSize();

          // Calculate absolute PDF coordinates from percentages
          const pdfX = (xPercent / 100) * width;
          
          // PDF coordinate system starts at bottom-left
          // We must flip the Y axis (Height - Top_Percentage)
          const sigScale = 150 / sigImage.width; // Scale to 150px wide
          const sigDims = sigImage.scale(sigScale);
          
          const pdfY = height - ((yPercent / 100) * height) - (sigDims.height / 2);

          // Draw Signature
          page.drawImage(sigImage, {
            x: pdfX,
            y: pdfY,
            width: sigDims.width,
            height: sigDims.height,
          });
          
          // Draw Timestamp
          page.drawText(`Digitally Signed: ${new Date().toISOString()}`, {
            x: pdfX,
            y: pdfY - 10,
            size: 8,
            font: helvetica,
            color: rgb(0.5, 0.5, 0.5),
          });
      }

      // 6. Append Audit Trail Page
      const auditPage = pdfDoc.addPage();
      const auditHeight = auditPage.getHeight();
      
      auditPage.drawText('Certificate of Completion', { x: 50, y: auditHeight - 50, size: 24, font: helvetica });
      auditPage.drawText(`Envelope ID: ${requestId}`, { x: 50, y: auditHeight - 80, size: 10, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
      
      const auditLog = `
        Signer Name: ${newData.recipientName || 'Authorized User'}
        Signer Email: ${newData.recipientEmail || 'N/A'}
        Signed At: ${new Date().toISOString()}
        IP Address: ${newData.auditTrail?.ip || 'Recorded'}
        User Agent: ${newData.auditTrail?.userAgent || 'N/A'}
        
        This document was signed electronically via SafeHaul Secure Auth.
        Digital Checksum: ${requestId.substring(0, 8)}-${Date.now()}
      `;
      
      auditPage.drawText(auditLog, { 
          x: 50, 
          y: auditHeight - 150, 
          size: 10, 
          font: helvetica, 
          lineHeight: 14 
      });

      // 7. Save & Upload
      const finalPdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPdfPath, finalPdfBytes);
      
      const finalStoragePath = `secure_documents/${companyId}/completed/${requestId}_signed.pdf`;
      
      await bucket.upload(outputPdfPath, {
          destination: finalStoragePath,
          metadata: { contentType: 'application/pdf' }
      });

      // 8. Update Firestore
      await change.after.ref.update({
          status: 'signed',
          signedPdfUrl: finalStoragePath,
          completedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log("Sealing Complete:", finalStoragePath);

    } catch (err) {
      console.error("Sealing Failed:", err);
      await change.after.ref.update({
        status: 'error_sealing',
        errorLog: err.message
      });
    } finally {
      // Cleanup Temp Files
      [tempPdfPath, tempSigPath, outputPdfPath].forEach(f => {
          if (fs.existsSync(f)) fs.unlinkSync(f);
      });
    }
  });