import asyncHandler from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { StockLog } from "../models/stock-log.model.js";
import { IssueLog } from "../models/issue-log.model.js";
import { AuditLog } from "../models/audit-log.model.js";

const getActivityLogs = asyncHandler(async (req, res) => {
    const [stockLogs, issueLogs, auditLogs] = await Promise.all([
        StockLog.find().populate("item", "name displayName category unitType").populate("performedBy", "fullName userName role").sort({ createdAt: -1 }).limit(200).lean(),
        IssueLog.find().populate("item", "name displayName category unitType").populate("issuedTo", "fullName userName role").populate("issuedBy", "fullName userName role").sort({ createdAt: -1 }).limit(200).lean(),
        AuditLog.find().populate("actor", "fullName userName role").populate("targetUser", "fullName userName role").sort({ createdAt: -1 }).limit(200).lean(),
    ]);

    const activities = [
        ...stockLogs.map((log) => ({
            _id: `stock-${log._id}`,
            source: "StockLog",
            type: log.type === "ADD" ? "STOCK_ADDED" : "STOCK_REMOVED",
            title: `${log.type === "ADD" ? "Added" : "Removed"} ${log.quantity} ${log.item?.unitType || "units"}`,
            itemName: log.item?.displayName || log.item?.name || "Deleted item",
            actor: log.performedBy,
            note: log.note,
            createdAt: log.createdAt,
        })),
        ...issueLogs.map((log) => ({
            _id: `issue-${log._id}`,
            source: "IssueLog",
            type: log.quantity < 0 ? "ITEM_RETURNED" : "ITEM_ISSUED",
            title: `${log.quantity < 0 ? "Returned" : "Issued"} ${Math.abs(log.quantity)} ${log.item?.unitType || "units"}`,
            itemName: log.item?.displayName || log.item?.name || "Deleted item",
            actor: log.issuedBy,
            targetUser: log.issuedTo,
            note: log.note,
            createdAt: log.createdAt,
        })),
        ...auditLogs.map((log) => ({
            _id: `audit-${log._id}`,
            source: "AuditLog",
            type: log.action,
            title: log.message || log.action,
            actor: log.actor,
            targetUser: log.targetUser,
            metadata: log.metadata,
            createdAt: log.createdAt,
        })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json(new ApiResponse(200, {
        stockLogs,
        issueLogs,
        auditLogs,
        activities,
    }, "Activity logs fetched"));
});

export { getActivityLogs };

