
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
        // Without explicit timeouts, a network/firewall issue (as opposed to
        // a simple bad-credentials rejection) can hang indefinitely instead
        // of failing fast — which would otherwise block server startup via
        // verifyEmailConfig().
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
    });
};

/**
 * Checks whether SOME (but not all) of the EMAIL_* vars are set — almost
 * always a typo or a half-finished .env edit. We can't reliably detect this
 * inside getTransporter() without changing its "are we configured at all"
 * contract, so it's a separate, explicit check called once at startup.
 */
const getPartialEmailConfigWarning = () => {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
    const set = [EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS].filter(Boolean).length;

    if (set > 0 && set < 4) {
        return "Email is partially configured (some EMAIL_* vars are set, others aren't) — " +
            "OTP emails will silently fall back to console logging until EMAIL_HOST, EMAIL_PORT, " +
            "EMAIL_USER, and EMAIL_PASS are all set.";
    }
    return null;
};

/**
 * Verifies the SMTP connection actually works (correct host/port/credentials)
 * by performing a real handshake — without sending an email. Call this once
 * at server startup so a bad Gmail App Password (or wrong host/port) shows
 * up immediately in the terminal, instead of silently failing the first
 * time a real user requests a password reset.
 *
 * Returns true if verified, false if not configured or verification failed
 * (both cases are logged with enough detail to act on).
 */
export const verifyEmailConfig = async () => {
    const partialWarning = getPartialEmailConfigWarning();
    if (partialWarning) {
        console.warn(`⚠ ${partialWarning}`);
        return false;
    }

    const transporter = getTransporter();
    if (!transporter) {
        console.log("ℹ Email not configured — password-reset OTPs will be logged to this console instead of emailed.");
        return false;
    }

    try {
        await transporter.verify();
        console.log(`✓ Email configured and verified (sending as ${process.env.EMAIL_USER})`);
        return true;
    } catch (error) {
        console.error("✗ Email configuration failed verification:", error.message);
        console.error(
            "  Check EMAIL_HOST/EMAIL_PORT/EMAIL_USER/EMAIL_PASS in .env. " +
            "For Gmail, EMAIL_PASS must be an App Password, not your normal Gmail password " +
            "(see https://myaccount.google.com/apppasswords)."
        );
        return false;
    }
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
