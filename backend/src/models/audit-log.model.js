import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
    action: { type: String, required: true, trim: true },
    actor: { type: mongoose.Types.ObjectId, ref: "User" },
    targetUser: { type: mongoose.Types.ObjectId, ref: "User" },
    targetModel: { type: String, trim: true },
    targetId: { type: mongoose.Types.ObjectId },
    message: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
}, { timestamps: true });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);

