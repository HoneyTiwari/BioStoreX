import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import { createDefaultAdmin } from "./utils/createDefaultAdmin.js";
import { verifyEmailConfig } from "./utils/mailer.js";

dotenv.config({ path: "./.env" });

const PORT = process.env.PORT || 8000;

connectDB()
    .then(async () => {
        console.log("✓ Database connected");


        await createDefaultAdmin();
        await verifyEmailConfig();

        app.listen(PORT, () => {
            console.log("Server is running on port " + PORT);
        });
    })
    .catch((error) => {
        console.log("MongoDB connection failed with app:", error);
    });
