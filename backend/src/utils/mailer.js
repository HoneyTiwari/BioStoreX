import nodemailer from "nodemailer";

const getFromAddress = () => {
    const configuredFrom = process.env.EMAIL_FROM?.trim();
    const emailUser = process.env.EMAIL_USER?.trim();
    const emailHost = process.env.EMAIL_HOST?.toLowerCase() || "";

    if (!configuredFrom) {
        return `BioStoreX <${emailUser}>`;
    }

    // Gmail commonly rejects arbitrary sender addresses. Keep the display
    // name, but send from the authenticated Gmail account.
    if (emailHost.includes("gmail") && emailUser && !configuredFrom.includes(emailUser)) {
        return `BioStoreX <${emailUser}>`;
    }

    return configuredFrom;
};

const getTransporter = () => {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_SECURE } = process.env;
    if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
        return null;
    }

    const secure = EMAIL_SECURE === "true";

    return nodemailer.createTransport({
        host: EMAIL_HOST,
        port: Number(EMAIL_PORT),
        secure,
        requireTLS: !secure,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
        // Without explicit timeouts, a network/firewall issue can hang
        // indefinitely instead of failing fast during startup verification.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
    });
};

const getPartialEmailConfigWarning = () => {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
    const set = [EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS].filter(Boolean).length;

    if (set > 0 && set < 4) {
        return "Email is partially configured. OTP emails will fall back to development output until EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASS are all set.";
    }

    return null;
};

export const verifyEmailConfig = async () => {
    const partialWarning = getPartialEmailConfigWarning();
    if (partialWarning) {
        console.warn(`Warning: ${partialWarning}`);
        return false;
    }

    const transporter = getTransporter();
    if (!transporter) {
        console.log("Email not configured. Password-reset OTPs will be logged to this console instead of emailed.");
        return false;
    }

    try {
        await transporter.verify();
        console.log(`Email configured and verified (sending as ${process.env.EMAIL_USER})`);
        return true;
    } catch (error) {
        console.error("Email configuration failed verification:", error.message);
        console.error(
            "  Check EMAIL_HOST/EMAIL_PORT/EMAIL_USER/EMAIL_PASS in .env. " +
            "For Gmail, EMAIL_PASS must be a Gmail App Password, not your normal Gmail password " +
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
        from: getFromAddress(),
        to,
        subject,
        text,
        html,
    });
};
