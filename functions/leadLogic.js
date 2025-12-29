// functions/leadLogic.js
const { admin, db, auth } = require("./firebaseAdmin");

// --- CONSTANTS (PRESERVED) ---
const QUOTA_FREE = 50;
const QUOTA_PAID = 200;
const EXPIRY_SHORT_MS = 24 * 60 * 60 * 1000; // 24 Hours
const EXPIRY_LONG_MS = 7 * 24 * 60 * 60 * 1000; // 7 Days
const POOL_COOL_OFF_DAYS = 7;
const POOL_INTEREST_LOCK_DAYS = 7;
const POOL_HIRED_LOCK_DAYS = 60;

const ENGAGED_STATUSES = [
    "Contacted", "Application Started", "Offer Sent", "Offer Accepted", "Interview Scheduled", "Hired", "Approved"
];

const TERMINAL_STATUSES = [
    "Wrong Number", "Not Interested", "Rejected", "Disqualified", "Hired Elsewhere"
];

// --- UTILS ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * PHASE 1 & 2: THE DEALER ENGINE V2
 * Transactional, Strict Quotas, and Correct Subcollection Pathing
 */
async function runLeadDistribution(forceRotate = false) {
    console.log(`Starting 'THE DEALER' Engine V2 (Force Rotate: ${forceRotate})...`);
    const logs = [];

    try {
        // 1. Get All Active Companies
        const companiesSnap = await db.collection("companies").where("isActive", "==", true).get();
        if (companiesSnap.empty) return { success: false, message: "No active companies found." };

        // 2. Randomize Company Order (Fairness)
        const companies = shuffleArray(companiesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        logs.push(`Processing ${companies.length} active companies.`);

        // 3. THE DEALER LOOP
        for (const company of companies) {
            try {
                // Determine Quota based on plan
                const isPaid = company.planType?.toLowerCase() === 'paid';
                let limit = company.dailyLeadQuota || (isPaid ? QUOTA_PAID : QUOTA_FREE);

                // Run Maintenance (Cleanup) + The Deal
                const result = await dealLeadsToCompany(company, limit, forceRotate);
                logs.push(result);
            } catch (err) {
                console.error(`DEALER ERROR for ${company.companyName}:`, err);
                logs.push(`${company.companyName}: ERROR - ${err.message}`);
            }
        }

        return { success: true, message: "Dealer Run Complete", details: logs };

    } catch (globalError) {
        console.error("FATAL DISTRIBUTION SYSTEM FAILURE:", globalError);
        throw globalError;
    }
}

/**
 * DEALER LOGIC (Per Company)
 * Includes Phase 1 (Maintenance) and Phase 2 (Transactional Deal)
 */
async function dealLeadsToCompany(company, planLimit, forceRotate) {
    const companyId = company.id;
    const now = new Date();
    const nowTs = admin.firestore.Timestamp.now();

    // STEP 1: MAINTENANCE CLEANUP (Preserved Logic)
    // We clean up terminal and expired leads before counting what the company needs.
    const activeWorkingCount = await processCompanyCleanup(companyId, now, forceRotate);

    // STEP 2: CALCULATE NEED
    const needed = Math.max(0, planLimit - activeWorkingCount);

    if (needed <= 0) {
        return `${company.companyName}: Full (${activeWorkingCount}/${planLimit})`;
    }

    // STEP 3: FETCH CANDIDATES FROM GLOBAL POOL
    const buffer = Math.ceil(needed * 1.5); // Request more to skip Ghost Leads
    let candidates = [];

    // Priority 1: Fresh Leads
    const freshSnap = await db.collection("leads")
        .where("unavailableUntil", "==", null)
        .limit(buffer)
        .get();
    freshSnap.forEach(doc => candidates.push(doc));

    // Priority 2: Recycled Leads
    if (candidates.length < buffer) {
        const remaining = buffer - candidates.length;
        const expiredSnap = await db.collection("leads")
            .where("unavailableUntil", "<=", nowTs)
            .limit(remaining)
            .get();
        expiredSnap.forEach(doc => candidates.push(doc));
    }

    // Shuffle Candidates for randomness
    candidates = shuffleArray(candidates);

    // STEP 4: TRANSACTIONAL ASSIGNMENT (THE GHOST BUSTER)
    let added = 0;
    for (const leadDoc of candidates) {
        if (added >= needed) break;

        // Verify existence and assign in a single transaction
        const success = await assignLeadTransaction(companyId, leadDoc, nowTs);
        if (success) added++;
    }

    return `${company.companyName}: Active ${activeWorkingCount}, Added ${added} (Target: ${planLimit})`;
}

/**
 * TRANSACTIONAL ASSIGNMENT
 * Verifies document existence (Clean Room) and sets correct pathing.
 */
async function assignLeadTransaction(companyId, leadDocRef, nowTs) {
    try {
        await db.runTransaction(async (t) => {
            // 1. Verify existence
            const freshDoc = await t.get(leadDocRef.ref);
            if (!freshDoc.exists) throw new Error("GHOST_LEAD");

            const data = freshDoc.data();
            
            // 2. Double-Check Lock
            if (data.unavailableUntil && data.unavailableUntil.toMillis() > Date.now()) {
                throw new Error("ALREADY_LOCKED");
            }

            // 3. Set Lock (24h)
            const lockUntil = new Date();
            lockUntil.setHours(lockUntil.getHours() + 24);

            // 4. Correct Subcollection Pathing
            const companyLeadRef = db.collection("companies").doc(companyId).collection("leads").doc(freshDoc.id);
            
            const payload = {
                firstName: data.firstName || 'Unknown',
                lastName: data.lastName || 'Driver',
                email: data.email || '',
                phone: data.phone || '',
                normalizedPhone: data.normalizedPhone || '',
                driverType: data.driverType || 'Unspecified',
                experience: data.experience || 'N/A',
                city: data.city || '',
                state: data.state || '',
                source: data.source || 'SafeHaul Network',
                sharedHistory: data.sharedHistory || [],
                // Distribution Flags
                isPlatformLead: true,
                distributedAt: nowTs,
                originalLeadId: freshDoc.id,
                status: "New Lead",
                assignedTo: null // Unassigned, visible to all recruiters in company
            };

            t.set(companyLeadRef, payload);
            t.update(leadDocRef.ref, {
                unavailableUntil: admin.firestore.Timestamp.fromDate(lockUntil),
                lastAssignedTo: companyId,
                visitedCompanyIds: admin.firestore.FieldValue.arrayUnion(companyId)
            });
        });
        return true;
    } catch (e) {
        console.warn(`Dealer skipped lead ${leadDocRef.id}: ${e.message}`);
        return false;
    }
}

// --- PRESERVED MAINTENANCE LOGIC ---

async function processCompanyCleanup(companyId, now, forceRotate) {
    const companyLeadsRef = db.collection("companies").doc(companyId).collection("leads");
    const currentLeadsSnap = await companyLeadsRef.where("isPlatformLead", "==", true).get();

    let batch = db.batch();
    let batchSize = 0;
    let workingCount = 0;

    for (const docSnap of currentLeadsSnap.docs) {
        const data = docSnap.data();
        let shouldDelete = false;

        const status = data.status || "New Lead";
        const isEngaged = ENGAGED_STATUSES.includes(status) && status !== "New Lead" && status !== "Attempted";
        const isTerminal = TERMINAL_STATUSES.includes(status);

        if (isTerminal) {
            shouldDelete = true;
        } else if (forceRotate && !isEngaged) {
            shouldDelete = true;
        } else if (data.distributedAt) {
            const age = now.getTime() - data.distributedAt.toDate().getTime();
            if (age > EXPIRY_LONG_MS) {
                if (!["Hired", "Offer Accepted", "Approved"].includes(status)) shouldDelete = true;
            } else if (age > EXPIRY_SHORT_MS && !isEngaged) {
                shouldDelete = true;
            }
        } else {
            shouldDelete = true; // No distribution date? Clean it.
        }

        if (shouldDelete) {
            await harvestNotesBeforeDelete(docSnap, data);
            batch.delete(docSnap.ref);
            batchSize++;

            if (data.originalLeadId && !isTerminal) {
                batch.update(db.collection("leads").doc(data.originalLeadId), {
                    unavailableUntil: null,
                    lastAssignedTo: null
                });
            }
        } else {
            workingCount++;
        }

        if (batchSize >= 400) {
            await batch.commit();
            batch = db.batch();
            batchSize = 0;
        }
    }

    if (batchSize > 0) await batch.commit();
    return workingCount;
}

// --- PRESERVED HELPER FUNCTIONS (Cleanup, Outcome, Driver Sync) ---

async function runCleanup() {
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
    return { success: true, message: `Purged ${deletedCount} bad items.` };
}

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