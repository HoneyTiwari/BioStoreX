import dotenv from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const { default: connectDB } = await import("./db/index.js");
const { getMissingCloudinaryConfigKeys, hasCloudinaryConfig } = await import("./config/cloudinary.js");
const { app } = await import("./app.js");
const { createDefaultAdmin } = await import("./utils/createDefaultAdmin.js");
const { verifyEmailConfig } = await import("./services/email.service.js");
const { startInventoryAlertScheduler } = await import("./services/notification.service.js");

const PORT = process.env.PORT || 8000;
const missingCloudinaryKeys = getMissingCloudinaryConfigKeys();

if (hasCloudinaryConfig()) {
    console.log("Cloudinary config detected");
} else {
    console.warn(`Cloudinary config missing: ${missingCloudinaryKeys.join(", ")}`);
}

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
