import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import jsonwebtoken from "jsonwebtoken";

/**
 * Verifies the JWT access token (from the Authorization header or cookie),
 * loads the user, and attaches it to req.user.
 *
 * NOTE: This previously wrapped everything in a try/catch that swallowed
 * the original error and always responded with a generic "Invalid or
 * expired token" message — even for things like "User is inactive" or
 * unexpected DB errors. We now let specific ApiErrors propagate, and only
 * translate genuine JWT failures (expired/invalid signature) into a 401.
 */
const verifyJWT = asyncHandler(async (req, res, next) => {
    let token = null;

    if (req.headers.authorization?.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token && req.cookies?.accessToken) {
        token = req.cookies.accessToken;
    }

    if (!token) {
        throw new ApiError(401, "Unauthorized: No token provided");
    }

    let decoded;
    try {
        decoded = jsonwebtoken.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            throw new ApiError(401, "Session expired. Please log in again.");
        }
        throw new ApiError(401, "Unauthorized: Invalid token");
    }

    const user = await User.findById(decoded._id).select("-password -refreshToken");

    if (!user) {
        throw new ApiError(401, "Unauthorized: User not found");
    }

    if (!user.isActive) {
        throw new ApiError(403, "Your account has been deactivated. Contact an administrator.");
    }

    if (!user.isApproved) {
        throw new ApiError(403, "Your account is pending approval from a storekeeper or admin.");
    }

    req.user = user;
    next();
});

export default verifyJWT;
