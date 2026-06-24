import { Router } from "express";
import {
    addStorekeeper,
    blacklistUser,
    unBlacklistUser,
    getAllUsers,
    getPendingStudents,
    approveStudent,
    rejectStudent,
} from "../controllers/admin.controller.js";
import { authorizeRoles } from "../middlewares/authRoles.middleware.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/add-storekeeper", verifyJWT, authorizeRoles("Admin"), addStorekeeper);

router.get("/users", verifyJWT, authorizeRoles("Admin"), getAllUsers);

router.patch("/blacklist/:userId", verifyJWT, authorizeRoles("Admin"), blacklistUser);

router.patch("/unblacklist/:userId", verifyJWT, authorizeRoles("Admin"), unBlacklistUser);

// Student approval — Storekeeper and Admin both review new registrations.
router.get("/pending-students", verifyJWT, authorizeRoles("Storekeeper", "Admin"), getPendingStudents);
router.patch("/approve-student/:userId", verifyJWT, authorizeRoles("Storekeeper", "Admin"), approveStudent);
router.delete("/reject-student/:userId", verifyJWT, authorizeRoles("Storekeeper", "Admin"), rejectStudent);

export default router;

