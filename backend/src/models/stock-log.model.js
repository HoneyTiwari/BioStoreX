
import mongoose from 'mongoose';

const stockLogSchema = new mongoose.Schema({
    item: { type: mongoose.Types.ObjectId, ref: "Item", required: true },
    type: { type: String, enum: ["ADD", "REMOVE"], required: true },
    quantity: { type: Number, required: true },
    performedBy: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    note: String
}, { timestamps: true });

stockLogSchema.index({ createdAt: -1 });
stockLogSchema.index({ item: 1, createdAt: -1 });
stockLogSchema.index({ performedBy: 1, createdAt: -1 });

export const StockLog = mongoose.model("StockLog", stockLogSchema);
