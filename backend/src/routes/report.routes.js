import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authRoles.middleware.js";
import { getReportsOverview } from "../controllers/report.controller.js";

const router = Router();

router.get("/overview", verifyJWT, authorizeRoles("Storekeeper", "Admin"), getReportsOverview);

export default router;

