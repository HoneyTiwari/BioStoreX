
import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
    user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    item: { type: mongoose.Types.ObjectId, ref: "Item", required: true },
    quantityRequested: { type: Number, required: true, min: 1 },
    quantityApproved: { type: Number, min: 0 }, 
    status: { 
        type: String,
        enum: ["PENDING", "APPROVED", "DECLINED", "ISSUED", "RETURNED"],
        default: "PENDING"
    },
    approvedBy: { type: mongoose.Types.ObjectId, ref: "User" },
    issuedAt: { type: Date },
    declineReason: { type: String },
    quantityReturned: { type: Number, min: 0 },
    returnedAt: { type: Date },
    returnProcessedBy: { type: mongoose.Types.ObjectId, ref: "User" }
}, { timestamps: true });


export const Request = mongoose.model("Request", requestSchema);

