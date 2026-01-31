import * as SibApiV3Sdk from '@sendinblue/client';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Brevo API client
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(
    SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY || ''
);

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
    try {
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

        // Sender configuration
        sendSmtpEmail.sender = {
            email: process.env.FROM_EMAIL || 'supersquare2026@gmail.com',
            name: process.env.FROM_NAME || 'SuperSquare'
        };

        // Recipient
        sendSmtpEmail.to = [{ email: to }];

        // Email content
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.textContent = text;
        sendSmtpEmail.htmlContent = html || text;

        // Send email via Brevo
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Email sent successfully via Brevo:', data);
        return data;
    } catch (error) {
        console.error('Error sending email via Brevo:', error);
        throw error;
    }
};
