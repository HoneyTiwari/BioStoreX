import { AuditLog } from "../models/audit-log.model.js";

export const logAudit = async ({ req, action, targetUser, targetModel, targetId, message, metadata }) => {
    try {
        await AuditLog.create({
            action,
            actor: req?.user?._id,
            targetUser,
            targetModel,
            targetId,
            message,
            metadata,
            ipAddress: req?.ip,
        });
    } catch (error) {
        console.error("Audit log write failed:", error.message);
    }
};

