import { Router } from "express";
import { addStock, getAllItems, getItemById, removeStock, searchItems } from "../controllers/item.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authRoles.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.get(
    "/all",
    verifyJWT,
    getAllItems
);

// Must be declared before "/:id" so the literal "search" segment isn't
// swallowed by the dynamic id route.
router.get(
    "/search",
    verifyJWT,
    searchItems
);

router.post(
    "/add-stock",
    verifyJWT,
    authorizeRoles("Storekeeper"),
    upload.single("image"),
    addStock
);

router.post(
    "/remove-stock",
    verifyJWT,
    authorizeRoles("Storekeeper"),
    removeStock
);

router.get(
    "/:id",
    verifyJWT,
    getItemById
);

export default router;
