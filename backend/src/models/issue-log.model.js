import mongoose from 'mongoose';

const issueLogSchema = new mongoose.Schema({
    item: { type: mongoose.Types.ObjectId, ref: "Item", required: true },
    issuedTo: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    quantity: { type: Number, required: true },
    issuedBy: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    // Negative quantity entries represent returns; `note` captures context
    // (e.g. "Item returned", damage notes, etc).
    note: { type: String },
}, { timestamps: true });

issueLogSchema.index({ createdAt: -1 });
issueLogSchema.index({ item: 1, createdAt: -1 });
issueLogSchema.index({ issuedTo: 1, createdAt: -1 });

export const IssueLog = mongoose.model("IssueLog", issueLogSchema);
