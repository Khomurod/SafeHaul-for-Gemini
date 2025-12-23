// hr portal/functions/driverSync.js

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
// UPDATED: Import from shared singleton
const { admin, db, auth } = require("./firebaseAdmin");

/**
 * HELPER: Robust Find or Create Auth User (Handles Race Conditions)
 */
async function findOrCreateUser(email, displayName, phone) {
    try {
        // 1. Try to get existing user
        return await auth.getUserByEmail(email);
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            // 2. Try to create user
            try {
                const newUser = await auth.createUser({
                    email: email,
                    emailVerified: true,
                    displayName: displayName,
                    // Only add phone if it's unique/valid to avoid E.164 errors
                    phoneNumber: undefined 
                });

                // Create the public User document for roles immediately
                await db.collection("users").doc(newUser.uid).set({
                    name: displayName,
                    email: email,
                    role: 'driver',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });

                return newUser;
            } catch (createErr) {
                // 3. RACE CONDITION HANDLING
                // If parallel execution created the user between step 1 and 2,
                // we catch 'email-already-exists' and fetch the user again.
                if (createErr.code === 'auth/email-already-exists') {
                    console.log(`Race condition caught for ${email}. Fetching newly created user.`);
                    return await auth.getUserByEmail(email);
                }
                throw createErr;
            }
        }
        throw e;
    }
}

/**
 * MAIN LOGIC: Syncs data to Master Profile
 */
async function processDriverData(data, docId) {
  const email = data.email;
  const phone = data.phone;
  const firstName = data.firstName || "";
  const lastName = data.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  // Check if this is a placeholder email
  const isPlaceholder = !email || email.includes('@placeholder.com');

  // If we have neither a valid email nor a phone number, we can't identify the driver.
  if (isPlaceholder && !phone) {
    console.log("Skipping profile sync: No valid identity (Email or Phone) provided.");
    return;
  }

  let driverUid = null;

  try {
    if (!isPlaceholder) {
        // --- SCENARIO A: Valid Email (Use Auth) ---
        try {
            const userRecord = await findOrCreateUser(email, fullName, phone);
            driverUid = userRecord.uid;
        } catch (error) {
             console.error("Auth User Sync Failed:", error);
             // Fallback: If Auth fails (e.g. password policy, unknown error), use docId
             driverUid = docId;
        }
    } else {
        // --- SCENARIO B: Placeholder Email (Phone Match) ---
        const driversRef = db.collection('drivers');
        const q = driversRef.where('personalInfo.phone', '==', phone).limit(1);
        const snap = await q.get();

        if (!snap.empty) {
            driverUid = snap.docs[0].id;
            console.log(`Matched existing driver by phone: ${phone}`);
        } else {
            driverUid = docId;
            console.log(`Creating new shadow profile for phone: ${phone}`);
        }
    }
  } catch (error) {
    console.error("Error managing driver identity:", error);
    return;
  }

  if (!driverUid) return;

  // 2. Create/Update Master Profile
  const driverDocRef = db.collection("drivers").doc(driverUid);

  const masterProfileData = {
    personalInfo: {
      firstName: firstName,
      lastName: lastName,
      email: email,
      phone: phone || "",
      dob: data.dob || "",
      ssn: data.ssn || "",
      street: data.street || "",
      city: data.city || "",
      state: data.state || "",
      zip: data.zip || ""
    },
    qualifications: {
      experienceYears: data.experience || data['experience-years'] || "",
    },
    // Only overwrite licenses if new data has them
    ...(data.cdlNumber ? {
        licenses: [
          {
            state: data.cdlState || "",
            number: data.cdlNumber || "",
            expiration: data.cdlExpiration || "",
            class: data.cdlClass || ""
          }
        ]
    } : {}),
    lastApplicationDate: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await driverDocRef.set(masterProfileData, { merge: true });
  console.log(`Successfully synced Master Profile for ${driverUid}`);
}

// --- EXPORTS ---

exports.onApplicationSubmitted = onDocumentCreated({
    document: "companies/{companyId}/applications/{applicationId}",
    maxInstances: 2
}, async (event) => {
  if (!event.data) return;
  await processDriverData(event.data.data(), event.params.applicationId);
});

exports.onLeadSubmitted = onDocumentCreated({
    document: "leads/{leadId}",
    maxInstances: 2
}, async (event) => {
  if (!event.data) return;
  await processDriverData(event.data.data(), event.params.leadId);
});

exports.onCompanyLeadSubmitted = onDocumentCreated({
    document: "companies/{companyId}/leads/{leadId}",
    maxInstances: 2
}, async (event) => {
  if (!event.data) return;
  await processDriverData(event.data.data(), event.params.leadId);
});