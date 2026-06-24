import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
    batchNo: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date },
}, { _id: false });

const itemSchema = new mongoose.Schema({
    // Lowercase, trimmed — used as the dedup/lookup key so "Ethanol" and
    // "ethanol" merge into the same item.
    name: { type: String, required: true, trim: true, lowercase: true },
    // Preserves the casing the storekeeper actually typed, for display.
    displayName: { type: String, trim: true },
    category: { 
        type: String,
        required: true,
        enum: ["CHEMICAL", "GLASSWARE", "CONSUMABLE", "BIO_MATERIAL", "EQUIPMENT"]
    },
    unitType: { 
        type: String,
        required: true,
        enum: ["g", "mg", "kg", "mL", "L", "pieces", "box", "pack"]
    },
    image: {
        url: String,
        publicId: String
    },
    batches: [batchSchema],
    totalQuantity: { type: Number, default: 0, min: 0 },
    minThreshold: { type: Number, default: 5, min: 0 },
    sku: { type: String, unique: true },
}, { timestamps: true });

// Fall back to `name` if displayName was never set (e.g. legacy documents).
itemSchema.pre("save", function (next) {
    if (!this.displayName) {
        this.displayName = this.name;
    }
    next();
});


export const Item = mongoose.model("Item", itemSchema);