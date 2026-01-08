const functions = require('firebase-functions');
const admin = require('firebase-admin');
const SMSAdapterFactory = require('./factory');
const { encrypt } = require('./encryption');

// --- 1. Save Configuration (Super Admin) ---
exports.saveIntegrationConfig = functions.https.onCall(async (data, context) => {
    // RBAC Check: Must be Super Admin (or equivalent high-privilege role)
    // Note: For this exercise we assume basic auth check, but in prod verify custom claims
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { companyId, provider, config } = data;
    if (!companyId || !provider || !config) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
    }

    // Encrypt sensitive keys before saving
    const encryptedConfig = {};
    for (const [key, value] of Object.entries(config)) {
        encryptedConfig[key] = encrypt(value);
    }

    try {
        const docRef = admin.firestore()
            .collection('companies').doc(companyId)
            .collection('integrations').doc('sms_provider');

        await docRef.set({
            provider,
            config: encryptedConfig,
            isActive: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: context.auth.uid
        });

        return { success: true };
    } catch (error) {
        console.error("Save Config Error:", error);
        throw new functions.https.HttpsError('internal', 'Failed to save configuration.');
    }
});

// --- 2. Test Connection (Super Admin) ---
exports.sendTestSMS = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');

    const { companyId, testPhoneNumber } = data;

    try {
        const adapter = await SMSAdapterFactory.getAdapter(companyId);

        // Attempt to send a message
        await adapter.sendSMS(testPhoneNumber, "SafeHaul System Test: Your SMS integration is working correctly.");

        return { success: true, message: "Test message sent successfully." };
    } catch (error) {
        console.error("Test SMS Error:", error);
        // Return the specific error message from the adapter to help debugging
        throw new functions.https.HttpsError('aborted', error.message);
    }
});

// --- 3. Execute Campaign Batch (Company Admin) ---
exports.executeReactivationBatch = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');

    const { companyId, leadIds, messageText } = data; // leadIds is array of [leadId]

    // Validation
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
        return { success: false, message: "No leads provided." };
    }
    if (leadIds.length > 50) {
        throw new functions.https.HttpsError('invalid-argument', 'Batch size limit exceeded (Max 50).');
    }

    // Permission Check: User should belong to this company (simplified here)
    // In real app, check context.auth.token.claims.companyId === companyId

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    try {
        const adapter = await SMSAdapterFactory.getAdapter(companyId);
        const db = admin.firestore();

        // Loop with Delay
        for (const leadId of leadIds) {
            try {
                // 1. Rate Limit Sleep (1000ms)
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 2. Fetch Lead Phone
                // Data might be in leads/{id} or companies/{id}/applications/{id} depending on structure
                // Assuming company leads structure for Company Admin campaigns
                const leadRef = db.collection('companies').doc(companyId).collection('applications').doc(leadId); // or generic leads
                const leadSnap = await leadRef.get();

                if (!leadSnap.exists) {
                    errors.push(`Lead not found: ${leadId}`);
                    failCount++;
                    continue;
                }

                const leadData = leadSnap.data();
                const phone = leadData.phone || leadData.phoneNumber;

                if (!phone) {
                    errors.push(`Lead ${leadId} has no phone number`);
                    failCount++;
                    continue;
                }

                // 3. Send SMS
                // Inject variables if needed (simple replacement)
                let finalMsg = messageText.replace('[Driver Name]', leadData.firstName || 'Driver');

                await adapter.sendSMS(phone, finalMsg);

                // 4. Update Status
                await leadRef.update({
                    lastContactedAt: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'Reactivation Attempted',
                    [`campaignLogs.${Date.now()}`]: {
                        action: 'sms_sent',
                        message: finalMsg,
                        status: 'success'
                    }
                });

                successCount++;

            } catch (innerError) {
                console.error(`Failed for lead ${leadId}:`, innerError);
                failCount++;
                errors.push(`Lead ${leadId}: ${innerError.message}`);

                // Try to log failure to doc
                try {
                    await db.collection('companies').doc(companyId).collection('applications').doc(leadId).update({
                        [`campaignLogs.${Date.now()}`]: { action: 'sms_failed', error: innerError.message }
                    });
                } catch (e) { /* ignore */ }
            }
        }

        return {
            success: true,
            stats: { total: leadIds.length, sent: successCount, failed: failCount },
            errors: errors.slice(0, 5) // Return first 5 errors to avoid huge payload
        };

    } catch (error) {
        console.error("Batch Execution Error:", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
