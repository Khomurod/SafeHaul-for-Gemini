const BaseAdapter = require('./BaseAdapter');
const RC = require('@ringcentral/sdk').SDK;

class RingCentralAdapter extends BaseAdapter {
    constructor(config) {
        super(config);
        // Config: { clientId, clientSecret, jwt, isSandbox, serverUrl (optional override) }

        let serverUrl = config.serverUrl;
        if (!serverUrl) {
            // Check for sandbox flag (handle boolean or string from DB)
            const isSandbox = config.isSandbox === true || config.isSandbox === 'true';
            serverUrl = isSandbox ? RC.server.sandbox : RC.server.production;
        }

        this.rc = new RC({
            server: serverUrl,
            clientId: config.clientId,
            clientSecret: config.clientSecret
        });
    }

    async sendSMS(to, text, userId = null) {
        try {
            // Context-Aware Routing
            let fromNumber = null;

            // 1. Direct Assignment (if userId provided)
            if (userId && this.config.assignments && this.config.assignments[userId]) {
                fromNumber = this.config.assignments[userId];
            }

            // 2. Default Company Number
            if (!fromNumber && this.config.defaultPhoneNumber) {
                fromNumber = this.config.defaultPhoneNumber;
            }

            // 3. Fallback to Credentials Number
            if (!fromNumber) {
                fromNumber = this.config.phoneNumber;
            }

            // Login with JWT
            await this.rc.login({ jwt: this.config.jwt });

            // Send Request
            const payload = {
                to: [{ phoneNumber: to }],
                text: text
            };

            // Only add 'from' if we determined one. 
            // If not, RingCentral uses the authorized user's default number (risky, but valid fallback)
            if (fromNumber) {
                payload.from = { phoneNumber: fromNumber };
            }

            await this.rc.post('/restapi/v1.0/account/~/extension/~/sms', payload);

            return true;
        } catch (error) {
            console.error("RingCentral Send Error:", error.response?.data || error.message);
            // Simplify error for the caller
            throw new Error(`RingCentral Error: ${error.message}`);
        }
    }

    async fetchAvailablePhoneNumbers() {
        try {
            await this.rc.login({ jwt: this.config.jwt });
            const response = await this.rc.get('/restapi/v1.0/account/~/phone-number');
            const data = await response.json();

            // Filter for SMS capable numbers and map to schema
            return data.records
                .filter(record => record.features && record.features.includes('SmsSender'))
                .map(record => ({
                    phoneNumber: record.phoneNumber,
                    type: record.type,           // e.g. VoiceFax
                    usageType: record.usageType, // e.g. DirectNumber
                    paymentType: record.paymentType,
                    status: 'available',         // Default status
                    assignedTo: null             // Not assigned yet
                }));
        } catch (error) {
            console.error("RC Fetch Inventory Error:", error);
            throw new Error("Failed to fetch number inventory: " + (error.message || "Unknown Error"));
        }
    }
}

module.exports = RingCentralAdapter;
