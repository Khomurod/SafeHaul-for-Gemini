// functions/leadLogic.js
const { admin, db, auth } = require("./firebaseAdmin");

// --- CONSTANTS ---
const QUOTA_FREE = 50;
const QUOTA_PAID = 200;

// Legacy Constants (Preserved for Cleanup/Outcomes)
const EXPIRY_SHORT_MS = 24 * 60 * 60 * 1000; 
const EXPIRY_LONG_MS = 7 * 24 * 60 * 60 * 1000; 
const POOL_COOL_OFF_DAYS = 7;
const POOL_INTEREST_LOCK_DAYS = 7;
const POOL_HIRED_LOCK_DAYS = 60;

const ENGAGED_STATUSES = [
    "Contacted", "Application Started", "Offer Sent", "Offer Accepted", "Interview Scheduled", "Hired", "Approved"
];

const TERMINAL_STATUSES = [
    "Wrong Number", "Not Interested", "Rejected", "Disqualified", "Hired Elsewhere"
];

// --- 1. THE DEALER ENGINE (NEW DISTRIBUTION LOGIC) ---
async function runLeadDistribution(isManual = false) {
    console.log(`Starting 'THE DEALER' Engine (${isManual ? 'Manual' : 'Scheduled'})...`);
    const logs = [];

    try {
        // 1. Get All Active Companies
        const companiesSnap = await db.collection("companies").where("isActive", "==", true).get();
        if (companiesSnap.empty) return { success: false, message: "No active companies found." };

        // 2. Randomize Company Order
        const companies = companiesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                                            .sort(() => Math.random() - 0.5);

        logs.push(`Found ${companies.length} active companies.`);

        // 3. THE DEALER LOOP
        for (const company of companies) {
            try {
                // --- QUOTA LOGIC FIX ---
                // 1. Determine Base Plan (Free vs Paid)
                const isPaid = company.planType && company.planType.toLowerCase() === 'paid';
                let limit = isPaid ? QUOTA_PAID : QUOTA_FREE;

                // 2. Check for Manual Override (Only if explicitly HIGHER than plan)
                // This prevents the default '50' from the repair tool from downgrading a Paid plan.
                if (company.dailyLeadQuota && company.dailyLeadQuota > limit) {
                    limit = company.dailyLeadQuota;
                }

                // Run the Deal
                const result = await dealLeadsToCompany(company, limit);
                logs.push(result);
            } catch (err) {
                console.error(`CRITICAL DEALER ERROR for ${company.companyName}:`, err);
                logs.push(`${company.companyName}: SYSTEM ERROR - ${err.message}`);
            }
        }

        return { success: true, message: "Dealer Run Complete", details: logs };

    } catch (globalError) {
        console.error("FATAL DISTRIBUTION ERROR:", globalError);
        throw globalError;
    }
}

// --- 2. DEALER LOGIC (Per Company) ---
async function dealLeadsToCompany(company, planLimit) {
    const companyId = company.id;

    // A. Count Current Working Leads
    // Only count "Active" platform leads. 
    const activeSnap = await db.collection("companies", companyId, "leads")
        .where("isPlatformLead", "==", true)
        .where("status", "in", ["New Lead", "Attempted", "Contacted", "In Progress"])
        .count()
        .get();

    const currentCount = activeSnap.data().count;
    const needed = Math.max(0, planLimit - currentCount);

    if (needed <= 0) {
        return `${company.companyName}: Full (${currentCount}/${planLimit})`;
    }

    // B. Fetch Candidates from Global Pool
    // Buffer: Ask for 1.5x what we need to account for potential Ghost Leads
    const buffer = Math.ceil(needed * 1.5); 
    const now = admin.firestore.Timestamp.now();
    let candidates = [];

    // Priority 1: Fresh Leads (unavailableUntil == null)
    const freshSnap = await db.collection("leads")
        .where("unavailableUntil", "==", null)
        .limit(buffer)
        .get();
    freshSnap.forEach(doc => candidates.push(doc));

    // Priority 2: Recycled Leads (unavailableUntil <= now)
    if (candidates.length < buffer) {
        const remaining = buffer - candidates.length;
        const expiredSnap = await db.collection("leads")
            .where("unavailableUntil", "<=", now)
            .limit(remaining)
            .get();
        expiredSnap.forEach(doc => candidates.push(doc));
    }

    // Shuffle Candidates
    candidates = candidates.sort(() => Math.random() - 0.5);

    // C. Assign Leads (Transactional Loop)
    let added = 0;

    for (const leadDoc of candidates) {
        if (added >= needed) break; // Stop exactly when quota is met

        const success = await assignLeadTransaction(companyId, leadDoc);
        if (success) {
            added++;
        }
        // If false (Ghost Lead), we simply continue to the next candidate
    }

    return `${company.companyName}: Active ${currentCount}, Added ${added} (Target: ${planLimit})`;
}

// --- 3. TRANSACTIONAL ASSIGNMENT (Ghost Buster) ---
async function assignLeadTransaction(companyId, leadDocRef) {
    try {
        await db.runTransaction(async (t) => {
            // 1. "Clean Room" Check
            const freshDoc = await t.get(leadDocRef.ref);
            if (!freshDoc.exists) throw new Error("GHOST_LEAD"); 

            const data = freshDoc.data();

            // 2. Anti-Snipe Check
            if (data.unavailableUntil && data.unavailableUntil.toMillis() > Date.now()) {
                throw new Error("SNIPED"); 
            }

            // 3. Prepare Data
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1); // 24h Lock

            const companyLeadRef = db.collection("companies", companyId, "leads").doc(freshDoc.id);

            const safePayload = {
                firstName: data.firstName || "Unknown",
                lastName: data.lastName || "Driver",
                email: data.email || "",
                phone: data.phone || "",
                normalizedPhone: data.normalizedPhone || "",
                city: data.city || "",
                state: data.state || "",
                driverType: data.driverType || "Unspecified",
                experience: data.experience || "N/A",
                source: "SafeHaul Pool",
                // System Flags
                isPlatformLead: true,
                status: "New Lead",
                originalLeadId: freshDoc.id,
                distributedAt: admin.firestore.FieldValue.serverTimestamp(),
                // Copy History
                sharedHistory: data.sharedHistory || []
            };

            // 4. COMMIT
            t.set(companyLeadRef, safePayload);
            t.update(leadDocRef.ref, {
                unavailableUntil: admin.firestore.Timestamp.fromDate(tomorrow),
                lastAssignedTo: companyId,
                visitedCompanyIds: admin.firestore.FieldValue.arrayUnion(companyId)
            });
        });
        return true; // Success
    } catch (e) {
        if (e.message === "GHOST_LEAD") {
            console.warn(`Cleaned up Ghost Lead index: ${leadDocRef.id}`);
        }
        return false; // Failed, try next
    }
}

// --- 4. CLEANUP LOGIC (PRESERVED) ---
async function runCleanup() {
    console.log("Running Cleanup...");
    let deletedCount = 0;
    const leadsSnap = await db.collection("leads").get();
    let batch = db.batch();
    let bSize = 0;

    for (const doc of leadsSnap.docs) {
        const d = doc.data();
        const name = `${d.firstName} ${d.lastName}`.toLowerCase();
        if ((!d.phone && !d.email) || name.includes("test lead") || name.includes("health check")) {
            batch.delete(doc.ref);
            bSize++;
            deletedCount++;
        }
        if (bSize >= 400) { await batch.commit(); batch = db.batch(); bSize = 0; }
    }
    if (bSize > 0) await batch.commit();
    return { success: true, message: `Purged ${deletedCount} bad items from pool.` };
}

// --- 5. DATA REPAIR (PRESERVED) ---
async function populateLeadsFromDrivers() {
    console.log("Starting System Repair...");
    let deletedUsers = 0;
    try {
        const usersSnap = await db.collection("users").where("role", "==", "driver").get();
        for (const userDoc of usersSnap.docs) {
            const uid = userDoc.id;
            try {
                const authRecord = await auth.getUser(uid);
                if (!authRecord.metadata.lastSignInTime) {
                    await auth.deleteUser(uid);
                    await userDoc.ref.delete();
                    deletedUsers++;
                }
            } catch (authErr) {
                if (authErr.code === 'auth/user-not-found') {
                    await userDoc.ref.delete();
                    deletedUsers++;
                }
            }
        }
    } catch (e) { console.error("User cleanup error:", e); }

    const driversSnap = await db.collection("drivers").get();
    let batch = db.batch();
    let added = 0;
    let merged = 0;

    for (const doc of driversSnap.docs) {
        const d = doc.data();
        const leadRef = db.collection("leads").doc(doc.id);
        const leadSnap = await leadRef.get();

        const leadPayload = {
            firstName: d.personalInfo?.firstName || 'Unknown',
            lastName: d.personalInfo?.lastName || 'Driver',
            email: d.personalInfo?.email || '',
            phone: d.personalInfo?.phone || '',
            normalizedPhone: d.personalInfo?.normalizedPhone || '',
            driverType: d.driverProfile?.type || 'Unspecified',
            experience: d.qualifications?.experienceYears || 'N/A',
            city: d.personalInfo?.city || '',
            state: d.personalInfo?.state || '',
            status: 'active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (!leadSnap.exists) {
            leadPayload.createdAt = d.createdAt || admin.firestore.Timestamp.now();
            leadPayload.unavailableUntil = null;
            leadPayload.visitedCompanyIds = [];
            batch.set(leadRef, leadPayload);
            added++;
        } else {
            batch.set(leadRef, leadPayload, { merge: true });
            merged++;
        }
    }
    await batch.commit();
    return { success: true, message: `Deleted ${deletedUsers} fake users. Added ${added} leads. Merged ${merged}.` };
}

// --- 6. HELPERS & OUTCOMES (PRESERVED) ---
async function harvestNotesBeforeDelete(docSnap, data) {
    try {
        const notesSnap = await docSnap.ref.collection("internal_notes").get();
        const notesToShare = [];
        notesSnap.forEach(noteDoc => {
            const n = noteDoc.data();
            notesToShare.push({ text: n.text, date: n.createdAt, source: "Previous Recruiter" });
        });
        const originalId = data.originalLeadId || docSnap.id;
        if (originalId && notesToShare.length > 0) {
            await db.collection("leads").doc(originalId).update({
                sharedHistory: admin.firestore.FieldValue.arrayUnion(...notesToShare)
            }).catch(() => {});
        }
    } catch (e) { console.warn(`Harvest failed for ${docSnap.id}`, e); }
}

async function processLeadOutcome(leadId, companyId, outcome) {
    if (!leadId) return { error: "No Lead ID" };
    const leadRef = db.collection("leads").doc(leadId);
    const now = new Date();
    let lockUntil = new Date();
    let reason = "pool_recycle";

    if (outcome === 'hired_elsewhere' || outcome === 'hired' || outcome === 'Approved') {
        lockUntil.setDate(now.getDate() + POOL_HIRED_LOCK_DAYS);
        reason = "hired";
    } else if (outcome === 'not_interested' || outcome === 'not_qualified' || outcome === 'Rejected' || outcome === 'wrong_number') {
        lockUntil.setDate(now.getDate() + POOL_COOL_OFF_DAYS);
        reason = "rejected";
    } else {
        return { message: "No pool action needed" };
    }

    await leadRef.update({
        unavailableUntil: admin.firestore.Timestamp.fromDate(lockUntil),
        lastOutcome: outcome,
        lastOutcomeBy: companyId,
        poolStatus: reason
    });
    return { success: true, mode: reason, lockedUntil: lockUntil };
}

async function confirmDriverInterest(leadId, companyIdOrSlug, recruiterId) {
    const companyQuery = await db.collection("companies").where("appSlug", "==", companyIdOrSlug).limit(1).get();
    let companyId = companyQuery.empty ? companyIdOrSlug : companyQuery.docs[0].id;
    const leadSnap = await db.collection("leads").doc(leadId).get();

    if (!leadSnap.exists) return { success: false, error: "Lead not found." };

    const lockDate = new Date();
    lockDate.setDate(lockDate.getDate() + POOL_INTEREST_LOCK_DAYS);
    const lockTs = admin.firestore.Timestamp.fromDate(lockDate);

    const batch = db.batch();
    batch.set(db.collection("companies").doc(companyId).collection("applications").doc(leadId), {
        ...leadSnap.data(),
        status: "New Application",
        source: "Driver Interest Link",
        isPlatformLead: true,
        originalLeadId: leadId,
        submittedAt: admin.firestore.Timestamp.now()
    }, { merge: true });

    batch.update(db.collection("leads").doc(leadId), {
        unavailableUntil: lockTs,
        lastAssignedTo: companyId,
        poolStatus: "engaged_interest"
    });

    await batch.commit();
    return { success: true };
}

async function generateDailyAnalytics() {
    const todayStr = new Date().toISOString().split('T')[0];
    const companiesCount = (await db.collection("companies").count().get()).data().count;
    await db.collection("analytics").doc(todayStr).set({
        date: todayStr,
        metrics: { totalCompanies: companiesCount },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { success: true };
}

module.exports = {
    runLeadDistribution,
    populateLeadsFromDrivers,
    runCleanup,
    processLeadOutcome,
    confirmDriverInterest,
    generateDailyAnalytics
};