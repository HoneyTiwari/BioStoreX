import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authRoles.middleware.js";
import {
    getAiStatus,
    chatWithAssistant,
    describeItem,
    restockInsights,
    smartSearch,
    getInventoryInsights,
    getStockPrediction,
    getExpiryRisk,
} from "../controllers/ai.controller.js";

const router = Router();

// Public-ish (still requires login) status check so the frontend can decide
// whether to render AI affordances at all.
router.get("/status", verifyJWT, getAiStatus);

// Available to every authenticated role — the assistant scopes its own
// context based on req.user.role.
router.post("/chat", verifyJWT, chatWithAssistant);

router.get("/smart-search", verifyJWT, smartSearch);
router.get("/inventory-insights", verifyJWT, authorizeRoles("Storekeeper", "Admin"), getInventoryInsights);
router.get("/stock-prediction", verifyJWT, authorizeRoles("Storekeeper", "Admin"), getStockPrediction);
router.get("/expiry-risk", verifyJWT, authorizeRoles("Storekeeper", "Admin"), getExpiryRisk);

// Storekeeper + Admin: speeds up data entry and surfaces restocking concerns.
router.post("/describe-item", verifyJWT, authorizeRoles("Storekeeper"), describeItem);
router.get("/restock-insights", verifyJWT, authorizeRoles("Storekeeper", "Admin"), restockInsights);

export default router;
