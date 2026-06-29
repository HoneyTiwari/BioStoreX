import { ApiError } from "../utils/ApiError.js";
import { normalizeUserRole } from "../models/user.model.js";

export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw new ApiError(401, "Unauthorized: No user found");
        }

        const userRole = normalizeUserRole(req.user.role);

        if (!allowedRoles.includes(userRole)) {
            throw new ApiError(
                403,
                `Access denied: '${req.user.role}' is not allowed to access this route`
            );
        }
        req.user.role = userRole;
        next();
    };
};
