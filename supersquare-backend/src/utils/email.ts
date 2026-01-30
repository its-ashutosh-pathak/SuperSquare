import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    // Debug options
    logger: true,
    debug: true
});

// Verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
        console.error("SMTP Connection Error:", error);
    } else {
        console.log("SMTP Server is ready to take our messages");
    }
});

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
    try {
        console.log(`Attempting to send email to ${to}...`);
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"SuperSquare" <no-reply@supersquare.com>',
            to,
            subject,
            text,
            html,
        });
        console.log("Email sent successfully: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};
