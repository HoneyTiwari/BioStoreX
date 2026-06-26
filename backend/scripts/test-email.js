/**
 * Standalone SendGrid test - verifies your SENDGRID_API_KEY/FROM_EMAIL env vars
 * are present and, if you pass a recipient address, sends a real test email.
 *
 * Usage (from the backend/ folder, with your .env already filled in):
 *   node scripts/test-email.js
 *   node scripts/test-email.js your-real-inbox@example.com   (sends a real test email)
 */
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { verifyEmailConfig, sendEmail } from "../src/services/email.service.js";

const recipient = process.argv[2];

console.log("Checking SendGrid environment variables...\n");

const { SENDGRID_API_KEY, FROM_EMAIL } = process.env;
console.log("SENDGRID_API_KEY:", SENDGRID_API_KEY ? `set (${SENDGRID_API_KEY.length} characters)` : "(not set)");
console.log("FROM_EMAIL:", FROM_EMAIL || "(not set)");
console.log();

const verified = await verifyEmailConfig();

if (!verified) {
    console.log("\nEmail is not configured. Set SENDGRID_API_KEY and FROM_EMAIL in .env.");
    process.exit(1);
}

if (!recipient) {
    console.log("\nSendGrid environment variables are configured.");
    console.log("  Run again with an email address as an argument to send a real test email:");
    console.log("  node scripts/test-email.js you@example.com");
    process.exit(0);
}

console.log(`\nSending a real test email to ${recipient}...`);

try {
    await sendEmail({
        to: recipient,
        subject: "BioStoreX SendGrid test",
        text: "If you're reading this, your BioStoreX SendGrid configuration works correctly.",
        html: "<p>If you're reading this, your BioStoreX SendGrid configuration works correctly.</p>",
    });
    console.log(`Test email sent to ${recipient}. Check the inbox (and spam folder).`);
} catch (error) {
    console.error("Sending failed:", error.message);
    process.exit(1);
}
