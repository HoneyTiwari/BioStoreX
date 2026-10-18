import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

let smtpTransporter;
let sendGridConfigured = false;

const hasSmtpConfig = () => Boolean(process.env.SMTP_HOST && process.env.FROM_EMAIL);

const getSmtpTransporter = () => {
    if (!hasSmtpConfig()) return null;
    if (smtpTransporter) return smtpTransporter;

    const port = Number(process.env.SMTP_PORT || 587);
    smtpTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
        secure: process.env.SMTP_SECURE
            ? process.env.SMTP_SECURE.toLowerCase() === "true"
            : port === 465,
        auth: process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
    });
    return smtpTransporter;
};

const configureSendGrid = () => {
    if (!process.env.SENDGRID_API_KEY) {
        sendGridConfigured = false;
        return false;
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sendGridConfigured = true;
    return true;
};

export const verifyEmailConfig = async () => {
    if (configureSendGrid() && process.env.FROM_EMAIL) {
        console.log(`Email configured with SendGrid (sending from ${process.env.FROM_EMAIL})`);
        return true;
    }

    const transporter = getSmtpTransporter();
    if (transporter) {
        try {
            await transporter.verify();
            console.log(`Email configured with SMTP (sending from ${process.env.FROM_EMAIL})`);
            return true;
        } catch (error) {
            console.error("SMTP configuration check failed:", error.message);
            return false;
        }
    }

    console.log("Email not configured. Password-reset OTPs will be logged to this console instead of emailed.");
    return false;
};

export const sendEmail = async ({ to, subject, text, html }) => {
    if (configureSendGrid() && process.env.FROM_EMAIL) {
        try {
            const [response] = await sgMail.send({ from: process.env.FROM_EMAIL, to, subject, text, html });
            return { id: response?.headers?.["x-message-id"], statusCode: response?.statusCode };
        } catch (error) {
            const details = error.response?.body?.errors || error.response?.body || error.message;
            console.error("SendGrid email delivery failed:", details);
            throw new Error(error.message || "SendGrid email delivery failed");
        }
    }

    const transporter = getSmtpTransporter();
    if (transporter) {
        try {
            const result = await transporter.sendMail({ from: process.env.FROM_EMAIL, to, subject, text, html });
            return { id: result.messageId, statusCode: 250 };
        } catch (error) {
            console.error("SMTP email delivery failed:", error.message);
            throw new Error(error.message || "SMTP email delivery failed");
        }
    }

    console.warn("Email service is not configured. Email will not be sent.");
    console.log("Email preview:", { to, subject, text, html });
};
