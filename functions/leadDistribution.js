// functions/leadDistribution.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { 
    runLeadDistribution, 
    populateLeadsFromDrivers, 
    runCleanup,
    processLeadOutcome,
    generateDailyAnalytics,
    confirmDriverInterest
} = require("./leadLogic");

const RUNTIME_OPTS = {
    timeoutSeconds: 540,
    memory: '512MiB', 
    maxInstances: 1,
    concurrency: 1,
    cors: true 
};

// --- 1. SCHEDULED TASK (6:30 AM Central Time) ---
exports.runLeadDistribution = onSchedule({
    schedule: "30 6 * * *", 
    timeZone: "America/Chicago",
    timeoutSeconds: 540,
    memory: '512MiB'
}, async (event) => {
    try {
        console.log("Running scheduled daily distribution (6:30 AM CT)...");
        // forceRotate is true here to ensure leads rotate every morning
        const result = await runLeadDistribution(true);
        console.log("Scheduled result:", result);
    } catch (error) {
        console.error("Scheduled failed:", error);
    }
});

// --- 2. MANUAL BUTTON (Force New Round) ---
exports.distributeDailyLeads = onCall(RUNTIME_OPTS, async (request) => {
    if (!request.auth || request.auth.token.roles?.globalRole !== 'super_admin') {
        throw new HttpsError("permission-denied", "Super Admin only.");
    }
    try {
        console.log("Super Admin forcing manual lead distribution round...");
        // forceRotate is true here to fulfill the 'force new round' requirement
        const result = await runLeadDistribution(true); 
        return result;
    } catch (error) {
        throw new HttpsError("internal", error.message);
    }
});

// --- 3. CLEANUP TOOL ---
exports.cleanupBadLeads = onCall(RUNTIME_OPTS, async (request) => {
    if (!request.auth || request.auth.token.roles?.globalRole !== 'super_admin') {
        throw new HttpsError("permission-denied", "Super Admin only.");
    }
    try {
        const result = await runCleanup();
        return result;
    } catch (error) {
        throw new HttpsError("internal", error.message);
    }
});

// --- 4. LEAD OUTCOME HANDLER ---
exports.handleLeadOutcome = onCall(RUNTIME_OPTS, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
    const { leadId, companyId, outcome } = request.data;
    const userRole = request.auth.token.roles?.[companyId];
    const isSuper = request.auth.token.roles?.globalRole === 'super_admin';

    if (!isSuper && !userRole) {
        throw new HttpsError("permission-denied", "You do not have access to this company.");
    }

    try {
        const result = await processLeadOutcome(leadId, companyId, outcome);
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// --- 5. ANALYTICS ---
exports.aggregateAnalytics = onSchedule({
    schedule: "55 23 * * *",
    timeZone: "America/Chicago",
    timeoutSeconds: 540,
    memory: '256MiB'
}, async (event) => {
    try {
        await generateDailyAnalytics();
    } catch (error) {
        console.error("Analytics failed:", error);
    }
});

// --- 6. DRIVER INTEREST ---
exports.confirmDriverInterest = onCall(RUNTIME_OPTS, async (request) => {
    const { leadId, companyId, recruiterId } = request.data;
    try {
        const result = await confirmDriverInterest(leadId, companyId, recruiterId);
        return result;
    } catch (error) {
        throw new HttpsError("internal", error.message);
    }
});

// --- 7. MIGRATION TOOL (Fix Data Button) ---
exports.migrateDriversToLeads = onCall(RUNTIME_OPTS, async (request) => {
    if (!request.auth || request.auth.token.roles?.globalRole !== 'super_admin') {
        throw new HttpsError("permission-denied", "Super Admin only.");
    }
    try {
        const result = await populateLeadsFromDrivers();
        return result;
    } catch (error) {
        throw new HttpsError("internal", error.message);
    }
});

// Alias for backwards compatibility if needed
exports.distributeDailyLeadsScheduled = exports.runLeadDistribution;