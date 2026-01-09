const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const SMSAdapterFactory = require('./factory');
const { encrypt } = require('./encryption');
const RingCentralAdapter = require('./adapters/ringcentral');
const EightByEightAdapter = require('./adapters/eightbyeight');

// --- 1. Save Configuration (Company Admin or Super Admin) ---
exports.saveIntegrationConfig = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { companyId, provider, config } = request.data;
    if (!companyId || !provider || !config) {
        throw new HttpsError('invalid-argument', 'Missing required fields.');
    }

    // RBAC Check: Company Admin for this company OR Super Admin
    const claims = request.auth.token;
    const isCompanyAdmin = claims.roles?.[companyId] === 'company_admin';
    const isSuperAdmin = claims.globalRole === 'super_admin' || claims.email?.endsWith('@safehaul.io');

    if (!isCompanyAdmin && !isSuperAdmin) {
        throw new HttpsError('permission-denied', 'Only Company Admins can configure SMS for their company.');
    }

    // Encrypt sensitive keys before saving
    const encryptedConfig = {};
    for (const [key, value] of Object.entries(config)) {
        encryptedConfig[key] = encrypt(value);
    }

    // --- NEW: Verify Credentials & Fetch Inventory (Non-Blocking) ---
    let inventory = [];
    let verificationWarning = null;
    try {
        let adapter;
        if (provider === 'ringcentral') {
            adapter = new RingCentralAdapter(config);
        } else if (provider === '8x8') {
            adapter = new EightByEightAdapter(config);
        }

        if (adapter && adapter.fetchAvailablePhoneNumbers) {
            inventory = await adapter.fetchAvailablePhoneNumbers();
            console.log(`Inventory Sync: Fetched ${inventory.length} numbers for ${provider}`);
        }
    } catch (error) {
        console.warn("Integration Verification Failed (Non-Blocking):", error);
        verificationWarning = `Credentials saved, but verification failed: ${error.message}. You may need to enter phone numbers manually or check your credentials later.`;
    }

    try {
        const docRef = admin.firestore()
            .collection('companies').doc(companyId)
            .collection('integrations').doc('sms_provider');

        // Determine Default Number (pick first available if present)
        let defaultPhoneNumber = null;
        if (inventory && inventory.length > 0) {
            defaultPhoneNumber = inventory[0].phoneNumber;
        }

        await docRef.set({
            provider,
            config: encryptedConfig,
            inventory,
            defaultPhoneNumber, // Auto-set from first inventory item
            isActive: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: request.auth.uid
        }, { merge: true }); // Preserve existing assignments if re-saving

        return {
            success: true,
            warning: verificationWarning,
            inventoryCount: inventory.length,
            syncMeta: adapter?.lastSyncMeta || null
        };
    } catch (error) {
        console.error("Save Config Error:", error);
        throw new HttpsError('internal', 'Failed to save configuration.');
    }
});

// --- 2. Test Connection (Super Admin) ---
exports.sendTestSMS = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated.');

    const { companyId, testPhoneNumber } = request.data;

    try {
        const adapter = await SMSAdapterFactory.getAdapter(companyId);

        // Attempt to send a message (as the current user)
        await adapter.sendSMS(testPhoneNumber, "SafeHaul System Test: Your SMS integration is working correctly.", request.auth.uid);

        return { success: true, message: "Test message sent successfully." };
    } catch (error) {
        console.error("Test SMS Error:", error);
        // Return the specific error message from the adapter to help debugging
        throw new HttpsError('internal', error.message);
    }
});

// --- 3. Execute Campaign Batch (Company Admin) ---
exports.executeReactivationBatch = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated.');

    const { companyId, leadIds, messageText } = request.data; // leadIds is array of [leadId]

    // Validation
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
        return { success: false, message: "No leads provided." };
    }
    if (leadIds.length > 50) {
        throw new HttpsError('invalid-argument', 'Batch size limit exceeded (Max 50).');
    }

    // Permission Check: User should belong to this company (simplified here)
    // In real app, check request.auth.token.claims.companyId === companyId

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

                await adapter.sendSMS(phone, finalMsg, request.auth.uid);

                // 4. Update Status
                await leadRef.update({
                    lastContactedAt: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'Reactivation Attempted',
                    [`campaignLogs.${Date.now()}`]: {
                        action: 'sms_sent',
                        message: finalMsg,
                        sentFrom: adapter.config.assignments?.[request.auth.uid] || adapter.config.defaultPhoneNumber || 'default',
                        sentBy: request.auth.uid,
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
        throw new HttpsError('internal', error.message);
    }
});

// --- 4. Assign Phone Number (Company Admin) ---
exports.assignPhoneNumber = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated.');

    const { companyId, userId, phoneNumber } = request.data;

    if (!companyId || !userId || !phoneNumber) {
        throw new HttpsError('invalid-argument', 'Missing required fields: companyId, userId, phoneNumber.');
    }

    // Permission Check: Requester must be Company Admin
    const claims = request.auth.token;
    const isCompanyAdmin = claims.roles?.[companyId] === 'company_admin';
    const isSuperAdmin = claims.globalRole === 'super_admin' || claims.email?.endsWith('@safehaul.io');

    if (!isCompanyAdmin && !isSuperAdmin) {
        throw new HttpsError('permission-denied', 'Only Company Admins can assign phone numbers.');
    }

    const db = admin.firestore();
    const docRef = db.collection('companies').doc(companyId).collection('integrations').doc('sms_provider');

    try {
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new HttpsError('not-found', 'SMS integration not configured for this company.');
        }

        const data = doc.data();
        const inventory = data.inventory || [];

        // Validate that phoneNumber is in inventory
        const isValidNumber = inventory.some(n => n.phoneNumber === phoneNumber);
        if (!isValidNumber && phoneNumber !== '') {
            throw new HttpsError('invalid-argument', 'Phone number not found in company inventory.');
        }

        // Update assignments map
        const assignments = data.assignments || {};
        if (phoneNumber === '') {
            delete assignments[userId]; // Unassign
        } else {
            assignments[userId] = phoneNumber;
        }

        await docRef.update({
            assignments,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, message: 'Phone number assigned successfully.' };
    } catch (error) {
        console.error('Assignment Error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to assign phone number.');
    }
});

// --- 5. Add Manual Phone Number to Inventory (Company Admin) ---
exports.addManualPhoneNumber = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated.');

    const { companyId, phoneNumber } = request.data;

    if (!companyId || !phoneNumber) {
        throw new HttpsError('invalid-argument', 'Missing required fields: companyId, phoneNumber.');
    }

    // Validate phone number format (basic validation)
    const cleanedNumber = phoneNumber.trim();
    if (!cleanedNumber || cleanedNumber.length < 3) {
        throw new HttpsError('invalid-argument', 'Invalid phone number or sender ID.');
    }

    // Permission Check: Requester must be Company Admin
    const claims = request.auth.token;
    const isCompanyAdmin = claims.roles?.[companyId] === 'company_admin';
    const isSuperAdmin = claims.globalRole === 'super_admin' || claims.email?.endsWith('@safehaul.io');

    if (!isCompanyAdmin && !isSuperAdmin) {
        throw new HttpsError('permission-denied', 'Only Company Admins can add phone numbers.');
    }

    const db = admin.firestore();
    const docRef = db.collection('companies').doc(companyId).collection('integrations').doc('sms_provider');

    try {
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new HttpsError('not-found', 'SMS integration not configured for this company.');
        }

        const data = doc.data();
        const inventory = data.inventory || [];

        // Check if number already exists
        const exists = inventory.some(n => n.phoneNumber === cleanedNumber);
        if (exists) {
            throw new HttpsError('already-exists', 'This phone number is already in the inventory.');
        }

        // Add to inventory
        inventory.push({
            phoneNumber: cleanedNumber,
            type: 'Manual',
            status: 'available',
            usageType: 'Custom',
            addedBy: request.auth.uid,
            addedAt: new Date().toISOString()
        });

        // Set default if first number
        const updates = {
            inventory,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (!data.defaultPhoneNumber && inventory.length === 1) {
            updates.defaultPhoneNumber = cleanedNumber;
        }

        await docRef.update(updates);

        return { success: true, message: 'Phone number added to inventory.' };
    } catch (error) {
        console.error('Add Phone Number Error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to add phone number.');
    }
});
