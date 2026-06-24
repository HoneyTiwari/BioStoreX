import { Router } from "express";
import { 
    requestItem, 
    approveRequest,
    declineRequest,
    issueItem,
    getMyRequests,
    getAllRequests,
    returnItem 
} from "../controllers/request.controller.js";

import verifyJWT from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authRoles.middleware.js";

const router = Router();

router.post(
    "/request-item",
    verifyJWT,
    authorizeRoles("Student"),
    requestItem
);

router.get(
    "/my-requests",
    verifyJWT,
    authorizeRoles("Student"),
    getMyRequests
);




router.get(
    "/all-requests",
    verifyJWT,
    authorizeRoles("Storekeeper", "Admin"),
    getAllRequests
);

router.put(
    "/approve/:id",
    verifyJWT,
    authorizeRoles("Storekeeper"),
    approveRequest
);

router.put(
    "/decline/:id",
    verifyJWT,
    authorizeRoles("Storekeeper"),
    declineRequest
);

router.put(
    "/issue/:id",
    verifyJWT,
    authorizeRoles("Storekeeper"),
    issueItem
);

router.put(
    "/return/:id",
    verifyJWT,
    authorizeRoles("Storekeeper"),
    returnItem
);


export default router;
