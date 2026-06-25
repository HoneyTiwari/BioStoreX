import { Resend } from "resend";

const getResendClient = () => {
    if (!process.env.RESEND_API_KEY) {
        return null;
    }

    return new Resend(process.env.RESEND_API_KEY);
};

export const verifyEmailConfig = async () => {
    if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) {
        console.log("Email not configured. Password-reset OTPs will be logged to this console instead of emailed.");
        return false;
    }

    console.log(`Email configured with Resend (sending from ${process.env.FROM_EMAIL})`);
    return true;
};

export const sendEmail = async ({ to, subject, text, html }) => {
    const resend = getResendClient();

    if (!resend || !process.env.FROM_EMAIL) {
        console.warn("Resend email service is not configured. OTP email will not be sent.");
        console.log("Email preview:", { to, subject, text, html });
        return;
    }

    const { data, error } = await resend.emails.send({
        from: process.env.FROM_EMAIL,
        to,
        subject,
        html,
        text,
    });

    if (error) {
        throw new Error(error.message || "Resend email delivery failed");
    }

    return data;
};
