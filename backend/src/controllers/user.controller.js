import asyncHandler from "../utils/asyncHandler.js";
import bcrypt from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { sendEmail } from "../services/email.service.js";

const failedLoginAttempts = new Map();
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

const assertStrongPassword = (password, label = "Password") => {
    if (!password || password.length < 8) {
        throw new ApiError(400, `${label} must be at least 8 characters`);
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        throw new ApiError(400, `${label} must include uppercase, lowercase, number, and special character`);
    }
};

const getLoginKey = ({ email, userName, req }) => `${(email || userName || "unknown").toLowerCase()}:${req.ip}`;

const assertNotLocked = (key) => {
    const record = failedLoginAttempts.get(key);
    if (!record) return;
    if (Date.now() > record.lockedUntil) {
        failedLoginAttempts.delete(key);
        return;
    }
    throw new ApiError(429, "Too many failed login attempts. Please try again later.");
};

const recordLoginFailure = (key) => {
    const current = failedLoginAttempts.get(key) || { count: 0, lockedUntil: 0 };
    const next = {
        count: current.count + 1,
        lockedUntil: current.count + 1 >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCK_WINDOW_MS : current.lockedUntil,
    };
    failedLoginAttempts.set(key, next);
};

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();  // FIXED

        return { accessToken, refreshToken };
    }
    catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
};

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
};



const registerUser = asyncHandler(async (req, res) => {
    const { userName, fullName, email, password, student } = req.body;

    if ([userName, fullName, email, password].some((f) => !f || f.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        throw new ApiError(400, "Please provide a valid email address");
    }

    assertStrongPassword(password);

    if (req.body.role && req.body.role !== "Student") {
        throw new ApiError(403, "Only students can register using this route");
    }

    const existedUser = await User.findOne({
        $or: [
            { userName: userName.toLowerCase() },
            { email: email.toLowerCase() }
        ]
    });

    if (existedUser) {
        throw new ApiError(409, "User with this email or username already exists");
    }

    const user = await User.create({
        userName: userName.toLowerCase(),
        fullName,
        email: email.toLowerCase(),
        password,
        role: "Student",
        student: student || {}
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    return res.status(201).json(
        new ApiResponse(
            201,
            createdUser,
            "Registration submitted. A storekeeper or admin needs to approve your account before you can log in."
        )
    );
});




const loginUser = asyncHandler(async (req, res) => {
    const { userName, email, password } = req.body;

    if (!userName && !email) {
        throw new ApiError(400, "Email or username is required");
    }

    const loginKey = getLoginKey({ email, userName, req });
    assertNotLocked(loginKey);

    const user = await User.findOne({
        $or: [
            { userName: userName?.toLowerCase() },
            { email: email?.toLowerCase() }
        ]
    });

    if (!user) {
        recordLoginFailure(loginKey);
        throw new ApiError(401, "Invalid credentials");
    }

    const isValidPassword = await user.isPasswordCorrect(password);
    if (!isValidPassword) {
        recordLoginFailure(loginKey);
        throw new ApiError(401, "Invalid credentials");
    }
    failedLoginAttempts.delete(loginKey);

    if (!user.isActive) {
        throw new ApiError(403, "User account is deactivated");
    }

    if (!user.isApproved) {
        throw new ApiError(403, "Your account is pending approval from a storekeeper or admin. Please check back soon.");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .cookie("accessToken", accessToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                { accessToken, user: loggedInUser },
                "User logged in successfully"
            )
        );
});





const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { refreshToken: undefined },
        { new: true }
    );

    return res
        .status(200)
        .clearCookie("refreshToken", cookieOptions)
        .clearCookie("accessToken", cookieOptions)
        .json(
            new ApiResponse(
                200,
                {},
                "User logged out successfully"
            )
        );
});


const refreshAccessToken = asyncHandler(async (req, res) => {
    const inRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!inRefreshToken) {
        throw new ApiError(401, "Unauthorized: No refresh token provided");
    }

    let decodedToken;
    try {
        decodedToken = jsonwebtoken.verify(inRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            throw new ApiError(401, "Session expired. Please log in again.");
        }
        throw new ApiError(401, "Unauthorized: Invalid refresh token");
    }

    const user = await User.findById(decodedToken._id);

    if (!user) {
        throw new ApiError(401, "Unauthorized: User not found");
    }

    if (user.refreshToken !== inRefreshToken) {
        throw new ApiError(401, "Unauthorized: Invalid refresh token");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    return res.status(200)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(
        new ApiResponse(
            200,
            { accessToken },
            "Access token refreshed successfully"
        )
    );
});

const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        throw new ApiError(400, "Current password and new password are required");
    }
    const user = await User.findById(req.user._id);
    
    const isValidPassword = await user.isPasswordCorrect(currentPassword);
    if (!isValidPassword) {
        throw new ApiError(401, "Invalid current password");
    }
    
    assertStrongPassword(newPassword, "New password");

    user.password = newPassword;
    await user.save();

    // Never return the user document here — it contains the (hashed) password.
    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Password changed successfully"
        )
    );
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always respond with the same generic message whether or not the
    // account exists — returning 404 here would let an attacker enumerate
    // registered emails.
    const genericMessage = `If an account exists for ${email}, a password reset OTP has been sent.`;

    if (!user) {
        return res.status(200).json(new ApiResponse(200, {}, genericMessage));
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.passwordResetOtp = await bcrypt.hash(otp, 11);
    user.passwordResetOtpExpires = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const subject = "BioStoreX password reset OTP";
    const text = `Your BioStoreX OTP is ${otp}. It expires in 15 minutes.`;
    const html = `<p>Your BioStoreX password reset code is <strong>${otp}</strong>.</p><p>It expires in 15 minutes.</p>`;

    try {
        await sendEmail({ to: user.email, subject, text, html });
    } catch (err) {
        console.error("Failed to send reset email:", err.message);
        if (process.env.NODE_ENV !== "production") {
            console.log("Development password reset OTP:", otp);
            return res.status(200).json(
                new ApiResponse(
                    200,
                    { devOtp: otp, emailSent: false },
                    `${genericMessage} Email delivery failed, so the development reset code is shown in the app.`
                )
            );
        }
        // In production, don't reveal email-sending failures to the client.
    }

    return res.status(200).json(new ApiResponse(200, { emailSent: true }, genericMessage));
});

const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        throw new ApiError(400, "Email, OTP, and new password are required");
    }

    assertStrongPassword(newPassword, "New password");

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordResetOtp || !user.passwordResetOtpExpires) {
        throw new ApiError(400, "Invalid or expired OTP");
    }

    if (user.passwordResetOtpExpires < Date.now()) {
        user.passwordResetOtp = undefined;
        user.passwordResetOtpExpires = undefined;
        await user.save({ validateBeforeSave: false });
        throw new ApiError(400, "OTP has expired. Please request a new one.");
    }

    const isOtpValid = await bcrypt.compare(otp, user.passwordResetOtp);
    if (!isOtpValid) {
        throw new ApiError(400, "Invalid OTP");
    }

    user.password = newPassword;
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpires = undefined;
    await user.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Password updated successfully"
        )
    );
});

const updateUserProfile = asyncHandler(async (req, res) => {
    const { userName, fullName } = req.body;

    if (!userName && !fullName) {
        throw new ApiError(400, "At least one field is required");
    }

    // Only check for a username collision when a username was actually
    // provided — previously `userName: undefined` was still passed to the
    // query, which matches any document missing that field entirely.
    if (userName) {
        const alreadyExists = await User.findOne({
            userName: userName.toLowerCase(),
            _id: { $ne: req.user._id },
        });

        if (alreadyExists) {
            throw new ApiError(409, "Username is already taken");
        }
    }

    const user = await User.findById(req.user._id);

    if (userName) user.userName = userName.toLowerCase();
    if (fullName) user.fullName = fullName;

    await user.save();

    const updatedUser = await User.findById(req.user._id).select("-password -refreshToken");

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            updatedUser,
            "User profile updated successfully"
        )
    );
});

/**
 * Returns the currently authenticated user. Used by the frontend on app
 * load / page refresh to restore session state.
 */
const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, req.user, "Current user fetched successfully")
    );
});

export { registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    updateUserProfile,
    forgotPassword,
    resetPassword,
    getCurrentUser
};
