import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173")
    .split(",")
    .map((origin) => origin.trim());

console.log("Allowed CORS origins:", allowedOrigins);

// Log incoming origin header for debugging CORS issues
app.use((req, res, next) => {
    console.log("Incoming request origin:", req.headers.origin, "path:", req.path);
    next();
});


app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));


app.use(cookieParser());

// Development shortcut: explicitly allow CORS headers and handle preflight
if (process.env.NODE_ENV !== "production") {
    app.use((req, res, next) => {
        const origin = req.headers.origin || "*";
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader(
            "Access-Control-Allow-Headers",
            "Origin, X-Requested-With, Content-Type, Accept, Authorization"
        );
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

        if (req.method === "OPTIONS") {
            return res.sendStatus(200);
        }

        next();
    });
}


const isLocalhostOrigin = (origin) => {
    try {
        if (!origin) return false;
        const url = new URL(origin);
        return url.hostname === "localhost" || url.hostname === "127.0.0.1";
    } catch (e) {
        return false;
    }
};

const corsOptions = {
    origin(origin, callback) {
        // During development, allow all origins to simplify local testing.
        if (process.env.NODE_ENV !== "production") {
            console.log("Development mode: allowing origin", origin);
            return callback(null, true);
        }

        if (!origin || allowedOrigins.includes(origin) || isLocalhostOrigin(origin)) {
            return callback(null, true);
        }

        console.warn("CORS blocked origin:", origin);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
};

app.use(cors(corsOptions));


import userRouter from "./routes/user.routes.js";
app.use("/api/v1/user", userRouter);


import requestRouter from "./routes/request.route.js";
app.use("/api/v1/request", requestRouter);


import itemRouter from "./routes/item.routes.js";
app.use("/api/v1/item", itemRouter);


import adminRoutes from "./routes/admin.routes.js";
app.use("/api/v1/admin", adminRoutes);


app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    if (process.env.NODE_ENV !== "production") {
        console.error("Error stack:", err.stack || err);
    }

    return res.status(statusCode).json({
        success: false,
        statusCode,
        message: err.message || "Internal server error",
        errors: err.errors || [],
        data: null,
    });
});


export { app };
