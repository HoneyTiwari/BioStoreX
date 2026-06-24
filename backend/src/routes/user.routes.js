import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import { registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    updateUserProfile,
    forgotPassword,
    resetPassword,
    getCurrentUser
} from "../controllers/user.controller.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshAccessToken);

router.get("/me", verifyJWT, getCurrentUser);
router.post("/logout", verifyJWT, logoutUser);
router.patch("/change-password", verifyJWT, changePassword);
router.patch("/update-profile", verifyJWT, updateUserProfile);

export default router;