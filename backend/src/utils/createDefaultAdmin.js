import { User } from "../models/user.model.js";

export const createDefaultAdmin = async () => {
    try {
        const existingAdmin = await User.findOne({ role: "Admin" });

        if (!existingAdmin) {
            const adminUser = await User.create({
                userName: "admin",
                fullName: "System Administrator",
                email: "admin@biostorex.com",
                password: "Admin@123", 
                role: "Admin",
                isActive: true
            });

            console.log("✓ Default Admin created:");
            console.log("   Email:", adminUser.email);
            console.log("   Password: Admin@123");
        } else {
            console.log("✓ Admin already exists:", existingAdmin.email);
        }

        const storekeeperEmail = "honeytiwari11304@gmail.com";
        const existingStorekeeper = await User.findOne({ email: storekeeperEmail });

        if (!existingStorekeeper) {
            const storekeeperUser = await User.create({
                userName: "honeytiwari11304",
                fullName: "Honey Tiwari",
                email: storekeeperEmail,
                password: "Mnnit89",
                role: "Storekeeper",
                isActive: true
            });

            console.log("✓ Default Storekeeper created:");
            console.log("   Email:", storekeeperUser.email);
            console.log("   Password: Mnnit89");
        } else {
            existingStorekeeper.fullName = "Honey Tiwari";
            existingStorekeeper.password = "Mnnit89";
            existingStorekeeper.role = "Storekeeper";
            existingStorekeeper.isActive = true;
            await existingStorekeeper.save();
            console.log("✓ Storekeeper already existed, role/password updated:", existingStorekeeper.email);
            console.log("   Password: Mnnit89");
        }

    } catch (error) {
        console.error("Error creating default users:", error);
    }
};
