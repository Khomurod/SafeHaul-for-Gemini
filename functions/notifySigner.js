const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// --- EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'holmurod96@gmail.com', 
        pass: 'duar yvtf rkfc jbdv'
    }
});

exports.notifySigner = functions.firestore
    .document('companies/{companyId}/signing_requests/{requestId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        const { companyId, requestId } = context.params;

        if (!data.recipientEmail) return;
        // Only send if the flag is true (set by frontend) or undefined (legacy)
        if (data.sendEmail === false) return;

        // --- DYNAMIC URL GENERATION ---
        // Grab project ID to build the default Firebase URL
        const projectId = admin.instanceId().app.options.projectId;
        const defaultUrl = `https://${projectId}.web.app`;
        
        // Use environment variable if set, otherwise default to Firebase Hosting URL
        const appUrl = process.env.APP_URL || defaultUrl;
        
        // CRITICAL UPDATE: Append the secure Access Token to the link
        const link = `${appUrl}/sign/${companyId}/${requestId}?token=${data.accessToken}`;

        console.log(`Generating email for ${data.recipientEmail} with secure link.`);

        const mailOptions = {
            // "From" must match the auth user to avoid spam flags
            from: `SafeHaul Documents <${transporter.options.auth.user}>`,
            to: data.recipientEmail,
            subject: `Signature Request: ${data.title || 'Document'}`,
            html: `
                <div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333;">Review and Sign</h2>
                    <p>Hello <strong>${data.recipientName || 'Driver'}</strong>,</p>
                    <p>You have received a secure document via SafeHaul.</p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <tr>
                            <td>
                                <strong>Document:</strong> ${data.title || 'Untitled PDF'}<br>
                                <strong>Sender:</strong> ${companyId}
                            </td>
                        </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td align="center">
                                <a href="${link}" style="background-color: #2563eb; color: #ffffff; padding: 14px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block; mso-padding-alt: 0;">
                                    <span style="mso-text-raise: 15pt;">Review & Sign Document</span>
                                    </a>
                            </td>
                        </tr>
                    </table>
                    
                    <p style="margin-top: 30px; font-size: 12px; color: #888;">
                        If the button above doesn't work, copy and paste this secure link:<br>
                        <a href="${link}" style="color: #2563eb;">${link}</a>
                    </p>
                    
                    <p style="font-size: 11px; color: #aaa; margin-top: 10px;">
                        This link is secure and unique to you. Please do not share it.
                    </p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            
            await snap.ref.update({ 
                emailStatus: 'sent',
                emailSentAt: admin.firestore.FieldValue.serverTimestamp() 
            });
            console.log("Email successfully sent.");
            
        } catch (error) {
            console.error('Error sending email:', error);
            await snap.ref.update({ 
                emailStatus: 'error', 
                emailError: error.message 
            });
        }
    });