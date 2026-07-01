import { User, normalizeUserRole } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { logAudit } from "../utils/audit.js";
import { notifyStudentApproved, notifyStudentRejected } from "../services/notification.service.js";

const isStrongPassword = (password) =>
    typeof password === "string" &&
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

/**
 * Create a new Storekeeper account. Admin-only.
 */
const addStorekeeper = asyncHandler(async (req, res) => {
    const { userName, fullName, email, password } = req.body;

    if (!userName || !fullName || !email || !password) {
        throw new ApiError(400, "All fields are required");
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        throw new ApiError(400, "Please provide a valid email address");
    }

    if (!isStrongPassword(password)) {
        throw new ApiError(400, "Password must be at least 8 characters and include uppercase, lowercase, number, and special character");
    }

    const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { userName: userName.toLowerCase() }],
    });
    if (existingUser) {
        throw new ApiError(409, "A user with this email or username already exists");
    }

    const storekeeper = await User.create({
        userName: userName.toLowerCase(),
        fullName,
        email: email.toLowerCase(),
        password,
        role: "Storekeeper",
        // NOTE: the User schema tracks active/inactive via `isActive`, not
        // `isBlacklisted` (that field never existed on the schema and was
        // silently dropped by Mongoose). Default isActive: true is implicit.
    });

    // Never return the raw document — strip password & refreshToken.
    const createdStorekeeper = await User.findById(storekeeper._id).select("-password -refreshToken");
    await logAudit({
        req,
        action: "STOREKEEPER_CREATED",
        targetUser: storekeeper._id,
        message: `Created storekeeper account for ${storekeeper.fullName}`,
    });

    return res.status(201).json(
        new ApiResponse(201, createdStorekeeper, "Storekeeper created successfully")
    );
});

/**
 * Deactivate ("blacklist") a user account. Admin-only.
 */
const blacklistUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    if (normalizeUserRole(user.role) === "Admin") {
        throw new ApiError(400, "Admin accounts cannot be blacklisted");
    }

    user.isActive = false;
    await user.save({ validateBeforeSave: false });

    const safeUser = await User.findById(user._id).select("-password -refreshToken");
    await logAudit({
        req,
        action: "USER_DEACTIVATED",
        targetUser: user._id,
        message: `Deactivated ${user.fullName}`,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, safeUser, "User blacklisted successfully"));
});

/**
 * Reactivate a previously blacklisted user account. Admin-only.
 */
const unBlacklistUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    user.isActive = true;
    await user.save({ validateBeforeSave: false });

    const safeUser = await User.findById(user._id).select("-password -refreshToken");
    await logAudit({
        req,
        action: "USER_REACTIVATED",
        targetUser: user._id,
        message: `Reactivated ${user.fullName}`,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, safeUser, "User un-blacklisted successfully"));
});

/**
 * List all users (for the admin dashboard user management table).
 */
const getAllUsers = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const q = String(req.query.q || "").trim();
    const filter = q
        ? {
            $or: [
                { fullName: { $regex: q, $options: "i" } },
                { userName: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } },
                { role: { $regex: q, $options: "i" } },
            ],
        }
        : {};

    console.time("[admin:getAllUsers] query");
    const [users, total] = await Promise.all([
        User.find(filter)
            .select("fullName userName email role isActive isApproved createdAt")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        User.countDocuments(filter),
    ]);
    console.timeEnd("[admin:getAllUsers] query");

    return res.status(200).json(
        new ApiResponse(200, {
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        }, "Users fetched successfully")
    );
});

/**
 * List students awaiting approval. Storekeeper + Admin.
 */
const getPendingStudents = asyncHandler(async (req, res) => {
    if (req.query.count === "true") {
        const count = await User.countDocuments({ role: "Student", isApproved: false });
        return res.status(200).json(
            new ApiResponse(200, { count }, "Pending student count fetched successfully")
        );
    }

    const pending = await User.find({ role: "Student", isApproved: false })
        .select("fullName userName email role isActive isApproved student createdAt")
        .sort({ createdAt: 1 }); // oldest first — first come, first reviewed

    return res.status(200).json(
        new ApiResponse(200, pending, "Pending students fetched successfully")
    );
});

/**
 * Approve a newly registered student, granting them login access.
 * Storekeeper + Admin.
 */
const approveStudent = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    if (normalizeUserRole(user.role) !== "Student") {
        throw new ApiError(400, "Only student accounts require approval");
    }

    if (user.isApproved) {
        throw new ApiError(400, "This student is already approved");
    }

    user.isApproved = true;
    await user.save({ validateBeforeSave: false });

    const safeUser = await User.findById(user._id).select("-password -refreshToken");
    await logAudit({
        req,
        action: "STUDENT_APPROVED",
        targetUser: user._id,
        message: `Approved student registration for ${user.fullName}`,
    });
    await notifyStudentApproved(user);

    return res
        .status(200)
        .json(new ApiResponse(200, safeUser, `${user.fullName} has been approved`));
});

/**
 * Reject (delete) a pending student registration. Storekeeper + Admin.
 * We delete rather than just leaving isApproved: false so the email/
 * username frees up for them to register again if this was a mistake.
 */
const rejectStudent = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    if (normalizeUserRole(user.role) !== "Student") {
        throw new ApiError(400, "Only pending student accounts can be rejected");
    }

    if (user.isApproved) {
        throw new ApiError(400, "This student is already approved — deactivate their account instead if needed");
    }

    await User.findByIdAndDelete(userId);
    await logAudit({
        req,
        action: "STUDENT_REJECTED",
        targetUser: user._id,
        message: `Rejected student registration for ${user.fullName}`,
    });
    await notifyStudentRejected(user);

    return res
        .status(200)
        .json(new ApiResponse(200, { userId }, "Registration rejected"));
});

export {
    addStorekeeper,
    blacklistUser,
    unBlacklistUser,
    getAllUsers,
    getPendingStudents,
    approveStudent,
    rejectStudent,
};
