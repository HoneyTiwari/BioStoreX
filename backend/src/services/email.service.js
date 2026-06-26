import sgMail from "@sendgrid/mail";

let sendGridConfigured = false;

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
    if (!process.env.SENDGRID_API_KEY || !process.env.FROM_EMAIL) {
        console.log("Email not configured. Password-reset OTPs will be logged to this console instead of emailed.");
        return false;
    }

    configureSendGrid();
    console.log(`Email configured with SendGrid (sending from ${process.env.FROM_EMAIL})`);
    return true;
};

export const sendEmail = async ({ to, subject, text, html }) => {
    if ((!sendGridConfigured && !configureSendGrid()) || !process.env.FROM_EMAIL) {
        console.warn("SendGrid email service is not configured. Email will not be sent.");
        console.log("Email preview:", { to, subject, text, html });
        return;
    }

    try {
        const [response] = await sgMail.send({
            from: process.env.FROM_EMAIL,
            to,
            subject,
            text,
            html,
        });

        return {
            id: response?.headers?.["x-message-id"],
            statusCode: response?.statusCode,
        };
    } catch (error) {
        const details = error.response?.body?.errors || error.response?.body || error.message;
        console.error("SendGrid email delivery failed:", details);
        throw new Error(error.message || "SendGrid email delivery failed");
    }
};
