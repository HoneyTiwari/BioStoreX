import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authRoles.middleware.js";
import { getActivityLogs } from "../controllers/activity.controller.js";

const router = Router();

router.get("/logs", verifyJWT, authorizeRoles("Storekeeper", "Admin"), getActivityLogs);

export default router;

