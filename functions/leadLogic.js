// functions/leadLogic.js

const { admin, db } = require("./firebaseAdmin");

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

// --- UTILS ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

// --- 1. LEAD DISTRIBUTION ORCHESTRATOR ---
async function runLeadDistribution(forceRotate = false) {
    console.log(`Starting Lead Distribution Engine (Force: ${forceRotate})...`);
    const companiesSnap = await db.collection("companies").get();
    const allCompanyDocs = companiesSnap.docs;
    const allCompanyIds = allCompanyDocs.map(doc => doc.id);

    const distributionDetails = [];
    const now = new Date();
    const nowTs = admin.firestore.Timestamp.now();

    const assignedLeadIds = new Set(); 

    const companyChunks = chunkArray(allCompanyDocs, 5);
    for (const chunk of companyChunks) {
        const results = await Promise.all(chunk.map(async (companyDoc) => {
            const companyId = companyDoc.id;
            const companyData = companyDoc.data();
            const plan = companyData.planType || 'free';
            const LIMIT = plan === 'paid' ? 200 : 50;

            // A. CLEANUP
            const activeCount = await processCompanyCleanup(companyId, now, forceRotate);

            // B. REPLENISH
            const needed = LIMIT - activeCount;
            let addedCount = 0;
            let msg = "";

            if (needed > 0) {
                addedCount = await processCompanyReplenishment(
                    companyId, 
                    needed, 
                    nowTs, 
                    assignedLeadIds, 
                    allCompanyIds
                );
                msg = `${companyData.companyName}: Active ${activeCount}, Added ${addedCount}`;
            } else {
                msg = `${companyData.companyName}: Full (${activeCount}/${LIMIT})`;
            }
            return msg;
        }));

        distributionDetails.push(...results);
    }

    return { success: true, message: "Distribution Complete", details: distributionDetails };
}

// --- 2. CLEANUP LOGIC ---
async function processCompanyCleanup(companyId, now, forceRotate) {
    const companyLeadsRef = db.collection("companies").doc(companyId).collection("leads");
    const currentLeadsSnap = await companyLeadsRef.where("isPlatformLead", "==", true).get();

    let batch = db.batch();
    let batchSize = 0; 
    let activeCount = 0;

    for (const docSnap of currentLeadsSnap.docs) {
        const data = docSnap.data();
        let shouldDelete = false;
        const status = data.status || "New Lead";

        const isEngaged = ENGAGED_STATUSES.includes(status) && status !== "New Lead" && status !== "Attempted";

        if (forceRotate && !isEngaged) {
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

            if (data.originalLeadId) {
                 const leadRef = db.collection("leads").doc(data.originalLeadId);
                 batch.update(leadRef, { 
                    unavailableUntil: null, 
                    lastAssignedTo: null 
                 });
                 batchSize++; 
            }

            batch.delete(docSnap.ref);
            batchSize++;
        } else {
            activeCount++;
        }

        if (batchSize >= 400) { 
            await batch.commit(); 
            batch = db.batch(); 
            batchSize = 0; 
        }
    }

    if (batchSize > 0) {
        await batch.commit();
    }

    if (batchSize > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return activeCount;
}

// --- 3. REPLENISH LOGIC (OPTIMIZED) ---
async function processCompanyReplenishment(companyId, needed, nowTs, assignedLeadIds, allCompanyIds) {
    const companyLeadsRef = db.collection("companies").doc(companyId).collection("leads");

    // Fetch Candidates: Logic optimized to prevent exhaustion loops.
    // We fetch a larger batch to account for filters (Assigned/Visited).
    const FETCH_MULTIPLIER = 10; 
    const poolQuery = db.collection("leads")
        .where("unavailableUntil", "<=", nowTs)
        .orderBy("unavailableUntil", "asc")
        .limit((needed * FETCH_MULTIPLIER) + assignedLeadIds.size);

    let leadDocs = [];
    try {
        const poolSnap = await poolQuery.get();
        leadDocs = poolSnap.docs;

        // Fallback: Check for NULL 'unavailableUntil' (Requires separate index usually)
        if (leadDocs.length < needed) {
             const nullQuery = db.collection("leads").where("unavailableUntil", "==", null).limit(needed * 5);
             const nullSnap = await nullQuery.get();

             const existingIds = new Set(leadDocs.map(d => d.id));
             nullSnap.docs.forEach(d => {
                 if(!existingIds.has(d.id)) leadDocs.push(d);
             });
        }
    } catch (e) {
        console.warn("Pool query warning (Index likely missing):", e);
        // Emergency Fallback: Just get latest leads regardless of lock (risky but better than empty)
        // Only do this if strictly necessary. Better to fail safe.
        return 0; 
    }

    leadDocs = shuffleArray(leadDocs);

    let batch = db.batch();
    let batchSize = 0;
    let addedCount = 0;
    let skippedCount = 0;

    for (const leadDoc of leadDocs) {
        if (addedCount >= needed) break;
        if (assignedLeadIds.has(leadDoc.id)) {
            skippedCount++;
            continue;
        }

        const rawData = leadDoc.data();

        // Check History
        let visited = rawData.visitedCompanyIds || [];
        if (visited.includes(companyId)) {
            skippedCount++;
            continue;
        }

        // Loop Prevention: If lead has visited ALL companies, reset history to allow recycling
        if (visited.length >= Math.max(1, allCompanyIds.length - 1)) {
             visited = [];
        }

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

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        db.collection("leads").doc(leadDoc.id).update({ 
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

    if (batchSize > 0) {
        await batch.commit();
    }

    // LOGGING: Helps debug "Infinite Loop" fears or "Empty Dashboard" reports
    if (addedCount < needed) {
        console.log(`[Replenish] ${companyId}: Needed ${needed}, Added ${addedCount}, Skipped ${skippedCount} (Visited/Assigned). Pool Exhausted?`);
    }

    return addedCount;
}

// --- 4. OUTCOME HANDLER ---
async function processLeadOutcome(leadId, companyId, outcome) {
    if (!leadId) return { error: "No Lead ID" };

    const leadRef = db.collection("leads").doc(leadId);
    const now = new Date();
    let lockUntil = new Date();
    let reason = "pool_recycle";

    if (outcome === 'hired_elsewhere' || outcome === 'hired' || outcome === 'Approved') {
        lockUntil.setDate(now.getDate() + POOL_HIRED_LOCK_DAYS);
        reason = "hired";
    } else if (outcome === 'not_interested' || outcome === 'not_qualified' || outcome === 'Rejected') {
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

// --- 5. DRIVER INTEREST ---
async function confirmDriverInterest(leadId, companyIdOrSlug, recruiterId) {
    if (!leadId || !companyIdOrSlug) return { success: false, error: "Missing data" };

    let companyId = companyIdOrSlug;
    const companyQuery = await db.collection("companies").where("appSlug", "==", companyIdOrSlug).limit(1).get();
    if (!companyQuery.empty) {
        companyId = companyQuery.docs[0].id;
    } else {
        const directDoc = await db.collection("companies").doc(companyIdOrSlug).get();
        if (!directDoc.exists) return { success: false, error: "Invalid Company Link" };
        companyId = companyIdOrSlug;
    }

    const leadRef = db.collection("leads").doc(leadId);
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists) {
        return { success: false, error: "Lead not found in global pool." };
    }

    const leadData = leadSnap.data();
    const nowTs = admin.firestore.Timestamp.now();

    let recruiterName = "Assigned Recruiter";
    if (recruiterId) {
        try {
            const userSnap = await db.collection("users").doc(recruiterId).get();
            if (userSnap.exists) recruiterName = userSnap.data().name || recruiterName;
        } catch(e) { console.warn("Could not fetch recruiter name"); }
    }

    const appRef = db.collection("companies").doc(companyId).collection("applications").doc(leadId);
    const oldLeadRef = db.collection("companies").doc(companyId).collection("leads").doc(leadId);

    const appData = {
        ...leadData,
        status: "New Application", 
        source: "Driver Interest Link", 
        isPlatformLead: true,
        originalLeadId: leadId,
        assignedTo: recruiterId, 
        assignedToName: recruiterName,
        createdAt: nowTs,
        submittedAt: nowTs,
        updatedAt: nowTs
    };

    const lockDate = new Date();
    lockDate.setDate(lockDate.getDate() + POOL_INTEREST_LOCK_DAYS);
    const lockTs = admin.firestore.Timestamp.fromDate(lockDate);

    const batch = db.batch();
    batch.set(appRef, appData, { merge: true });
    batch.delete(oldLeadRef);

    batch.update(leadRef, {
        unavailableUntil: lockTs,
        lastAssignedTo: companyId,
        poolStatus: "engaged_interest"
    });

    await batch.commit();

    return { success: true, message: "Application created and assigned." };
}

// --- 6. ANALYTICS ---
async function generateDailyAnalytics() {
    const todayStr = new Date().toISOString().split('T')[0];
    const analyticsRef = db.collection("analytics").doc(todayStr);

    const companiesCount = (await db.collection("companies").count().get()).data().count;
    const leadsCount = (await db.collection("leads").count().get()).data().count;

    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayTs = admin.firestore.Timestamp.fromDate(todayStart);

    const activitiesSnap = await db.collectionGroup("activities")
        .where("timestamp", ">=", todayTs)
        .get();

    let calls = 0;
    const companyActivity = {};

    activitiesSnap.forEach(doc => {
        const a = doc.data();
        if (a.type === 'call') calls++;

        if (a.companyId) {
            if (!companyActivity[a.companyId]) companyActivity[a.companyId] = { calls: 0, actions: 0 };
            if (a.type === 'call') companyActivity[a.companyId].calls++;
            companyActivity[a.companyId].actions++;
        }
    });

    await analyticsRef.set({
        date: todayStr,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metrics: {
            totalCompanies: companiesCount,
            totalLeadsInPool: leadsCount,
            totalCallsMade: calls,
            totalActions: activitiesSnap.size
        },
        byCompany: companyActivity
    }, { merge: true });

    return { success: true, date: todayStr, calls };
}

// --- HELPERS ---
async function harvestNotesBeforeDelete(docSnap, data) {
    try {
        const notesSnap = await docSnap.ref.collection("internal_notes").get();
        const notesToShare = [];
        notesSnap.forEach(noteDoc => {
            const n = noteDoc.data();
            notesToShare.push({ text: n.text, date: n.createdAt, source: "Previous Recruiter" });
        });

        const originalId = data.originalLeadId || docSnap.id;
        if (originalId) {
            const rootRef = db.collection("leads").doc(originalId);
            const updatePayload = {};
            if (notesToShare.length > 0) {
                updatePayload.sharedHistory = admin.firestore.FieldValue.arrayUnion(...notesToShare);
            }
            if (Object.keys(updatePayload).length > 0) {
                await rootRef.update(updatePayload).catch(() => {});
            }
        }
    } catch (e) { console.warn(`Harvest failed for ${docSnap.id}`, e); }
}

async function runCleanup() {
    const leadsRef = db.collection("leads");
    const snapshot = await leadsRef.get();
    let batch = db.batch();
    let batchSize = 0; // Fix here as well
    let count = 0;
    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.phone && !data.email && data.firstName === 'Unknown') {
            batch.delete(doc.ref);
            batchSize++;
            count++;
        }
        if (batchSize >= 400) { await batch.commit(); batch = db.batch(); batchSize = 0; }
    }
    if (batchSize > 0) await batch.commit();
    return { success: true, deleted: count };
}

async function runMigration() { return {success:true}; }

module.exports = { 
    runLeadDistribution, 
    runMigration, 
    runCleanup,
    processLeadOutcome, 
    confirmDriverInterest,
    generateDailyAnalytics 
};