import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import multer from "multer";

const app = express();

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
// A single source of truth for allowed origins. Previously the app combined
// the `cors` package with a hand-rolled middleware that *also* set CORS
// headers and short-circuited OPTIONS requests in development — the two
// layers fought each other and made CORS issues harder to debug, not
// easier. We now rely solely on the `cors` package.
const defaultOrigins = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173";
const deployedOrigins = "https://bio-store-x.vercel.app";

const allowedOrigins = [
    defaultOrigins,
    deployedOrigins,
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
]
    .filter(Boolean)
    .flatMap((originList) => originList.split(","))
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const isLocalhostOrigin = (origin) => {
    try {
        if (!origin) return false;
        const url = new URL(origin);
        return url.hostname === "localhost" || url.hostname === "127.0.0.1";
    } catch {
        return false;
    }
};

const corsOptions = {
    origin(origin, callback) {
        // No origin (e.g. curl, server-to-server, mobile apps) is allowed.
        if (!origin || allowedOrigins.includes(origin) || isLocalhostOrigin(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
};

app.use(cors(corsOptions));

// ---------------------------------------------------------------------------
// Security & parsing middleware
// ---------------------------------------------------------------------------
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.use("/api", (req, res, next) => {
    const label = `[api] ${req.method} ${req.originalUrl} ${Date.now()}`;
    console.time(label);
    res.on("finish", () => {
        console.timeEnd(label);
    });
    next();
});

// Basic rate limiting to slow down brute-force / abuse on auth & AI routes.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, statusCode: 429, message: "Too many attempts. Please try again later.", data: null },
});

const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, statusCode: 429, message: "Too many AI requests. Please slow down.", data: null },
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
import userRouter from "./routes/user.routes.js";
import requestRouter from "./routes/request.route.js";
import itemRouter from "./routes/item.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import reportRoutes from "./routes/report.routes.js";
import activityRoutes from "./routes/activity.routes.js";

app.use("/api/v1/user/login", authLimiter);
app.use("/api/v1/user/register", authLimiter);
app.use("/api/v1/user/forgot-password", authLimiter);
app.use("/api/v1/user/reset-password", authLimiter);
app.use("/api/v1/ai", aiLimiter);
app.use("/api/ai", aiLimiter);

app.use("/api/v1/user", userRouter);
app.use("/api/v1/request", requestRouter);
app.use("/api/v1/item", itemRouter);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/activity", activityRoutes);

// Health check — useful for uptime monitors / load balancers.
app.get("/api/v1/health", (req, res) => {
    res.status(200).json({ success: true, statusCode: 200, message: "OK", data: { uptime: process.uptime() } });
});

app.get("/api/health", (req, res) => {
    res.status(200).json({ success: true, statusCode: 200, message: "OK", data: { uptime: process.uptime() } });
});

// 404 handler for unmatched API routes.
app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        data: null,
    });
});

// ---------------------------------------------------------------------------
// Centralized error handler
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (err instanceof multer.MulterError || /Only JPG, JPEG, PNG, WEBP, and GIF|Only JPEG, PNG, WEBP, and GIF/.test(err.message || "")) {
        const message = err.code === "LIMIT_FILE_SIZE"
            ? "Image must be 5 MB or smaller"
            : err.message;

        return res.status(400).json({
            success: false,
            statusCode: 400,
            message,
            data: null,
        });
    }

    const statusCode = err.statusCode && err.statusCode >= 100 ? err.statusCode : 500;

    if (process.env.NODE_ENV !== "production") {
        console.error(err.stack || err);
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
