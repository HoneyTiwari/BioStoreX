import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Item } from "../models/item.model.js";
import { Request as ItemRequest } from "../models/request.model.js";
import { IssueLog } from "../models/issue-log.model.js";
import {
    streamAssistantReply,
    generateAssistantReply,
    generateItemDescription,
    generateRestockInsights,
    generateJsonSummary,
    semanticItemSearch,
    isAiConfigured,
} from "../services/ai.service.js";

const MAX_HISTORY_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 1200;
const DAY_MS = 24 * 60 * 60 * 1000;
const AI_ANALYTICS_CACHE_TTL_MS = 60 * 1000;
const analyticsCache = new Map();

const getCachedAnalytics = (key) => {
    const cached = analyticsCache.get(key);
    if (!cached || Date.now() - cached.createdAt > AI_ANALYTICS_CACHE_TTL_MS) {
        analyticsCache.delete(key);
        return null;
    }
    return cached.data;
};

const setCachedAnalytics = (key, data) => {
    analyticsCache.set(key, { data, createdAt: Date.now() });
};

const getAiStatus = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, { configured: isAiConfigured() }, "AI status"));
});

const sanitizeMessages = (messages) => {
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new ApiError(400, "messages must be a non-empty array");
    }

    const sanitized = messages
        .slice(-MAX_HISTORY_MESSAGES)
        .filter((m) => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role))
        .map((m) => ({
            role: m.role,
            content: m.content.replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE_CHARS),
        }))
        .filter((m) => m.content);

    if (sanitized.length === 0) {
        throw new ApiError(400, "No valid messages provided");
    }

    return sanitized;
};

const buildChatContext = async (user) => {
    const [items, myRequests] = await Promise.all([
        Item.find().select("name displayName category unitType totalQuantity minThreshold batches").sort({ name: 1 }).limit(150).lean(),
        user.role === "Student"
            ? ItemRequest.find({ user: user._id }).populate("item", "name displayName").sort({ createdAt: -1 }).limit(12).lean()
            : Promise.resolve([]),
    ]);

    const now = Date.now();
    return JSON.stringify({
        currentUser: { fullName: user.fullName, role: user.role },
        inventory: items.map((i) => ({
            id: String(i._id),
            name: i.displayName || i.name,
            category: i.category,
            unitType: i.unitType,
            totalQuantity: i.totalQuantity,
            minThreshold: i.minThreshold,
            lowStock: i.totalQuantity <= (i.minThreshold ?? 5),
            batches: (i.batches || []).slice(0, 8).map((b) => ({
                batchNo: b.batchNo,
                quantity: b.quantity,
                expiryDate: b.expiryDate,
                expiresInDays: b.expiryDate ? Math.ceil((new Date(b.expiryDate).getTime() - now) / DAY_MS) : null,
            })),
        })),
        myRecentRequests: myRequests.map((r) => ({
            item: r.item?.displayName || r.item?.name || "Deleted item",
            quantityRequested: r.quantityRequested,
            status: r.status,
        })),
    });
};

const chatWithAssistant = asyncHandler(async (req, res) => {
    if (!isAiConfigured()) {
        throw new ApiError(503, "AI features are not configured on this server yet.");
    }

    const sanitized = sanitizeMessages(req.body.messages);
    const contextBlock = await buildChatContext(req.user);

    if (!req.body.stream) {
        const reply = await generateAssistantReply(sanitized, contextBlock);
        return res.status(200).json(new ApiResponse(200, { reply }, "AI reply generated"));
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    try {
        const stream = await streamAssistantReply(sanitized, contextBlock);

        for await (const chunk of stream) {
            const text = chunk.choices?.[0]?.delta?.content;
            if (text) {
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
    } catch (error) {
        res.write(`data: ${JSON.stringify({ error: error.message || "AI request failed" })}\n\n`);
        res.end();
    }
});

const describeItem = asyncHandler(async (req, res) => {
    if (!isAiConfigured()) {
        throw new ApiError(503, "AI features are not configured on this server yet.");
    }

    const { name, category, unitType } = req.body;
    if (!name || !category || !unitType) {
        throw new ApiError(400, "name, category, and unitType are required");
    }

    const description = await generateItemDescription({
        name: String(name).trim().slice(0, 120),
        category: String(category).trim().slice(0, 60),
        unitType: String(unitType).trim().slice(0, 30),
    });
    return res.status(200).json(new ApiResponse(200, { description }, "Description generated"));
});

const getUsageMaps = async (sinceDays = 90) => {
    const since = new Date(Date.now() - sinceDays * DAY_MS);
    const previousSince = new Date(Date.now() - sinceDays * 2 * DAY_MS);

    const [requests, issues, previousIssues] = await Promise.all([
        ItemRequest.find({ createdAt: { $gte: since } }).select("item quantityRequested status createdAt").lean(),
        IssueLog.find({ createdAt: { $gte: since }, quantity: { $gt: 0 } }).select("item quantity createdAt").lean(),
        IssueLog.find({ createdAt: { $gte: previousSince, $lt: since }, quantity: { $gt: 0 } }).select("item quantity createdAt").lean(),
    ]);

    return {
        requestsByItem: groupQuantity(requests, "quantityRequested"),
        issuesByItem: groupQuantity(issues, "quantity"),
        previousIssuesByItem: groupQuantity(previousIssues, "quantity"),
        requestCountByItem: groupCount(requests),
    };
};

const groupQuantity = (records, field) => {
    const map = new Map();
    for (const record of records) {
        const id = String(record.item);
        map.set(id, (map.get(id) || 0) + Number(record[field] || 0));
    }
    return map;
};

const groupCount = (records) => {
    const map = new Map();
    for (const record of records) {
        const id = String(record.item);
        map.set(id, (map.get(id) || 0) + 1);
    }
    return map;
};

const getInventoryInsights = asyncHandler(async (req, res) => {
    const cacheKey = `inventory-insights:${isAiConfigured()}`;
    const cached = getCachedAnalytics(cacheKey);
    if (cached) {
        return res.status(200).json(new ApiResponse(200, cached, "AI inventory insights generated"));
    }

    console.time("[ai:inventory-insights] compute");
    const items = await Item.find().select("name displayName category unitType totalQuantity minThreshold batches updatedAt").lean();
    const { requestsByItem, issuesByItem, requestCountByItem } = await getUsageMaps(90);

    const enriched = items.map((item) => {
        const id = String(item._id);
        const requested90d = requestsByItem.get(id) || 0;
        const issued90d = issuesByItem.get(id) || 0;
        const requestCount90d = requestCountByItem.get(id) || 0;
        const threshold = item.minThreshold ?? 5;
        const lowStock = item.totalQuantity <= threshold;
        const overstocked = item.totalQuantity > Math.max(threshold * 6, issued90d * 3, 30) && issued90d <= threshold;
        const unused = requested90d === 0 && issued90d === 0;

        return {
            itemId: id,
            name: item.displayName || item.name,
            category: item.category,
            unitType: item.unitType,
            totalQuantity: item.totalQuantity,
            minThreshold: threshold,
            requested90d,
            issued90d,
            requestCount90d,
            flags: {
                lowStock,
                overstocked,
                frequentlyRequested: requestCount90d >= 5 || requested90d >= Math.max(threshold * 2, 10),
                unused,
                hasExpiringBatch: (item.batches || []).some((b) => daysUntil(b.expiryDate) !== null && daysUntil(b.expiryDate) <= 90),
            },
            suggestion: buildInventorySuggestion({ item, threshold, requested90d, issued90d, requestCount90d, lowStock, overstocked, unused }),
        };
    });

    const data = {
        generatedAt: new Date().toISOString(),
        aiConfigured: isAiConfigured(),
        summary: {
            totalItems: items.length,
            lowStock: enriched.filter((i) => i.flags.lowStock).length,
            overstocked: enriched.filter((i) => i.flags.overstocked).length,
            frequentlyRequested: enriched.filter((i) => i.flags.frequentlyRequested).length,
            unused: enriched.filter((i) => i.flags.unused).length,
        },
        items: enriched.sort((a, b) => Number(b.flags.lowStock) - Number(a.flags.lowStock) || b.requested90d - a.requested90d),
    };

    if (isAiConfigured()) {
        data.ai = await safeJsonSummary({
            schemaDescription: "Schema: {\"executiveSummary\":\"short text\",\"topActions\":[{\"itemName\":\"string\",\"action\":\"string\",\"reason\":\"string\"}]}",
            payload: data,
        });
    }

    setCachedAnalytics(cacheKey, data);
    console.timeEnd("[ai:inventory-insights] compute");
    return res.status(200).json(new ApiResponse(200, data, "AI inventory insights generated"));
});

const getStockPrediction = asyncHandler(async (req, res) => {
    const cacheKey = `stock-prediction:${isAiConfigured()}`;
    const cached = getCachedAnalytics(cacheKey);
    if (cached) {
        return res.status(200).json(new ApiResponse(200, cached, "Stock prediction generated"));
    }

    console.time("[ai:stock-prediction] compute");
    const items = await Item.find().select("name displayName category unitType totalQuantity minThreshold").lean();
    const { issuesByItem, previousIssuesByItem, requestsByItem } = await getUsageMaps(30);

    const predictions = items.map((item) => {
        const id = String(item._id);
        const issued30d = issuesByItem.get(id) || 0;
        const previousIssued30d = previousIssuesByItem.get(id) || 0;
        const requested30d = requestsByItem.get(id) || 0;
        const dailyDemand = issued30d / 30;
        const daysUntilRunout = dailyDemand > 0 ? Math.floor(item.totalQuantity / dailyDemand) : null;
        const trendPercent = previousIssued30d > 0 ? Math.round(((issued30d - previousIssued30d) / previousIssued30d) * 100) : issued30d > 0 ? 100 : 0;
        const trend = trendPercent > 20 ? "Up" : trendPercent < -20 ? "Down" : "Stable";
        const riskLevel = getPredictionRisk({ item, requested30d, daysUntilRunout });

        return {
            itemId: id,
            name: item.displayName || item.name,
            category: item.category,
            unitType: item.unitType,
            currentStock: item.totalQuantity,
            minThreshold: item.minThreshold ?? 5,
            issued30d,
            requested30d,
            averageDailyDemand: Number(dailyDemand.toFixed(2)),
            estimatedDaysUntilRunout: daysUntilRunout,
            trend,
            trendPercent,
            riskLevel,
            recommendation: buildPredictionSuggestion({ riskLevel, daysUntilRunout, trend, item }),
        };
    });

    const data = {
        generatedAt: new Date().toISOString(),
        aiConfigured: isAiConfigured(),
        predictions: predictions.sort((a, b) => riskRank(b.riskLevel) - riskRank(a.riskLevel) || (a.estimatedDaysUntilRunout ?? 9999) - (b.estimatedDaysUntilRunout ?? 9999)),
    };

    if (isAiConfigured()) {
        data.ai = await safeJsonSummary({
            schemaDescription: "Schema: {\"overview\":\"short text\",\"urgentItems\":[{\"itemName\":\"string\",\"reason\":\"string\"}]}",
            payload: data,
        });
    }

    setCachedAnalytics(cacheKey, data);
    console.timeEnd("[ai:stock-prediction] compute");
    return res.status(200).json(new ApiResponse(200, data, "Stock prediction generated"));
});

const getExpiryRisk = asyncHandler(async (req, res) => {
    const cacheKey = `expiry-risk:${isAiConfigured()}`;
    const cached = getCachedAnalytics(cacheKey);
    if (cached) {
        return res.status(200).json(new ApiResponse(200, cached, "Expiry risk generated"));
    }

    console.time("[ai:expiry-risk] compute");
    const items = await Item.find().select("name displayName category unitType totalQuantity batches").lean();
    const risks = [];

    for (const item of items) {
        for (const batch of item.batches || []) {
            const days = daysUntil(batch.expiryDate);
            if (days === null || days > 90) continue;

            const riskCategory = days < 0 ? "Expired" : days <= 30 ? "High" : days <= 60 ? "Medium" : "Low";
            risks.push({
                itemId: String(item._id),
                itemName: item.displayName || item.name,
                category: item.category,
                unitType: item.unitType,
                batchNo: batch.batchNo,
                quantity: batch.quantity,
                expiryDate: batch.expiryDate,
                daysUntilExpiry: days,
                riskCategory,
                actionSuggestion: getExpirySuggestion(riskCategory),
            });
        }
    }

    const data = {
        generatedAt: new Date().toISOString(),
        aiConfigured: isAiConfigured(),
        windows: {
            expired: risks.filter((r) => r.riskCategory === "Expired").length,
            within30Days: risks.filter((r) => r.daysUntilExpiry >= 0 && r.daysUntilExpiry <= 30).length,
            within60Days: risks.filter((r) => r.daysUntilExpiry > 30 && r.daysUntilExpiry <= 60).length,
            within90Days: risks.filter((r) => r.daysUntilExpiry > 60 && r.daysUntilExpiry <= 90).length,
        },
        risks: risks.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry),
    };

    if (isAiConfigured()) {
        data.ai = await safeJsonSummary({
            schemaDescription: "Schema: {\"overview\":\"short text\",\"actions\":[{\"batchNo\":\"string\",\"action\":\"string\"}]}",
            payload: data,
        });
    }

    setCachedAnalytics(cacheKey, data);
    console.timeEnd("[ai:expiry-risk] compute");
    return res.status(200).json(new ApiResponse(200, data, "Expiry risk generated"));
});

const restockInsights = asyncHandler(async (req, res) => {
    if (!isAiConfigured()) {
        throw new ApiError(503, "AI features are not configured on this server yet.");
    }

    const items = await Item.find()
        .select("name displayName category totalQuantity minThreshold batches unitType")
        .lean();

    if (items.length === 0) {
        return res.status(200).json(new ApiResponse(200, { insights: "No inventory yet. Add stock to get AI restocking insights." }, "Insights generated"));
    }

    const insights = await generateRestockInsights(
        items.map((i) => ({
            name: i.displayName || i.name,
            category: i.category,
            unitType: i.unitType,
            totalQuantity: i.totalQuantity,
            minThreshold: i.minThreshold,
            batches: (i.batches || []).map((b) => ({ batchNo: b.batchNo, quantity: b.quantity, expiryDate: b.expiryDate })),
        }))
    );

    return res.status(200).json(new ApiResponse(200, { insights }, "Insights generated"));
});

const smartSearch = asyncHandler(async (req, res) => {
    if (!isAiConfigured()) {
        throw new ApiError(503, "AI features are not configured on this server yet.");
    }

    const q = String(req.query.q || "").trim().slice(0, 160);
    if (!q) {
        throw new ApiError(400, "Query parameter 'q' is required");
    }

    const items = await Item.find().select("name displayName category unitType totalQuantity").lean();
    if (items.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "No items in inventory"));
    }

    const ids = await semanticItemSearch(q, items);
    const ordered = ids
        .map((id) => items.find((i) => String(i._id) === String(id)))
        .filter(Boolean);

    if (ordered.length === 0) {
        const lower = q.toLowerCase();
        const fallback = items.filter((i) => (i.displayName || i.name).toLowerCase().includes(lower));
        return res.status(200).json(new ApiResponse(200, fallback, "Search results (fallback match)"));
    }

    return res.status(200).json(new ApiResponse(200, ordered, "Smart search results"));
});

const daysUntil = (date) => {
    if (!date) return null;
    const time = new Date(date).getTime();
    if (Number.isNaN(time)) return null;
    return Math.ceil((time - Date.now()) / DAY_MS);
};

const buildInventorySuggestion = ({ item, threshold, requested90d, issued90d, requestCount90d, lowStock, overstocked, unused }) => {
    if (lowStock) return "Reorder soon. Stock is at or below the minimum threshold.";
    if (overstocked) return "Reduce purchase. Stock is high compared with recent issue history.";
    if (unused) return "Review necessity. No requests or issues were found in the last 90 days.";
    if (requestCount90d >= 5 || requested90d >= Math.max(threshold * 2, 10)) return "Monitor closely. This item is frequently requested.";
    if ((item.batches || []).some((b) => daysUntil(b.expiryDate) !== null && daysUntil(b.expiryDate) <= 90)) return "Check expiry. One or more batches expire within 90 days.";
    if (issued90d > 0) return "Stock level looks healthy based on recent usage.";
    return "No immediate action needed.";
};

const getPredictionRisk = ({ item, requested30d, daysUntilRunout }) => {
    const threshold = item.minThreshold ?? 5;
    if (item.totalQuantity <= threshold || requested30d > item.totalQuantity || (daysUntilRunout !== null && daysUntilRunout <= 14)) return "High";
    if (daysUntilRunout !== null && daysUntilRunout <= 45) return "Medium";
    if (item.totalQuantity <= threshold * 2) return "Medium";
    return "Low";
};

const buildPredictionSuggestion = ({ riskLevel, daysUntilRunout, trend, item }) => {
    if (riskLevel === "High") return `Reorder immediately${daysUntilRunout !== null ? `; estimated runout in ${daysUntilRunout} days` : ""}.`;
    if (riskLevel === "Medium") return `Plan purchase soon. Demand trend is ${trend.toLowerCase()}.`;
    if ((item.minThreshold ?? 5) * 6 < item.totalQuantity && trend === "Down") return "Avoid extra purchase until demand increases.";
    return "Maintain normal monitoring.";
};

const getExpirySuggestion = (riskCategory) => {
    if (riskCategory === "Expired") return "Remove from usable stock and follow disposal protocol.";
    if (riskCategory === "High") return "Prioritize issue/use, verify storage condition, or plan replacement.";
    if (riskCategory === "Medium") return "Schedule usage before newer batches and monitor weekly.";
    return "Monitor monthly and avoid over-purchasing this item.";
};

const riskRank = (risk) => ({ Low: 1, Medium: 2, High: 3 }[risk] || 0);

const safeJsonSummary = async (args) => {
    try {
        return await generateJsonSummary(args);
    } catch (error) {
        return { warning: error.message || "AI summary unavailable" };
    }
};

export {
    getAiStatus,
    chatWithAssistant,
    describeItem,
    restockInsights,
    smartSearch,
    getInventoryInsights,
    getStockPrediction,
    getExpiryRisk,
};
