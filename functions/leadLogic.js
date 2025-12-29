// functions/leadLogic.js

const { admin, db, auth } = require("./firebaseAdmin");

// --- CONSTANTS ---
const EXPIRY_SHORT_MS = 24 * 60 * 60 * 1000; // 24 Hours
const EXPIRY_LONG_MS = 7 * 24 * 60 * 60 * 1000; // 7 Days

// POOL RULES
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

// --- 1. LEAD DISTRIBUTION ORCHESTRATOR (UPGRADED) ---
async function runLeadDistribution(forceRotate = false) {
    console.log(`Starting Lead Distribution Engine (Force: ${forceRotate})...`);

    const companiesSnap = await db.collection("companies").get();
    let allCompanyDocs = shuffleArray(companiesSnap.docs); // SHUFFLE COMPANIES
    const allCompanyIds = allCompanyDocs.map(doc => doc.id);

    const nowTs = admin.firestore.Timestamp.now();
    const assignedLeadIds = new Set(); 

    // A. FETCH MASTER POOL OF AVAILABLE LEADS
    console.log("Fetching Master Pool of available leads...");
    let masterPool = [];
    try {
        const poolSnap = await db.collection("leads")
            .where("unavailableUntil", "<=", nowTs)
            .limit(1000)
            .get();

        masterPool = poolSnap.docs;

        // Fetch nulls if pool is small
        if (masterPool.length < 500) {
            const nullSnap = await db.collection("leads")
                .where("unavailableUntil", "==", null)
                .limit(500)
                .get();
            const existingIds = new Set(masterPool.map(d => d.id));
            nullSnap.docs.forEach(d => {
                if (!existingIds.has(d.id)) masterPool.push(d);
            });
        }
    } catch (e) {
        console.error("Master Pool fetch failed, using backup:", e);
        const backupSnap = await db.collection("leads").limit(500).get();
        masterPool = backupSnap.docs;
    }

    masterPool = shuffleArray(masterPool); // SHUFFLE LEADS
    console.log(`Master Pool ready with ${masterPool.length} leads.`);

    const distributionDetails = [];
    const now = new Date();

    // B. PROCESS DISTRIBUTION
    for (const companyDoc of allCompanyDocs) {
        try {
            const companyId = companyDoc.id;
            const companyData = companyDoc.data();
            const plan = companyData.planType || 'free';
            const LIMIT = plan === 'paid' ? 200 : 50; 

            // 1. CLEANUP & COUNT WORKING LEADS
            const activeWorkingCount = await processCompanyCleanup(companyId, now, forceRotate);

            // 2. REPLENISH TO HIT PROMISED QUOTA
            const needed = LIMIT - activeWorkingCount;
            let addedCount = 0;
            let msg = "";

            if (needed > 0) {
                addedCount = await processCompanyReplenishmentFromPool(
                    companyId, 
                    needed, 
                    nowTs, 
                    assignedLeadIds, 
                    allCompanyIds,
                    masterPool
                );
                msg = `${companyData.companyName}: Active ${activeWorkingCount}, Added ${addedCount}`;
            } else {
                msg = `${companyData.companyName}: Full (${activeWorkingCount}/${LIMIT})`;
            }

            console.log(msg);
            distributionDetails.push(msg);

        } catch (err) {
            console.error(`Error processing company ${companyDoc.id}:`, err);
            distributionDetails.push(`Error ${companyDoc.id}: ${err.message}`);
        }
    }

    return { success: true, message: "Distribution Complete", details: distributionDetails };
}

// --- 2. CLEANUP LOGIC (UPGRADED) ---
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

        // LOGIC: Terminal leads NEVER count toward quota and are deleted immediately
        if (isTerminal) {
            shouldDelete = true;
        } else if (forceRotate && !isEngaged) {
            shouldDelete = true;
        } else {
            if (!data.distributedAt) {
                shouldDelete = true;
            } else {
                const distributedTime = data.distributedAt.toDate().getTime();
                const age = now.getTime() - distributedTime;

                if (age > EXPIRY_LONG_MS) {
                    if (!["Hired", "Offer Accepted", "Approved"].includes(status)) shouldDelete = true;
                } else if (age > EXPIRY_SHORT_MS) {
                    if (!isEngaged) shouldDelete = true;
                }
            }
        }

        if (shouldDelete) {
            await harvestNotesBeforeDelete(docSnap, data);
            batch.delete(docSnap.ref);
            batchSize++;

            // Release back to global pool if it's not a terminal failure
            if (data.originalLeadId && !isTerminal) {
                 const leadRef = db.collection("leads").doc(data.originalLeadId);
                 batch.update(leadRef, { 
                    unavailableUntil: null, 
                    lastAssignedTo: null 
                 });
            }
        } else {
            // Only New, Attempted, or Engaged (non-terminal) leads count toward promised quota
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

// --- 3. REPLENISH LOGIC (UPGRADED) ---
async function processCompanyReplenishmentFromPool(companyId, needed, nowTs, assignedLeadIds, allCompanyIds, masterPool) {
    const companyLeadsRef = db.collection("companies").doc(companyId).collection("leads");

    let batch = db.batch();
    let batchSize = 0;
    let addedCount = 0;

    for (const leadDoc of masterPool) {
        if (addedCount >= needed) break;
        if (assignedLeadIds.has(leadDoc.id)) continue;

        const rawData = leadDoc.data();
        let visited = rawData.visitedCompanyIds || [];
        if (visited.includes(companyId)) continue;

        // Reset visited if they've seen everyone (avoids pool starvation)
        if (visited.length >= Math.max(1, allCompanyIds.length - 1)) visited = [];

        const safeLeadData = {
            firstName: rawData.firstName || 'Unknown',
            lastName: rawData.lastName || 'Driver',
            email: rawData.email || '',
            phone: rawData.phone || '',
            normalizedPhone: rawData.normalizedPhone || '',
            driverType: rawData.driverType || 'Unspecified',
            experience: rawData.experience || 'N/A',
            city: rawData.city || '',
            state: rawData.state || '',
            source: rawData.source || 'SafeHaul Network',
            sharedHistory: rawData.sharedHistory || []
        };

        const distData = {
            ...safeLeadData,
            isPlatformLead: true,
            distributedAt: nowTs,
            originalLeadId: leadDoc.id,
            status: "New Lead"
        };

        batch.set(companyLeadsRef.doc(leadDoc.id), distData);
        batchSize++;

        // Lock for 24 hours
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        batch.update(db.collection("leads").doc(leadDoc.id), { 
            unavailableUntil: admin.firestore.Timestamp.fromDate(tomorrow),
            lastAssignedTo: companyId,
            visitedCompanyIds: [...visited, companyId] 
        });
        batchSize++;

        assignedLeadIds.add(leadDoc.id);
        addedCount++;

        if (batchSize >= 400) { 
            await batch.commit(); 
            batch = db.batch(); 
            batchSize = 0; 
        }
    }

    if (batchSize > 0) await batch.commit();
    return addedCount;
}

// --- 4. DATA REPAIR & MISC (PRESERVED) ---
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
    return { success: true, message: `Purged ${deletedCount} items.` };
}

// --- 5. HELPERS & EXPORTS (PRESERVED) ---
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