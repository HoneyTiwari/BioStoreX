import { Item } from "../models/item.model.js";
import { StockLog } from "../models/stock-log.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { cloudinary } from "../config/cloudinary.js";
import { notifyInventoryAlerts } from "../services/notification.service.js";

/**
 * Fetch all items, newest-first dedup key but alphabetically sorted by
 * display name for the UI.
 */
const getAllItems = asyncHandler(async (req, res) => {
    console.time("[items:getAll] query");
    const items = await Item.find()
        .select("name displayName category unitType image batches totalQuantity minThreshold sku updatedAt")
        .sort({ name: 1 })
        .lean();
    console.timeEnd("[items:getAll] query");
    return res.status(200).json(new ApiResponse(200, items, "Items fetched successfully"));
});

const getItemById = asyncHandler(async (req, res) => {
    const item = await Item.findById(req.params.id);
    if (!item) throw new ApiError(404, "Item not found");
    return res.status(200).json(new ApiResponse(200, item, "Item fetched successfully"));
});

/**
 * Simple text search across name/category, used by the frontend's
 * AI-assisted search bar as a fast local pre-filter (the AI layer can
 * further re-rank/explain results on top of this).
 */
const searchItems = asyncHandler(async (req, res) => {
    const { q = "", category } = req.query;

    const filter = {};
    if (q.trim()) {
        filter.name = { $regex: q.trim(), $options: "i" };
    }
    if (category) {
        filter.category = category;
    }

    const items = await Item.find(filter)
        .select("name displayName category unitType image batches totalQuantity minThreshold sku updatedAt")
        .sort({ name: 1 })
        .limit(50)
        .lean();
    return res.status(200).json(new ApiResponse(200, items, "Search results fetched"));
});

const addStock = asyncHandler(async (req, res) => {
    const { name, category, unitType, quantity, batchNo, expiryDate, minThreshold } = req.body;

    if (!name || !category || !unitType || !quantity || !batchNo) {
        throw new ApiError(400, "Name, category, unit, quantity, and batch number are all required");
    }

    const numericQuantity = Number(quantity);
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
        throw new ApiError(400, "Quantity must be a positive number");
    }

    if (expiryDate && Number.isNaN(new Date(expiryDate).getTime())) {
        throw new ApiError(400, "Expiry date is invalid");
    }

    let imageUrl = null;
    if (req.file) {
        console.log("[items:addStock] Using uploaded Cloudinary image", {
            publicId: req.file.filename,
            url: req.file.path,
        });

        imageUrl = { url: req.file.path, publicId: req.file.filename };
    } else {
        console.log("[items:addStock] Creating item without image upload");
    }

    // `name` is normalized to lowercase as a dedup/lookup key so that
    // "Ethanol" and "ethanol" merge into a single item with two batches.
    // `displayName` preserves what the storekeeper actually typed so the
    // UI doesn't force everything to lowercase.
    const normalizedName = name.trim().toLowerCase();
    let item = await Item.findOne({ name: normalizedName });

    const batchData = {
        batchNo: batchNo.trim(),
        quantity: numericQuantity,
        expiryDate: expiryDate || null,
    };

    if (!item) {
        item = await Item.create({
            name: normalizedName,
            displayName: name.trim(),
            category,
            unitType,
            batches: [batchData],
            totalQuantity: numericQuantity,
            minThreshold: minThreshold ? Number(minThreshold) : undefined,
            image: imageUrl,
            sku: `SKU-${Date.now().toString(36).toUpperCase()}`,
        });
    } else {
        // Prevent duplicate batch numbers on the same item.
        const duplicateBatch = item.batches.find((b) => b.batchNo === batchData.batchNo);
        if (duplicateBatch) {
            throw new ApiError(409, `Batch "${batchData.batchNo}" already exists for this item. Use a unique batch number.`);
        }

        item.batches.push(batchData);
        item.totalQuantity += numericQuantity;
        if (imageUrl) item.image = imageUrl;
        await item.save();
    }

    await StockLog.create({
        item: item._id,
        type: "ADD",
        quantity: numericQuantity,
        performedBy: req.user._id,
        note: `Added batch ${batchData.batchNo}${expiryDate ? ` (Expiry: ${new Date(expiryDate).toLocaleDateString()})` : ""}`,
    });
    await notifyInventoryAlerts(item);

    return res.status(201).json(new ApiResponse(201, item, "Stock added successfully"));
});

const removeStock = asyncHandler(async (req, res) => {
    const { itemId, quantity, batchNo, note } = req.body;

    if (!itemId || !quantity) {
        throw new ApiError(400, "Item ID and quantity are required");
    }

    const numericQuantity = Number(quantity);
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
        throw new ApiError(400, "Quantity must be a positive number");
    }

    const item = await Item.findById(itemId);
    if (!item) {
        throw new ApiError(404, "Item not found");
    }

    let qtyToRemove = numericQuantity;

    if (batchNo) {
        const batch = item.batches.find((b) => b.batchNo === batchNo);
        if (!batch) {
            throw new ApiError(404, `Batch "${batchNo}" not found`);
        }
        if (batch.quantity < qtyToRemove) {
            throw new ApiError(400, `Insufficient stock in batch "${batchNo}" (only ${batch.quantity} available)`);
        }
        batch.quantity -= qtyToRemove;
    } else {
        if (item.totalQuantity < qtyToRemove) {
            throw new ApiError(400, `Insufficient total stock (only ${item.totalQuantity} available)`);
        }
        // FIFO: drain the oldest batches first.
        for (const batch of item.batches) {
            if (qtyToRemove <= 0) break;
            if (batch.quantity >= qtyToRemove) {
                batch.quantity -= qtyToRemove;
                qtyToRemove = 0;
            } else {
                qtyToRemove -= batch.quantity;
                batch.quantity = 0;
            }
        }
    }

    item.totalQuantity -= numericQuantity;
    // Drop any batches that are now fully depleted to keep the array tidy.
    item.batches = item.batches.filter((b) => b.quantity > 0);

    await StockLog.create({
        item: item._id,
        type: "REMOVE",
        quantity: numericQuantity,
        performedBy: req.user._id,
        note: note?.trim() || `Removed ${numericQuantity} units${batchNo ? ` from batch "${batchNo}"` : ""}`,
    });

    if (item.totalQuantity <= 0) {
        await notifyInventoryAlerts(item);

        if (item.image?.publicId) {
            await cloudinary.uploader.destroy(item.image.publicId).catch(() => null);
        }
        await Item.findByIdAndDelete(item._id);

        return res.status(200).json(
            new ApiResponse(200, { deleted: true, itemId }, "Stock removed and item deleted as stock reached 0")
        );
    }

    await item.save();
    await notifyInventoryAlerts(item);
    return res.status(200).json(new ApiResponse(200, item, "Stock removed successfully"));
});

export { getAllItems, getItemById, addStock, removeStock, searchItems };
