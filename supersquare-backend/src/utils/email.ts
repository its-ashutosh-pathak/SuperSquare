import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const emailPort = parseInt(process.env.EMAIL_PORT || '587');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: emailPort,
    secure: emailPort === 465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"SuperSquare" <no-reply@supersquare.com>',
            to,
            subject,
            text,
            html,
        });
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};
