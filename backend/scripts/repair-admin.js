import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { User } from "../src/models/user.model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const adminEmail = (process.env.DEFAULT_ADMIN_EMAIL || process.env.ADMIN_EMAIL || process.argv[2] || "").trim().toLowerCase();
const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || process.argv[3];
const adminUsername = (process.env.DEFAULT_ADMIN_USERNAME || process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
const adminFullName = process.env.DEFAULT_ADMIN_FULLNAME || process.env.ADMIN_FULLNAME || "System Administrator";

const mask = (value) => {
    if (!value) return null;
    const [name, domain] = value.split("@");
    if (!domain) return `${value.slice(0, 2)}***`;
    return `${name.slice(0, 2)}***@${domain}`;
};

const main = async () => {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is not set");
    }

    if (!adminEmail || !adminPassword) {
        throw new Error("Set DEFAULT_ADMIN_EMAIL/DEFAULT_ADMIN_PASSWORD or ADMIN_EMAIL/ADMIN_PASSWORD before running this script");
    }

    if (adminPassword.length < 6) {
        throw new Error("Admin password must be at least 6 characters");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const existingAdmin = await User.findOne({
        $or: [
            { email: adminEmail },
            { userName: adminUsername },
            { role: { $in: ["Admin", "admin"] } },
        ],
    });

    const admin = existingAdmin || new User();
    admin.userName = adminUsername;
    admin.fullName = adminFullName;
    admin.email = adminEmail;
    admin.password = adminPassword;
    admin.role = "Admin";
    admin.isActive = true;
    admin.isApproved = true;

    await admin.save();

    console.log(existingAdmin ? "Admin repaired:" : "Admin created:", {
        id: String(admin._id),
        userName: admin.userName,
        email: mask(admin.email),
        role: admin.role,
        isActive: admin.isActive,
        isApproved: admin.isApproved,
    });

    await mongoose.disconnect();
};

main().catch((error) => {
    console.error("Admin repair failed:", error.message);
    process.exit(1);
});
