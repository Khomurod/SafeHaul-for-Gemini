const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { PDFDocument, rgb } = require("pdf-lib");

exports.getSecureUrl = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const { storagePath } = data;
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);

  const [originalPdfBytes] = await file.download();
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();

  const watermarkText = `Signed by ${context.auth.token.email} on ${new Date().toISOString()}`;

  for (const page of pages) {
    page.drawText(watermarkText, {
      x: 20,
      y: 20,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const newStoragePath = `temp/${context.auth.uid}_${Date.now()}.pdf`;
  const tempFile = bucket.file(newStoragePath);

  await tempFile.save(pdfBytes, {
    metadata: {
      contentType: "application/pdf",
    },
  });

  const [url] = await tempFile.getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60, // 1 hour
  });

  return { secureUrl: url };
});
