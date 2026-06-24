import { Request } from "../models/request.model.js";
import { IssueLog } from "../models/issue-log.model.js";
import { Item } from "../models/item.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const requestItem = asyncHandler(async (req, res) => {
    const { itemId, quantity } = req.body;

    if (!itemId || !quantity) {
        throw new ApiError(400, "Item ID and quantity are required");
    }

    const numericQuantity = Number(quantity);
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
        throw new ApiError(400, "Quantity must be a positive number");
    }

    const item = await Item.findById(itemId);
    if (!item) throw new ApiError(404, "Item not found");

    if (numericQuantity > item.totalQuantity) {
        throw new ApiError(400, `Only ${item.totalQuantity} ${item.unitType} of "${item.displayName || item.name}" available`);
    }

    const existing = await Request.findOne({ user: req.user._id, item: itemId, status: "PENDING" });
    if (existing) {
        throw new ApiError(400, "You already have a pending request for this item");
    }

    const request = await Request.create({
        user: req.user._id,
        item: itemId,
        quantityRequested: numericQuantity,
        status: "PENDING",
    });

    const populated = await request.populate("item", "name displayName category unitType totalQuantity");

    return res.status(201).json(new ApiResponse(201, populated, "Request submitted successfully"));
});

const approveRequest = asyncHandler(async (req, res) => {
    const { id: requestId } = req.params;

    const request = await Request.findById(requestId).populate("item");
    if (!request) throw new ApiError(404, "Request not found");

    if (request.status !== "PENDING") {
        throw new ApiError(400, "Request is already processed");
    }

    if (request.quantityRequested > request.item.totalQuantity) {
        throw new ApiError(400, "Not enough stock available to approve this request");
    }

    request.status = "APPROVED";
    request.quantityApproved = request.quantityRequested;
    request.approvedBy = req.user._id;
    await request.save();

    return res.status(200).json(new ApiResponse(200, request, "Request approved successfully"));
});

const declineRequest = asyncHandler(async (req, res) => {
    const { id: requestId } = req.params;
    const { reason } = req.body;

    const request = await Request.findById(requestId);
    if (!request) throw new ApiError(404, "Request not found");

    if (request.status !== "PENDING") {
        throw new ApiError(400, "Request is already processed");
    }

    request.status = "DECLINED";
    request.declineReason = reason?.trim() || "No reason provided";
    request.approvedBy = req.user._id;
    await request.save();

    return res.status(200).json(new ApiResponse(200, request, "Request declined"));
});

const issueItem = asyncHandler(async (req, res) => {
    const { id: requestId } = req.params;

    const request = await Request.findById(requestId).populate("item user");
    if (!request) throw new ApiError(404, "Request not found");

    if (request.status !== "APPROVED") {
        throw new ApiError(400, "Request must be approved before issuing");
    }

    const qty = request.quantityApproved;
    const item = await Item.findById(request.item._id);
    if (!item) throw new ApiError(404, "Item no longer exists");

    if (item.totalQuantity < qty) {
        throw new ApiError(400, "Insufficient stock to issue this request");
    }

    // FIFO deduction across batches.
    let remaining = qty;
    for (const batch of item.batches) {
        if (remaining <= 0) break;
        if (batch.quantity >= remaining) {
            batch.quantity -= remaining;
            remaining = 0;
        } else {
            remaining -= batch.quantity;
            batch.quantity = 0;
        }
    }

    item.totalQuantity -= qty;
    item.batches = item.batches.filter((b) => b.quantity > 0);
    await item.save();

    request.status = "ISSUED";
    request.issuedAt = new Date();
    await request.save();

    await IssueLog.create({
        item: item._id,
        issuedTo: request.user._id,
        quantity: qty,
        issuedBy: req.user._id,
    });

    return res.status(200).json(new ApiResponse(200, request, "Item issued successfully"));
});

const getAllRequests = asyncHandler(async (req, res) => {
    const requests = await Request.find()
        // Fixed: schema field is `userName` (capital N), not `username` —
        // the typo meant the storekeeper UI never received the requester's
        // username.
        .populate("user", "fullName userName email role")
        .populate("item", "name displayName category unitType totalQuantity")
        .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, requests, "All requests fetched successfully"));
});

const getMyRequests = asyncHandler(async (req, res) => {
    const requests = await Request.find({ user: req.user._id })
        .populate("item", "name displayName category unitType totalQuantity")
        .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, requests, "Your requests fetched successfully"));
});

const returnItem = asyncHandler(async (req, res) => {
    const { id: requestId } = req.params;
    const { quantity, note } = req.body;

    if (!quantity) {
        throw new ApiError(400, "Quantity is required");
    }

    const numericQuantity = Number(quantity);
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
        throw new ApiError(400, "Quantity must be a positive number");
    }

    const request = await Request.findById(requestId).populate("item user");
    if (!request) throw new ApiError(404, "Request not found");

    if (request.status !== "ISSUED") {
        throw new ApiError(400, "Item must be issued before it can be returned");
    }

    if (numericQuantity > request.quantityApproved) {
        throw new ApiError(400, "Return quantity exceeds issued quantity");
    }

    const item = await Item.findById(request.item._id);
    if (!item) {
        throw new ApiError(404, "Item not found");
    }

    // Restore quantity back into the most recent batch (or create a
    // synthetic "RETURNED" batch if every original batch was removed).
    if (item.batches.length > 0) {
        item.batches[0].quantity += numericQuantity;
    } else {
        item.batches.push({ batchNo: `RETURNED-${Date.now()}`, quantity: numericQuantity, expiryDate: null });
    }

    item.totalQuantity += numericQuantity;
    await item.save();

    request.status = "RETURNED";
    request.returnedAt = new Date();
    request.quantityReturned = numericQuantity;
    request.returnProcessedBy = req.user._id;
    await request.save();

    await IssueLog.create({
        item: item._id,
        issuedTo: request.user._id,
        quantity: -Math.abs(numericQuantity),
        issuedBy: req.user._id,
        note: note?.trim() || "Item returned",
    });

    return res.status(200).json(new ApiResponse(200, request, "Item returned successfully"));
});

export {
    requestItem,
    approveRequest,
    declineRequest,
    issueItem,
    getAllRequests,
    getMyRequests,
    returnItem,
};
