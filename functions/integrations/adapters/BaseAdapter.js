/**
 * Abstract Base Class for SMS Adapters
 */
class BaseAdapter {
    constructor(config) {
        this.config = config;
    }

    /**
     * Send an SMS message
     * @param {string} to - The recipient phone number (E.164 format preferably)
     * @param {string} text - The message content
     * @returns {Promise<boolean>} - True if successful
     * @throws {Error} - If implementation fails
     */
    async sendSMS(to, text) {
        throw new Error("Method 'sendSMS' must be implemented by concrete class.");
    }
}

module.exports = BaseAdapter;
