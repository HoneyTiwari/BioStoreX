import { User } from "../models/user.model.js";

export const createDefaultAdmin = async () => {
    try {
        const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
        const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
        const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || process.env.ADMIN_USERNAME || "admin";
        const adminFullName = process.env.DEFAULT_ADMIN_FULLNAME || process.env.ADMIN_FULLNAME || "System Administrator";
        const {
            DEFAULT_STOREKEEPER_EMAIL,
            DEFAULT_STOREKEEPER_PASSWORD,
            DEFAULT_STOREKEEPER_USERNAME,
            DEFAULT_STOREKEEPER_FULLNAME,
        } = process.env;

        if (!adminEmail || !adminPassword) {
            console.log("Default admin seeding skipped. Set DEFAULT_ADMIN_EMAIL/DEFAULT_ADMIN_PASSWORD or ADMIN_EMAIL/ADMIN_PASSWORD to enable it.");
        } else if (adminPassword.length < 6) {
            console.warn("Default admin seeding skipped. DEFAULT_ADMIN_PASSWORD must be at least 6 characters.");
        } else {
            const normalizedAdminEmail = adminEmail.trim().toLowerCase();
            const normalizedAdminUsername = adminUsername.trim().toLowerCase();

            const existingAdmin = await User.findOne({
                $or: [
                    { email: normalizedAdminEmail },
                    { userName: normalizedAdminUsername },
                    { role: { $in: ["Admin", "admin"] } },
                ],
            });

            if (!existingAdmin) {
                const adminUser = await User.create({
                    userName: normalizedAdminUsername,
                    fullName: adminFullName,
                    email: normalizedAdminEmail,
                    password: adminPassword,
                    role: "Admin",
                    isActive: true,
                    isApproved: true,
                });

                console.log("Default Admin created:");
                console.log("   Email:", adminUser.email);
            } else {
                existingAdmin.userName = normalizedAdminUsername;
                existingAdmin.fullName = adminFullName;
                existingAdmin.email = normalizedAdminEmail;
                existingAdmin.password = adminPassword;
                existingAdmin.role = "Admin";
                existingAdmin.isActive = true;
                existingAdmin.isApproved = true;
                await existingAdmin.save();

                console.log("Default Admin synced from environment:");
                console.log("   Username:", existingAdmin.userName);
                console.log("   Email:", existingAdmin.email);
            }
        }

        if (!DEFAULT_STOREKEEPER_EMAIL || !DEFAULT_STOREKEEPER_PASSWORD) {
            console.log("Default storekeeper seeding skipped. Set DEFAULT_STOREKEEPER_EMAIL and DEFAULT_STOREKEEPER_PASSWORD to enable it.");
            return;
        }

        if (DEFAULT_STOREKEEPER_PASSWORD.length < 6) {
            console.warn("Default storekeeper seeding skipped. DEFAULT_STOREKEEPER_PASSWORD must be at least 6 characters.");
            return;
        }

        const existingStorekeeper = await User.findOne({ email: DEFAULT_STOREKEEPER_EMAIL.toLowerCase() });

        if (!existingStorekeeper) {
            const storekeeperUsername = DEFAULT_STOREKEEPER_USERNAME || DEFAULT_STOREKEEPER_EMAIL.split("@")[0];
            const storekeeperUser = await User.create({
                userName: storekeeperUsername,
                fullName: DEFAULT_STOREKEEPER_FULLNAME || "Default Storekeeper",
                email: DEFAULT_STOREKEEPER_EMAIL.toLowerCase(),
                password: DEFAULT_STOREKEEPER_PASSWORD,
                role: "Storekeeper",
                isActive: true,
            });

            console.log("Default Storekeeper created:");
            console.log("   Email:", storekeeperUser.email);
        } else {
            console.log("Storekeeper already exists. Leaving account unchanged:", existingStorekeeper.email);
        }
    } catch (error) {
        console.error("Error creating default users:", error);
    }
};
