import mongoose from 'mongoose';
import jsonwebtoken from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    userName: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true 
    },

    fullName: { type: String, required: true, trim: true },

    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "Invalid email format"]
    },

    password: { 
        type: String, 
        required: true, 
        minlength: [6, "Password must be at least 6 characters"] 
    },

    role: { 
        type: String,
        enum: ["Student", "Storekeeper", "Admin"],
        default: "Student"
    },

    isActive: { type: Boolean, default: true },

    student: {
        registrationNo: { type: String },
        year: { type: Number, min: 1, max: 6 }
    },

    refreshToken: { type: String },
    passwordResetOtp: { type: String },
    passwordResetOtpExpires: { type: Date }

}, { timestamps: true });


userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 11);
});




userSchema.methods.isPasswordCorrect = async function (password) {
    return bcrypt.compare(password, this.password);
};



userSchema.methods.generateAccessToken = function () {
    return jsonwebtoken.sign(
        { _id: this._id, userName: this.userName, role: this.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};



userSchema.methods.generateRefreshToken = async function () {
    const refreshToken = jsonwebtoken.sign(
        { _id: this._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );

    this.refreshToken = refreshToken;
    await this.save({ validateBeforeSave: false }); 
    return refreshToken;
};


export const User = mongoose.model("User", userSchema);