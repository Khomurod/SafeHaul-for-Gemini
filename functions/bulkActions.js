const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, db } = require("./firebaseAdmin");
const SMSAdapterFactory = require("./integrations/factory");
const { CloudTasksClient } = require("@google-cloud/tasks");
const nodemailer = require('nodemailer');
const { isBlacklisted } = require("./blacklist");

// --- CONSTANTS (Synced with Frontend) ---
const APPLICATION_STATUSES = [
    { id: 'new', label: 'New Application', value: 'New Application' },
    { id: 'contacted', label: 'Contacted', value: 'Contacted' },
    { id: 'interview', label: 'Interview Scheduled', value: 'Interview Scheduled' },
    { id: 'offer', label: 'Offer Sent', value: 'Offer Sent' },
    { id: 'hired', label: 'Hired', value: 'Hired' },
    { id: 'rejected', label: 'Rejected', value: 'Rejected' },
    { id: 'withdrawn', label: 'Withdrawn', value: 'Withdrawn' },
    { id: 'inactive', label: 'Inactive (30d+)', value: 'Inactive' }
];

const LAST_CALL_RESULTS = [
    { id: 'no_answer', label: 'No Answer', value: 'No Answer' },
    { id: 'left_voicemail', label: 'Left Voicemail', value: 'Left Voicemail' },
    { id: 'busy', label: 'Busy', value: 'Busy' },
    { id: 'wrong_number', label: 'Wrong Number', value: 'Wrong Number' },
    { id: 'not_interested', label: 'Not Interested', value: 'Not Interested' }
];

const getDbValue = (id, dictionary) => {
    const item = dictionary.find(i => i.id === id);
    return item ? item.value : id;
};

const PROJECT_ID = (admin.apps.length ? admin.app().options.projectId : null) || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;

// Allow region to be configured, default to us-central1 if not set
const LOCATION = process.env.FUNCTION_REGION || process.env.GCP_REGION || 'us-central1';
const QUEUE_NAME = "bulk-actions-queue";
const TASKS_CLIENT_OPTS = {};
// Initialize client with fallback if needed, but usually default is fine in Cloud Functions
const tasksClient = new CloudTasksClient(TASKS_CLIENT_OPTS);

// --- HELPER: DELAY ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 1. Initialize a Bulk Messaging Session
 * Handles filtering and identifying target IDs across 3 sources.
 */
exports.initBulkSession = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

    const { companyId, filters, messageConfig, scheduledFor, name, rawData } = request.data;
    const userId = request.auth.uid;

    if (!companyId || !filters || !messageConfig) {
        throw new HttpsError('invalid-argument', 'Missing companyId, filters, or messageConfig.');
    }

    try {
        console.log(`[initBulkSession] Initializing session. Project: ${PROJECT_ID}, Region: ${LOCATION}`);

        // --- 0. PRE-OPS ---
        // Create Reference Early to handle Imports
        const sessionRef = db.collection('companies').doc(companyId).collection('bulk_sessions').doc();

        let recruiterName = "Recruiter";
        let companyName = "SafeHaul";

        const userSnap = await db.collection('users').doc(userId).get();
        if (userSnap.exists) recruiterName = userSnap.data().name || recruiterName;

        const companySnap = await db.collection('companies').doc(companyId).get();
        if (companySnap.exists) companyName = companySnap.data().companyName || companyName;

        // --- 1. RESOLVE SOURCE ---
        let targetIds = [];
        let leadSourceType = filters.leadType || 'leads';

        // A. IMPORT MODE (Stateless Blast)
        if (rawData && Array.isArray(rawData) && rawData.length > 0) {
            console.log(`[initBulkSession] Import Mode: Processing ${rawData.length} rows`);
            leadSourceType = 'import';

            // Batch write targets to subcollection
            const batch = db.batch();
            const targetsRef = sessionRef.collection('targets');

            rawData.forEach((row, index) => {
                // Generate a stable ID if possible, or random
                const docId = row.id || targetsRef.doc().id;
                targetIds.push(docId);
                const docRef = targetsRef.doc(docId);
                batch.set(docRef, {
                    ...row,
                    importedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            });
            await batch.commit();

        }
        // B. CRM QUERY MODE
        else {
            if (filters.segmentId && filters.segmentId !== 'all') {
                const segmentSnap = await db.collection('companies').doc(companyId)
                    .collection('segments').doc(filters.segmentId)
                    .collection('members').limit(200).get();
                targetIds = segmentSnap.docs.map(d => d.id);
            } else {
                let baseRef;
                if (filters.leadType === 'global') {
                    baseRef = db.collection('leads');
                } else if (filters.leadType === 'leads') {
                    baseRef = db.collection('companies').doc(companyId).collection('leads');
                } else {
                    baseRef = db.collection('companies').doc(companyId).collection('applications');
                }

                let q = baseRef;

                // Apply Filters
                if (filters.status && filters.status.length > 0 && filters.status !== 'all') {
                    const mapStatus = (s) => getDbValue(s, APPLICATION_STATUSES);
                    if (Array.isArray(filters.status)) {
                        // FIX: Firestore IN query limit check
                        if (filters.status.length > 30) {
                            throw new HttpsError('invalid-argument', 'Max 30 status filters allowed. Please select specific statuses or "All".');
                        }
                        const dbStatuses = filters.status.map(mapStatus);
                        q = q.where('status', 'in', dbStatuses);
                    } else {
                        const dbStatus = mapStatus(filters.status);
                        q = q.where('status', '==', dbStatus);
                    }
                }

                if (filters.recruiterId === 'my_leads') {
                    q = q.where('assignedTo', '==', userId);
                } else if (filters.recruiterId && filters.recruiterId !== 'all') {
                    q = q.where('assignedTo', '==', filters.recruiterId);
                }

                if (filters.createdAfter) {
                    const date = new Date(filters.createdAfter);
                    q = q.where('createdAt', '>=', admin.firestore.Timestamp.fromDate(date));
                }
                if (filters.createdBefore) {
                    const date = new Date(filters.createdBefore);
                    q = q.where('createdAt', '<=', admin.firestore.Timestamp.fromDate(date));
                }

                if (filters.notContactedSince) {
                    const days = parseInt(filters.notContactedSince);
                    const date = new Date();
                    date.setDate(date.getDate() - days);
                    const threshold = admin.firestore.Timestamp.fromDate(date);

                    q = q.where(admin.firestore.Filter.or(
                        admin.firestore.Filter.where('lastContactedAt', '<=', threshold),
                        admin.firestore.Filter.where('lastContactedAt', '==', null)
                    ));
                }

                if (filters.lastCallOutcome && filters.lastCallOutcome !== 'all') {
                    if (filters.leadType === 'global') {
                        const outcomeMap = {
                            "Connected / Interested": "interested",
                            "Connected / Scheduled Callback": "callback",
                            "Connected / Not Qualified": "not_qualified",
                            "Connected / Not Interested": "not_interested",
                            "Connected / Hired Elsewhere": "hired_elsewhere",
                            "Left Voicemail": "voicemail",
                            "No Answer": "no_answer",
                            "Wrong Number": "wrong_number"
                        };
                        const outcomeId = outcomeMap[filters.lastCallOutcome] || filters.lastCallOutcome;
                        q = q.where('lastOutcome', '==', outcomeId);
                    } else {
                        const dbOutcome = getDbValue(filters.lastCallOutcome, LAST_CALL_RESULTS);
                        q = q.where('lastCallOutcome', '==', dbOutcome);
                    }
                }

                const limitCount = 5000;
                const snapshot = await q.limit(limitCount).get();
                targetIds = snapshot.docs.map(doc => doc.id);
            }

            // Client-side exclusions
            if (filters.excludedLeadIds && Array.isArray(filters.excludedLeadIds)) {
                targetIds = targetIds.filter(id => !filters.excludedLeadIds.includes(id));
            }
        }

        if (targetIds.length === 0) {
            return { success: false, message: "No targets found for these criteria." };
        }

        // --- 4. CREATE SESSION RECORD ---
        let initialStatus = 'queued';
        let scheduleTime = 0;

        if (scheduledFor) {
            const scheduleDate = new Date(scheduledFor);
            const now = new Date();
            if (scheduleDate > now) {
                initialStatus = 'scheduled';
                scheduleTime = (scheduleDate.getTime() - now.getTime()) / 1000;
            }
        }

        const sessionData = {
            id: sessionRef.id,
            companyId: companyId,
            name: name || "Untitled Campaign",
            status: initialStatus,
            creatorId: userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            scheduledFor: scheduledFor ? admin.firestore.Timestamp.fromDate(new Date(scheduledFor)) : null,
            config: {
                ...messageConfig,
                filters: filters,
                recruiterName,
                companyName
            },
            progress: {
                totalCount: targetIds.length,
                processedCount: 0,
                successCount: 0,
                failedCount: 0
            },
            targetIds: targetIds,
            currentPointer: 0,
            leadSourceType: leadSourceType
        };

        await sessionRef.set(sessionData);

        // --- 5. START WORKER ---
        await enqueueWorker(companyId, sessionRef.id, scheduleTime);

        return {
            success: true,
            sessionId: sessionRef.id,
            targetCount: targetIds.length,
            status: initialStatus
        };

    } catch (error) {
        console.error("[initBulkSession] Error:", error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Bulk session controls (pause/resume/cancel) have been refactored
 * to use direct Firestore SDK updates for better performance.
 * 
 * EXCEPTION: Resume requires a server-side kick to restart the worker.
 */
exports.resumeBulkSession = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

    const { companyId, sessionId } = request.data;
    const sessionRef = db.collection('companies').doc(companyId).collection('bulk_sessions').doc(sessionId);

    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) throw new HttpsError('not-found', 'Session not found');

    const session = sessionSnap.data();
    if (session.status === 'completed') {
        return { success: false, message: 'Session already completed' };
    }

    // 1. Set status to active
    await sessionRef.update({
        status: 'active',
        resumedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Kickstart the worker again (immediate)
    // We pass 0 delay to start processing immediately
    await enqueueWorker(companyId, sessionId, 0);

    return { success: true, message: 'Session resumed' };
});

/**
 * Pause a running session.
 * The worker checks this status at the start of each batch.
 */
exports.pauseBulkSession = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

    const { companyId, sessionId } = request.data;
    if (!companyId || !sessionId) throw new HttpsError('invalid-argument', 'Missing companyId or sessionId');

    const sessionRef = db.collection('companies').doc(companyId).collection('bulk_sessions').doc(sessionId);

    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) throw new HttpsError('not-found', 'Session not found');

    const session = sessionSnap.data();
    if (session.status !== 'active' && session.status !== 'queued' && session.status !== 'scheduled') {
        return { success: false, message: 'Session is not active' };
    }

    await sessionRef.update({
        status: 'paused',
        pausedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: 'Session paused' };
});

/**
 * Cancel/Stop a session permanently.
 */
exports.cancelBulkSession = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

    const { companyId, sessionId } = request.data;
    if (!companyId || !sessionId) throw new HttpsError('invalid-argument', 'Missing companyId or sessionId');

    const sessionRef = db.collection('companies').doc(companyId).collection('bulk_sessions').doc(sessionId);

    try {
        // Verify existence
        const doc = await sessionRef.get();
        if (!doc.exists) throw new HttpsError('not-found', 'Session does not exist');

        await sessionRef.update({
            status: 'cancelled',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, message: 'Session cancelled' };
    } catch (error) {
        console.error("Cancel Session Error:", error);
        throw new HttpsError('internal', error.message);
    }
});


/**
 * 5. Retry Failed Attempts
 * Creates a new session with only the failed IDs from a previous session.
 */
exports.retryFailedAttempts = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');
    const { companyId, originalSessionId, newMessageConfig } = request.data;
    const userId = request.auth.uid;

    try {
        // 1. Fetch failed logs
        const logsSnapshot = await db.collection('companies').doc(companyId)
            .collection('bulk_sessions').doc(originalSessionId)
            .collection('logs')
            .where('status', '==', 'failed')
            .get();

        // --- TRANSIENT ERROR FILTERING ---
        // Permanent errors that we should NOT retry automatically
        const permanentErrors = [
            "blacklist", "opt-out", "invalid", "landline", "no phone", "unreachable", "unallocated"
        ];

        const retryableLogs = logsSnapshot.docs.filter(doc => {
            const error = (doc.data().error || "").toLowerCase();
            return !permanentErrors.some(pe => error.includes(pe));
        });

        const failedLeadIds = [...new Set(retryableLogs.map(d => d.data().leadId))];

        if (failedLeadIds.length === 0) {
            return {
                success: false,
                message: "No transient failures found. All errors appear to be permanent (Invalid numbers, Blacklisted, etc)."
            };
        }

        // 2. Fetch original config if not provided
        // 2. Fetch original config if not provided
        let configToUse = newMessageConfig;
        let originalSourceType = 'retry';

        if (!configToUse || true) { // Always fetch to get sourceType
            const originalSessionSnap = await db.collection('companies').doc(companyId)
                .collection('bulk_sessions').doc(originalSessionId)
                .get();

            if (originalSessionSnap.exists) {
                const data = originalSessionSnap.data();
                if (!configToUse) configToUse = data.config;
                // CRITICAL FIX: Preserve the original source type (global, leads, applications) 
                // instead of 'retry', so the worker looks in the right collection.
                originalSourceType = data.leadSourceType || 'pool'; // Default to pool/global if missing
            } else {
                if (!configToUse) throw new HttpsError('not-found', "Original session config not found");
            }
        }

        // 3. Create NEW Session
        const sessionRef = db.collection('companies').doc(companyId).collection('bulk_sessions').doc();
        const sessionData = {
            id: sessionRef.id,
            status: 'queued',
            creatorId: userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            config: configToUse,
            progress: {
                totalCount: failedLeadIds.length,
                processedCount: 0,
                successCount: 0,
                failedCount: 0
            },
            targetIds: failedLeadIds,
            currentPointer: 0,
            leadSourceType: originalSourceType, // Use preserved type (e.g. 'applications')
            originalSessionId: originalSessionId
        };

        await sessionRef.set(sessionData);

        // 4. Start Worker
        await enqueueWorker(companyId, sessionRef.id, 0);

        return { success: true, sessionId: sessionRef.id, targetCount: failedLeadIds.length };

    } catch (error) {
        console.error("Retry Error:", error);
        throw new HttpsError('internal', error.message);
    }
});


/**
 * 2. Recursive Worker (Cloud Tasks Target)
 * Processes leads sequentially with carrier-compliant delays.
 */
/**
 * 2. Recursive Worker (Cloud Tasks Target)
 * Processes leads in BATCHES to improve throughput and reduce costs.
 * 
 * Recommended Batch Size: 50
 * - Reduces function invocations by 50x
 * - Keeps execution time well within 60s timeout (usually < 5s)
 * - stays under Firestore batch limit (500 ops)
 */
exports.processBulkBatch = onRequest({
    timeoutSeconds: 540,
    memory: '1GiB',
    region: 'us-central1',
    secrets: ['SMS_ENCRYPTION_KEY']
}, async (req, res) => {

    const hasQueueHeader = req.headers["x-appengine-queuename"] || req.headers["x-cloudtasks-queuename"];
    if (!hasQueueHeader && !process.env.FUNCTIONS_EMULATOR) {
        return res.status(403).send("Forbidden");
    }

    const { companyId, sessionId } = req.body;
    if (!companyId || !sessionId) return res.status(400).send("Missing parameters");

    // DEBUG: Check Environment
    console.log(`[processBulkBatch] Start. Env Secret Present: ${!!process.env.SMS_ENCRYPTION_KEY}`);

    const sessionRef = db.collection('companies').doc(companyId).collection('bulk_sessions').doc(sessionId);

    try {
        const sessionSnap = await sessionRef.get();
        if (!sessionSnap.exists) return res.status(404).send("Session not found");

        const session = sessionSnap.data();
        if (session.status === 'paused' || session.status === 'completed' || session.status === 'cancelled') {
            return res.status(200).send(`Session is ${session.status}.`);
        }

        const { targetIds, currentPointer, config, progress, leadSourceType } = session;

        // Completion check
        if (currentPointer >= targetIds.length) {
            await sessionRef.update({
                status: 'completed',
                completedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return res.status(200).send("Campaign Complete");
        }

        // --- SEQUENTIAL PROCESSING CONFIGURATION ---
        const BATCH_SIZE = 20; // Reduced from 50 to prevent timeouts (20 * 3s = 60s + overhead)
        const endPointer = Math.min(currentPointer + BATCH_SIZE, targetIds.length);
        const batchIds = targetIds.slice(currentPointer, endPointer);

        console.log(`[Batch Worker] Processing ${batchIds.length} leads Sequentially (Indices ${currentPointer} - ${endPointer - 1})`);

        // Prepare shared resources
        let adapter = null;
        let emailTransporter = null;
        let companyName = config.companyName || 'SafeHaul';
        const senderId = session.creatorId;

        if (config.method === 'sms') {
            try {
                adapter = await SMSAdapterFactory.getAdapterForUser(companyId, senderId);
            } catch (e) {
                console.error("Failed to initialize SMS adapter:", e);
                // Fail gracefully in loop
            }
        } else if (config.method === 'email') {
            try {
                const companySnap = await db.collection('companies').doc(companyId).get();
                const emailSettings = companySnap.data()?.emailSettings;
                if (emailSettings?.email && emailSettings?.appPassword) {
                    emailTransporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: { user: emailSettings.email, pass: emailSettings.appPassword }
                    });
                }
            } catch (e) {
                console.error("Failed to initialize Email transport:", e);
            }
        }

        // --- SEQUENTIAL LOOP ---
        let batchSuccessCount = 0;
        let batchFailCount = 0;

        for (const leadId of batchIds) {
            const loopStart = Date.now();
            let success = false;
            let errorMsg = null;
            let recipientName = "Unknown";
            let recipientIdentity = "N/A";

            try {
                // FIX: Idempotency Check - Prevent duplicate sends
                const logRef = sessionRef.collection('logs').doc(leadId);
                const logSnap = await logRef.get();
                if (logSnap.exists) {
                    console.log(`[Idempotency] Skipping ${leadId}, already processed.`);
                    continue;
                }

                // 1. Fetch Data
                let leadData = {};
                if (leadSourceType === 'import') {
                    // Fetch from 'targets' subcollection
                    const tSnap = await sessionRef.collection('targets').doc(leadId).get();
                    if (tSnap.exists) leadData = tSnap.data();
                    // else throw new Error("Imported target data missing"); // Don't throw, just skip
                    else {
                        errorMsg = "Imported target data missing";
                        // Continue to logging
                    }
                } else {
                    // Fetch from CRM
                    let leadDocRef;
                    if (leadSourceType === 'global') {
                        leadDocRef = db.collection('leads').doc(leadId);
                    } else if (leadSourceType === 'leads') {
                        leadDocRef = db.collection('companies').doc(companyId).collection('leads').doc(leadId);
                    } else {
                        leadDocRef = db.collection('companies').doc(companyId).collection('applications').doc(leadId);
                    }
                    const lSnap = await leadDocRef.get();
                    if (lSnap.exists) leadData = lSnap.data();
                    // else throw new Error("CRM lead data missing");
                    else {
                        errorMsg = "CRM lead data missing";
                    }
                }

                if (!errorMsg) {
                    recipientName = `${leadData.firstName || 'Driver'} ${leadData.lastName || ''}`.trim();
                    const phone = leadData.phone || leadData.phoneNumber;

                    // 2. Blacklist Check (only relevant for real numbers, less likely for import but still good)
                    const blacklisted = await isBlacklisted(companyId, phone);

                    if (blacklisted) {
                        errorMsg = "Number is blacklisted (Opt-out)";
                        success = false;
                    } else if (config.method === 'sms') {
                        if (!adapter) throw new Error("SMS Configuration Invalid");
                        recipientIdentity = phone || "No Phone";

                        if (recipientIdentity !== "No Phone") {
                            const finalMsg = config.message
                                .replace(/\[Driver Name\]/g, leadData.firstName || 'Driver')
                                .replace(/\[Company Name\]/g, companyName)
                                .replace(/\[Recruiter Name\]/g, config.recruiterName || 'your recruiter');

                            await adapter.sendSMS(recipientIdentity, finalMsg, senderId);
                            success = true;
                        } else {
                            errorMsg = "No valid phone number";
                        }

                    } else if (config.method === 'email') {
                        if (!emailTransporter) throw new Error("Email Settings Invalid");
                        recipientIdentity = leadData.email || "No Email";

                        if (recipientIdentity !== "No Email") {
                            const finalBody = config.message
                                .replace(/\[Driver Name\]/g, leadData.firstName || 'Driver')
                                .replace(/\[Company Name\]/g, companyName)
                                .replace(/\[Recruiter Name\]/g, config.recruiterName || 'your recruiter');

                            await emailTransporter.sendMail({
                                from: `"${companyName}" <${emailTransporter.transporter.options.auth.user}>`,
                                to: recipientIdentity,
                                subject: config.subject || `Update from ${companyName}`,
                                text: finalBody,
                                html: `<p>${finalBody.replace(/\n/g, '<br>')}</p>`
                            });
                            success = true;
                        } else {
                            errorMsg = "No valid email";
                        }
                    }
                } else {
                    success = false;
                }

            } catch (err) {
                errorMsg = err.message || "Unknown error";
                success = false;
            }

            // 3. Real-Time Write (Log) - Wrapped in TRY/CATCH to prevent batch crash
            try {
                await sessionRef.collection('logs').doc(leadId).set({
                    leadId,
                    recipientName,
                    recipientIdentity,
                    status: success ? 'delivered' : 'failed',
                    error: errorMsg,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    isSuccess: success
                });
            } catch (logErr) {
                console.error(`[Worker] Failed to write log for ${leadId}:`, logErr);
            }

            // 4. Real-Time Progress Update - Wrapped in TRY/CATCH
            if (success) batchSuccessCount++;
            else batchFailCount++;

            try {
                await sessionRef.update({
                    'progress.processedCount': admin.firestore.FieldValue.increment(1),
                    'progress.successCount': admin.firestore.FieldValue.increment(success ? 1 : 0),
                    'progress.failedCount': admin.firestore.FieldValue.increment(success ? 0 : 1),
                    // We don't update currentPointer here, we do it at batch end
                    lastUpdateAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } catch (updateErr) {
                console.error(`[Worker] Failed to update progress for ${leadId}:`, updateErr);
            }

            // 5. Safety Delay
            // Ensure we wait at least 3 seconds from loop start
            const elapsed = Date.now() - loopStart;
            const waitTime = Math.max(3000 - elapsed, 100);
            // We force at least 100ms even if 3s passed, to be safe, but mostly we want 3000ms total cycle.
            // Actually, requirements say "3 second interval".
            // So we should just wait 3000ms.
            await delay(3000);
        }

        // --- END BATCH UPDATE ---
        // ZOMBIE KILLER: Check status one last time to ensure we didn't get cancelled/paused mid-batch
        const freshSnap = await sessionRef.get();
        if (!freshSnap.exists || ['cancelled', 'paused', 'completed'].includes(freshSnap.data().status)) {
            console.log("[Batch Worker] Session stopped/cancelled during execution. Aborting recursion.");
            return res.status(200).send("Session stopped mid-batch.");
        }

        const isKnownLast = (endPointer >= targetIds.length);
        await sessionRef.update({
            currentPointer: endPointer,
            status: isKnownLast ? 'completed' : 'active',
            ...(isKnownLast ? { completedAt: admin.firestore.FieldValue.serverTimestamp() } : {})
        });

        // Loop next batch
        if (!isKnownLast) {
            await enqueueWorker(companyId, sessionId, 1);
        }

        res.status(200).send(`Processed batch of ${batchIds.length}. Success: ${batchSuccessCount}, Fail: ${batchFailCount}`);

    } catch (error) {
        console.error("[processBulkBatch] Critical Error:", error);
        res.status(500).send(error.message);
    }
});

async function enqueueWorker(companyId, sessionId, delaySeconds) {
    const queuePath = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);

    // FIX: V2 URL Logic & Env Var Requirement
    let url = process.env.PROCESS_BULK_BATCH_URL;
    if (!url) {
        if (process.env.FUNCTIONS_EMULATOR) {
            url = `http://127.0.0.1:5001/${PROJECT_ID}/${LOCATION}/processBulkBatch`;
        } else {
            // CRITICAL: Cannot guess V2 URLs
            throw new Error("CRITICAL CONFIG ERROR: PROCESS_BULK_BATCH_URL env var is missing. Cannot recurse.");
        }
    }

    // FIX: Dynamic Service Account
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG || '{}');
    const serviceAccountEmail = firebaseConfig.serviceAccount || `${PROJECT_ID}@appspot.gserviceaccount.com`;

    const payload = { companyId, sessionId };
    const task = {
        httpRequest: {
            httpMethod: "POST",
            url,
            headers: { "Content-Type": "application/json" },
            body: Buffer.from(JSON.stringify(payload)).toString("base64"),
            oidcToken: {
                serviceAccountEmail, // Uses dynamic account
                audience: url
            }
        }
    };
    if (delaySeconds > 0) {
        task.scheduleTime = { seconds: Date.now() / 1000 + delaySeconds };
    }

    try {
        await tasksClient.createTask({ parent: queuePath, task });
        console.log(`[enqueueWorker] Task created for session ${sessionId} with delay ${delaySeconds}s`);
    } catch (err) {
        console.error(`[enqueueWorker] CRITICAL: Failed to create Cloud Task for session ${sessionId}:`, err.message);
        console.error(`  - Queue Path: ${queuePath}`);
        console.error(`  - Task URL: ${url}`);
        console.error(`  - Ensure 'bulk-actions-queue' exists in Cloud Tasks for region ${LOCATION}`);

        // Update session to failed status so UI can show feedback
        try {
            await db.collection('companies').doc(companyId)
                .collection('bulk_sessions').doc(sessionId)
                .update({
                    status: 'failed',
                    error: `Cloud Tasks Enqueue Failed: ${err.message}. Ensure the 'bulk-actions-queue' exists in GCP region ${LOCATION}.`,
                    failedAt: admin.firestore.FieldValue.serverTimestamp()
                });
        } catch (updateErr) {
            console.error(`[enqueueWorker] Also failed to update session ${sessionId} to 'failed':`, updateErr.message);
        }

        throw err; // Re-throw to propagate to the caller
    }
}


