import asyncHandler from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Item } from "../models/item.model.js";
import { Request } from "../models/request.model.js";
import { IssueLog } from "../models/issue-log.model.js";
import { StockLog } from "../models/stock-log.model.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const getReportsOverview = asyncHandler(async (req, res) => {
    const now = Date.now();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [items, requests, issueLogs, stockLogs] = await Promise.all([
        Item.find().select("name displayName category unitType totalQuantity minThreshold batches").lean(),
        Request.find().populate("item", "name displayName category unitType").populate("user", "fullName userName").lean(),
        IssueLog.find().populate("item", "name displayName category unitType").populate("issuedTo", "fullName userName").populate("issuedBy", "fullName userName").sort({ createdAt: -1 }).lean(),
        StockLog.find().populate("item", "name displayName category unitType").populate("performedBy", "fullName userName").sort({ createdAt: -1 }).lean(),
    ]);

    const lowStock = items.filter((item) => item.totalQuantity <= (item.minThreshold ?? 5));
    const expiryRisk = items.flatMap((item) =>
        (item.batches || [])
            .map((batch) => ({
                itemId: item._id,
                itemName: item.displayName || item.name,
                category: item.category,
                batchNo: batch.batchNo,
                quantity: batch.quantity,
                expiryDate: batch.expiryDate,
                daysUntilExpiry: batch.expiryDate ? Math.ceil((new Date(batch.expiryDate).getTime() - now) / DAY_MS) : null,
            }))
            .filter((batch) => batch.daysUntilExpiry !== null && batch.daysUntilExpiry <= 90)
    ).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    const monthlyIssued = issueLogs
        .filter((log) => log.quantity > 0 && new Date(log.createdAt) >= monthStart)
        .reduce((sum, log) => sum + log.quantity, 0);

    const issuedReturned = issueLogs.map((log) => ({
        _id: log._id,
        itemName: log.item?.displayName || log.item?.name || "Deleted item",
        category: log.item?.category,
        quantity: log.quantity,
        type: log.quantity < 0 ? "RETURNED" : "ISSUED",
        user: log.issuedTo,
        performedBy: log.issuedBy,
        note: log.note,
        createdAt: log.createdAt,
    }));

    const monthlyUsage = Object.values(issueLogs.filter((log) => log.quantity > 0).reduce((acc, log) => {
        const key = `${new Date(log.createdAt).getFullYear()}-${String(new Date(log.createdAt).getMonth() + 1).padStart(2, "0")}`;
        acc[key] ||= { month: key, issuedQuantity: 0, issueCount: 0 };
        acc[key].issuedQuantity += log.quantity;
        acc[key].issueCount += 1;
        return acc;
    }, {})).sort((a, b) => a.month.localeCompare(b.month));

    return res.status(200).json(new ApiResponse(200, {
        generatedAt: new Date().toISOString(),
        summary: {
            totalItems: items.length,
            totalStock: items.reduce((sum, item) => sum + Number(item.totalQuantity || 0), 0),
            lowStockCount: lowStock.length,
            expiryRiskCount: expiryRisk.length,
            totalRequests: requests.length,
            monthlyIssued,
        },
        inventory: items,
        lowStock,
        expiryRisk,
        issuedReturned,
        monthlyUsage,
        stockLogs,
        requests,
    }, "Reports generated"));
});

export { getReportsOverview };

