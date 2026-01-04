const admin = require('firebase-admin');
// Initialize with service account if running locally, or default if in Cloud Functions environment
// For local script usage: node scripts/migrateIsHiring.js
// Make sure GOOGLE_APPLICATION_CREDENTIALS is set or you are logged in via `firebase login`

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function migrateCompanies() {
  console.log('Starting migration: Setting isHiring = true for all companies...');
  const snapshot = await db.collection('companies').get();
  
  if (snapshot.empty) {
    console.log('No companies found.');
    return;
  }

  let batch = db.batch();
  let count = 0;
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const Ref = doc.ref;
    // Set isHiring to true if it doesn't exist or is false (or just overwrite to be safe for launch)
    batch.update(Ref, { isHiring: true });
    count++;
    batchCount++;

    // Batches can hold up to 500 ops
    if (batchCount >= 400) {
      await batch.commit();
      console.log(`Committed batch of ${batchCount} updates.`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${batchCount} updates.`);
  }

  console.log(`Migration complete. Updated ${count} companies.`);
}

migrateCompanies().catch(console.error);
