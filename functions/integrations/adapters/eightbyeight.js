const BaseAdapter = require('./BaseAdapter');
const axios = require('axios');

class EightByEightAdapter extends BaseAdapter {
    constructor(config) {
        super(config);
        // Config: { subAccountId, apiKey, region (optional) }
        this.baseUrl = config.region === 'eu'
            ? 'https://sms.8x8.com/api/v1'
            : 'https://sms.8x8.com/api/v1'; // Standard endpoint
    }

    async sendSMS(to, text) {
        try {
            const { subAccountId, apiKey } = this.config;

            const response = await axios.post(
                `${this.baseUrl}/subaccounts/${subAccountId}/messages`,
                {
                    source: "SafeHaul", // Usually requires a purchased shortcode or sender ID
                    destination: to,
                    text: text
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status === 200 || response.status === 201 || response.status === 202) {
                return true;
            }
            throw new Error(`Unexpected Status: ${response.status}`);

        } catch (error) {
            console.error("8x8 Send Error:", error.response?.data || error.message);
            throw new Error(`8x8 Error: ${error.message}`);
        }
    }
}

module.exports = EightByEightAdapter;
