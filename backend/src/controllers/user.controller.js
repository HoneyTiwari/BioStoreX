import asyncHandler from "../utils/asyncHandler.js";
import bcrypt from "bcrypt";
import jsonwebtoken from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { sendEmail } from "../utils/mailer.js";

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
        new ApiResponse(201, createdUser, "Student registered successfully")
    );
});




const loginUser = asyncHandler(async (req, res) => {
    const { userName, email, password } = req.body;

    if (!userName && !email) {
        throw new ApiError(400, "Email or username is required");
    }

    const user = await User.findOne({
        $or: [
            { userName: userName?.toLowerCase() },
            { email: email?.toLowerCase() }
        ]
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isValidPassword = await user.isPasswordCorrect(password);
    if (!isValidPassword) {
        throw new ApiError(401, "Invalid password");
    }

    if (!user.isActive) {
        throw new ApiError(403, "User account is deactivated");
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
                { accessToken, refreshToken, user: loggedInUser },
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

    const decodedToken = jsonwebtoken.verify(inRefreshToken, process.env.REFRESH_TOKEN_SECRET);

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
            { accessToken, refreshToken },
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
    
    user.password = newPassword;
    await user.save();
    
    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user,
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

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.passwordResetOtp = await bcrypt.hash(otp, 11);
    user.passwordResetOtpExpires = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const subject = "BioStoreX password reset OTP";
    const text = `Your BioStoreX OTP is ${otp}. It expires in 15 minutes.`;
    const html = `<p>Your BioStoreX password reset code is <strong>${otp}</strong>.</p><p>It expires in 15 minutes.</p>`;

    await sendEmail({ to: user.email, subject, text, html });

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            `OTP sent to ${user.email}. Check your email to continue.`
        )
    );
});

const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        throw new ApiError(400, "Email, OTP, and new password are required");
    }

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

    const alreadyExists = await User.findOne({
        userName: userName?.toLowerCase(),
        _id: { $ne: req.user._id }
    });

    if (alreadyExists) {
        throw new ApiError(409, "Username is already taken");
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

export { registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    updateUserProfile,
    forgotPassword,
    resetPassword
};
