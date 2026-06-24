/**
 * Standalone SMTP test — verifies your EMAIL_* env vars work and, if you
 * pass a recipient address, sends a real test email.
 *
 * Usage (from the backend/ folder, with your .env already filled in):
 *   node scripts/test-email.js
 *   node scripts/test-email.js your-real-inbox@example.com   (sends a real test email)
 */
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { verifyEmailConfig, sendEmail } from "../src/utils/mailer.js";

const recipient = process.argv[2];

console.log("Checking EMAIL_* environment variables...\n");

const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM } = process.env;
console.log("EMAIL_HOST:", EMAIL_HOST || "(not set)");
console.log("EMAIL_PORT:", EMAIL_PORT || "(not set)");
console.log("EMAIL_USER:", EMAIL_USER || "(not set)");
console.log("EMAIL_PASS:", EMAIL_PASS ? `set (${EMAIL_PASS.length} characters)` : "(not set)");
console.log("EMAIL_FROM:", EMAIL_FROM || "(not set, will default to EMAIL_USER)");
console.log();

const verified = await verifyEmailConfig();

if (!verified) {
    console.log("\n✗ SMTP verification failed or email isn't configured — see the message above.");
    console.log("  Common causes for Gmail:");
    console.log("  - EMAIL_PASS is your normal Gmail password instead of an App Password");
    console.log("  - 2-Step Verification isn't enabled on the Google account (required for App Passwords)");
    console.log("  - EMAIL_USER has a typo");
    process.exit(1);
}

if (!recipient) {
    console.log("\n✓ SMTP connection verified successfully.");
    console.log("  Run again with an email address as an argument to send a real test email:");
    console.log("  node scripts/test-email.js you@example.com");
    process.exit(0);
}

console.log(`\nSending a real test email to ${recipient}...`);

try {
    await sendEmail({
        to: recipient,
        subject: "BioStoreX SMTP test",
        text: "If you're reading this, your BioStoreX email configuration works correctly.",
        html: "<p>If you're reading this, your BioStoreX email configuration works correctly.</p>",
    });
    console.log(`✓ Test email sent to ${recipient}. Check the inbox (and spam folder).`);
} catch (error) {
    console.error("✗ Sending failed:", error.message);
    process.exit(1);
}
