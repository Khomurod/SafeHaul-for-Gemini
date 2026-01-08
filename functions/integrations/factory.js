const admin = require('firebase-admin');
const { encrypt, decrypt } = require('./encryption');
const RingCentralAdapter = require('./adapters/ringcentral');
const EightByEightAdapter = require('./adapters/eightbyeight');

/**
 * Factory class to instantiate the correct SMS adapter for a company
 */
class SMSAdapterFactory {

    /**
     * Get an authenticated adapter instance for the given company
     * @param {string} companyId 
     * @returns {Promise<import('./adapters/BaseAdapter')>}
     */
    static async getAdapter(companyId) {
        if (!companyId) throw new Error("Company ID is required");

        // 1. Fetch Config from Firestore
        const docRef = admin.firestore().collection('companies').doc(companyId).collection('integrations').doc('sms_provider');
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            throw new Error(`No SMS provider configured for company: ${companyId}`);
        }

        const data = docSnap.data();
        if (!data.isActive) {
            throw new Error("SMS integration is disabled for this company.");
        }

        // 2. Decrypt Config
        const config = {};
        for (const [key, value] of Object.entries(data.config || {})) {
            try {
                config[key] = decrypt(value);
            } catch (e) {
                console.error(`Failed to decrypt key: ${key}`, e);
                throw new Error("Configuration encryption error.");
            }
        }

        // 3. Inject Routing Data (Assignments & Default)
        config.defaultPhoneNumber = data.defaultPhoneNumber || config.defaultPhoneNumber;
        config.assignments = data.assignments || {};

        // 4. Return Adapter
        switch (data.provider) {
            case 'ringcentral':
                return new RingCentralAdapter(config);
            case '8x8':
                return new EightByEightAdapter(config);
            default:
                throw new Error(`Unsupported provider: ${data.provider}`);
        }
    }
}

module.exports = SMSAdapterFactory;
