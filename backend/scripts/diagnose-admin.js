import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const adminEmail = (process.env.DEFAULT_ADMIN_EMAIL || process.env.ADMIN_EMAIL || process.argv[2] || "admin@example.com")
    .trim()
    .toLowerCase();
const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || process.argv[3];

const mask = (value) => {
    if (!value) return null;
    const [name, domain] = value.split("@");
    if (!domain) return `${value.slice(0, 2)}***`;
    return `${name.slice(0, 2)}***@${domain}`;
};

const passwordLooksBcrypt = (password) => typeof password === "string" && /^\$2[aby]\$/.test(password);

const main = async () => {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is not set");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    const users = mongoose.connection.db.collection("users");

    console.log("Connected DB:", mongoose.connection.name);

    const exactUser = await users.findOne(
        { email: adminEmail },
        { projection: { userName: 1, email: 1, role: 1, isActive: 1, isApproved: 1, password: 1 } }
    );

    console.log("Exact admin email lookup:", {
        email: mask(adminEmail),
        found: Boolean(exactUser),
    });

    if (exactUser) {
        console.log("Exact admin document:", {
            userName: exactUser.userName,
            email: mask(exactUser.email),
            role: exactUser.role,
            isActive: exactUser.isActive,
            isApproved: exactUser.isApproved,
            passwordLooksBcrypt: passwordLooksBcrypt(exactUser.password),
            passwordLength: typeof exactUser.password === "string" ? exactUser.password.length : null,
            configuredPasswordMatches: adminPassword ? await bcrypt.compare(adminPassword, exactUser.password || "") : "not checked",
        });
    }

    const adminLikeUsers = await users.find(
        { $or: [{ userName: "admin" }, { role: { $in: ["Admin", "admin"] } }] },
        { projection: { userName: 1, email: 1, role: 1, isActive: 1, isApproved: 1, password: 1 } }
    ).toArray();

    console.log("Admin-like users:", adminLikeUsers.map((user) => ({
        userName: user.userName,
        email: mask(user.email),
        role: user.role,
        isActive: user.isActive,
        isApproved: user.isApproved,
        passwordLooksBcrypt: passwordLooksBcrypt(user.password),
        passwordLength: typeof user.password === "string" ? user.password.length : null,
    })));

    await mongoose.disconnect();
};

main().catch((error) => {
    console.error("Admin diagnostic failed:", error.message);
    process.exit(1);
});
