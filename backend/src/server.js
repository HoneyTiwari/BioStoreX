import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const { default: connectDB } = await import("./db/index.js");
const { app } = await import("./app.js");
const { createDefaultAdmin } = await import("./utils/createDefaultAdmin.js");
const { verifyEmailConfig } = await import("./services/email.service.js");
const { startInventoryAlertScheduler } = await import("./services/notification.service.js");

const PORT = process.env.PORT || 8000;

connectDB()
    .then(async () => {
        console.log("✓ Database connected");


        await createDefaultAdmin();
        await verifyEmailConfig();
        startInventoryAlertScheduler();

        app.listen(PORT, () => {
            console.log("Server is running on port " + PORT);
        });
    })
    .catch((error) => {
        console.log("MongoDB connection failed with app:", error);
    });
