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

    async sendSMS(to, text) {
        try {
            // Login with JWT
            await this.rc.login({ jwt: this.config.jwt });

            // Send Request
            await this.rc.post('/restapi/v1.0/account/~/extension/~/sms', {
                from: { phoneNumber: this.config.phoneNumber }, // Optional: User might need to specify a sender ID or default
                to: [{ phoneNumber: to }],
                text: text
            });

            return true;
        } catch (error) {
            console.error("RingCentral Send Error:", error.response?.data || error.message);
            // Simplify error for the caller
            throw new Error(`RingCentral Error: ${error.message}`);
        }
    }
}

module.exports = RingCentralAdapter;
