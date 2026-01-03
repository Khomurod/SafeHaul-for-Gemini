const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Scheduled Job: Check for Expiring Documents
 * Runs every 24 hours.
 * 
 * Logic:
 * 1. Calculate target date (Today + 30 days).
 * 2. Query 'dq_files' collection group for items expiring before target date.
 * 3. Group by Company -> Application.
 * 4. Send Notification (Placeholder for Email).
 */
exports.checkDocumentExpirations = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    console.log("Starting Document Expiration Check...");

    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + 30); // Look ahead 30 days

    try {
        // NOTE: Collection Group Query requires an index on 'expirationDate'
        const snapshot = await db.collectionGroup('dq_files')
            .where('expirationDate', '<=', targetDate.toISOString().split('T')[0])
            .where('expirationDate', '>=', today.toISOString().split('T')[0])
            .get();

        if (snapshot.empty) {
            console.log("No expiring documents found.");
            return null;
        }

        console.log(`Found ${snapshot.size} expiring documents.`);

        const expirationsByCompany = {};

        // Process results
        for (const doc of snapshot.docs) {
            const data = doc.data();
            // Need to traverse parent to get Company ID? 
            // Path: companies/{companyId}/applications/{appId}/dq_files/{fileId}
            // path segments: [0] companies, [1] companyId, [2] applications, [3] appId
            const pathSegments = doc.ref.path.split('/');
            const companyId = pathSegments[1];
            const appId = pathSegments[3];

            if (!companyId || !appId) continue;

            if (!expirationsByCompany[companyId]) {
                expirationsByCompany[companyId] = [];
            }

            expirationsByCompany[companyId].push({
                fileType: data.fileType,
                fileName: data.fileName,
                expirationDate: data.expirationDate,
                appId: appId
            });
        }

        // Send Notifications (Mock implementation)
        for (const [companyId, files] of Object.entries(expirationsByCompany)) {
            console.log(`[Notification] Company ${companyId} has ${files.length} expiring documents.`);
            // TODO: Fetch Company Admin emails and send via sendgrid/mailgun
            // await sendExpirationEmail(companyId, files);
        }

        return null;

    } catch (error) {
        console.error("Error in checkDocumentExpirations:", error);
        return null;
    }
});
