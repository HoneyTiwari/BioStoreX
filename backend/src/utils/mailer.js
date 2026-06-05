import nodemailer from "nodemailer";

const getTransporter = () => {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_SECURE } = process.env;
    if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
        return null;
    }

    return nodemailer.createTransport({
        host: EMAIL_HOST,
        port: Number(EMAIL_PORT),
        secure: EMAIL_SECURE === "true",
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    });
};

export const sendEmail = async ({ to, subject, text, html }) => {
    const transporter = getTransporter();

    if (!transporter) {
        console.warn("Email transporter not configured. OTP email will not be sent.");
        console.log("Email preview:", { to, subject, text, html });
        return;
    }

    await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject,
        text,
        html,
    });
};
