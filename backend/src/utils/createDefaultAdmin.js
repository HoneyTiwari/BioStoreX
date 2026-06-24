import { User } from "../models/user.model.js";

export const createDefaultAdmin = async () => {
    try {
        const {
            DEFAULT_ADMIN_EMAIL,
            DEFAULT_ADMIN_PASSWORD,
            DEFAULT_ADMIN_USERNAME = "admin",
            DEFAULT_ADMIN_FULLNAME = "System Administrator",
            DEFAULT_STOREKEEPER_EMAIL,
            DEFAULT_STOREKEEPER_PASSWORD,
            DEFAULT_STOREKEEPER_USERNAME,
            DEFAULT_STOREKEEPER_FULLNAME,
        } = process.env;

        if (!DEFAULT_ADMIN_EMAIL || !DEFAULT_ADMIN_PASSWORD) {
            console.log("Default admin seeding skipped. Set DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD to enable it.");
        } else if (DEFAULT_ADMIN_PASSWORD.length < 6) {
            console.warn("Default admin seeding skipped. DEFAULT_ADMIN_PASSWORD must be at least 6 characters.");
        } else {
            const existingAdmin = await User.findOne({ role: "Admin" });

            if (!existingAdmin) {
                const adminUser = await User.create({
                    userName: DEFAULT_ADMIN_USERNAME,
                    fullName: DEFAULT_ADMIN_FULLNAME,
                    email: DEFAULT_ADMIN_EMAIL.toLowerCase(),
                    password: DEFAULT_ADMIN_PASSWORD,
                    role: "Admin",
                    isActive: true,
                });

                console.log("Default Admin created:");
                console.log("   Email:", adminUser.email);
            } else {
                console.log("Admin already exists:", existingAdmin.email);
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
