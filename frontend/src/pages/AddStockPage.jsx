import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CalendarClock, PackagePlus, ShieldCheck, Sparkles, UploadCloud, X } from "lucide-react";
import { usePageHeader } from "../hooks/usePageHeader.js";
import { useAiStatus } from "../hooks/useAiStatus.js";
import Card from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Select from "../components/ui/Select.jsx";
import Button from "../components/ui/Button.jsx";
import { CATEGORY_META, UNIT_TYPES } from "../utils/navConfig.js";
import { itemService } from "../services/itemService.js";
import { aiService } from "../services/aiService.js";
import { getErrorMessage } from "../services/apiClient.js";

const initialForm = {
    name: "",
    category: "",
    unitType: "",
    quantity: "",
    batchNo: "",
    expiryDate: "",
    minThreshold: "",
    description: "",
};

export default function AddStockPage() {
    usePageHeader({ title: "Add Stock", subtitle: "Create a batch, set thresholds, and keep inventory audit-ready" });
    const { available: aiAvailable } = useAiStatus();
    const navigate = useNavigate();

    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [generatingDescription, setGeneratingDescription] = useState(false);

    const updateField = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const clearImage = () => {
        setImageFile(null);
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
    };

    const handleGenerateDescription = async () => {
        if (!form.name.trim() || !form.category || !form.unitType) {
            toast.error("Fill in name, category, and unit first");
            return;
        }
        setGeneratingDescription(true);
        try {
            const { data } = await aiService.describeItem({
                name: form.name.trim(),
                category: form.category,
                unitType: form.unitType,
            });
            setForm((prev) => ({ ...prev, description: data.data.description }));
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't generate a description."));
        } finally {
            setGeneratingDescription(false);
        }
    };

    const validate = () => {
        const next = {};
        if (!form.name.trim()) next.name = "Item name is required";
        if (!form.category) next.category = "Choose a category";
        if (!form.unitType) next.unitType = "Choose a unit";
        if (!form.quantity || Number(form.quantity) <= 0) next.quantity = "Enter a positive quantity";
        if (!form.batchNo.trim()) next.batchNo = "Batch number is required";
        if (form.minThreshold && Number(form.minThreshold) < 0) next.minThreshold = "Can't be negative";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("name", form.name.trim());
            formData.append("category", form.category);
            formData.append("unitType", form.unitType);
            formData.append("quantity", form.quantity);
            formData.append("batchNo", form.batchNo.trim());
            if (form.expiryDate) formData.append("expiryDate", form.expiryDate);
            if (form.minThreshold) formData.append("minThreshold", form.minThreshold);
            if (imageFile) formData.append("image", imageFile);

            await itemService.addStock(formData);
            toast.success(`${form.name} added to inventory`);
            navigate("/inventory");
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't add stock."));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1fr_22rem]">
            <Card className="overflow-hidden">
                <div className="border-b border-ink-200/70 bg-white/45 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-2xl bg-ink-950 text-white shadow-card">
                            <PackagePlus className="size-5" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-ink-950">Stock entry workflow</h2>
                            <p className="text-sm text-ink-500">Add a new item or append a unique batch to an existing item.</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 p-6">
                    <section className="space-y-4">
                        <SectionTitle step="01" title="Item identity" />
                        <Input label="Item name" placeholder="e.g. Ethanol, Petri dish, Centrifuge tube" value={form.name} onChange={updateField("name")} error={errors.name} required autoFocus />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Select label="Category" value={form.category} onChange={updateField("category")} error={errors.category} required>
                                <option value="">Select...</option>
                                {Object.entries(CATEGORY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
                            </Select>
                            <Select label="Unit" value={form.unitType} onChange={updateField("unitType")} error={errors.unitType} required>
                                <option value="">Select...</option>
                                {UNIT_TYPES.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                            </Select>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <SectionTitle step="02" title="Batch and threshold" />
                        <div className="rounded-2xl border border-glove-400/20 bg-glove-500/10 p-4 text-sm text-glove-700">
                            Batch numbers should be unique per item. Expiry dates power the 30/60/90 day risk reports and AI dashboard.
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input label="Quantity" type="number" min={1} value={form.quantity} onChange={updateField("quantity")} error={errors.quantity} required />
                            <Input label="Batch number" placeholder="e.g. LOT-2026-014" value={form.batchNo} onChange={updateField("batchNo")} error={errors.batchNo} required />
                            <Input label="Expiry date" type="date" value={form.expiryDate} onChange={updateField("expiryDate")} hint="Recommended for chemicals and bio-materials." />
                            <Input label="Low-stock threshold" type="number" min={0} placeholder="Default: 5" value={form.minThreshold} onChange={updateField("minThreshold")} error={errors.minThreshold} />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <SectionTitle step="03" title="Media and notes" />
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-3">
                                <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">Description</label>
                                {aiAvailable && (
                                    <button type="button" onClick={handleGenerateDescription} disabled={generatingDescription} className="flex items-center gap-1 rounded-full bg-iodine-500/10 px-3 py-1 text-xs font-semibold text-iodine-700 disabled:opacity-50">
                                        <Sparkles className="size-3.5" />
                                        {generatingDescription ? "Generating..." : "Generate with AI"}
                                    </button>
                                )}
                            </div>
                            <textarea rows={4} value={form.description} onChange={updateField("description")} placeholder="Short note about usage, storage, or safety context." className="w-full rounded-2xl border border-ink-200 bg-white/80 px-3 py-2 text-sm text-ink-900 shadow-sm placeholder:text-ink-400 transition-all focus:border-glove-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-glove-400/10" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">Item image</label>
                            {imagePreview ? (
                                <div className="relative w-fit">
                                    <img src={imagePreview} alt="Preview" className="size-28 rounded-2xl border border-ink-200 object-cover shadow-card" />
                                    <button type="button" onClick={clearImage} className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-ink-950 text-white shadow-card" aria-label="Remove image">
                                        <X className="size-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-ink-300 bg-white/60 px-4 py-6 text-center text-sm text-ink-500 transition-colors hover:bg-white">
                                    <UploadCloud className="size-6 text-glove-500" />
                                    <span className="font-semibold text-ink-800">Upload item image</span>
                                    <span>JPEG, PNG, WEBP, or GIF under 5MB</span>
                                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
                                </label>
                            )}
                        </div>
                    </section>

                    <div className="flex justify-end gap-2 border-t border-ink-200/70 pt-5">
                        <Button type="button" variant="outline" onClick={() => navigate("/inventory")} disabled={submitting}>Cancel</Button>
                        <Button type="submit" loading={submitting}>Add to inventory</Button>
                    </div>
                </form>
            </Card>

            <aside className="space-y-4">
                <Card className="p-5">
                    <div className="flex items-center gap-2 text-ink-950">
                        <ShieldCheck className="size-4 text-glove-500" />
                        <h2 className="font-semibold">Quality checklist</h2>
                    </div>
                    <div className="mt-4 space-y-3 text-sm text-ink-600">
                        <ChecklistItem title="Unique batch" text="Use supplier lot numbers or internal batch IDs." />
                        <ChecklistItem title="Expiry-aware" text="Dates feed expiry reports and AI risk analysis." />
                        <ChecklistItem title="Threshold-ready" text="Set reorder thresholds based on usage speed." />
                        <ChecklistItem title="Audit trail" text="Every add-stock action creates a stock log." />
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-2 text-ink-950">
                        <CalendarClock className="size-4 text-iodine-500" />
                        <h2 className="font-semibold">Expiry guidance</h2>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ink-600">
                        For chemicals and biological materials, add expiry dates consistently so the 30/60/90 day reports are accurate during demos.
                    </p>
                </Card>
            </aside>
        </div>
    );
}

function SectionTitle({ step, title }) {
    return (
        <div className="flex items-center gap-3">
            <span className="rounded-full bg-ink-950 px-2.5 py-1 font-mono text-xs font-semibold text-white">{step}</span>
            <h3 className="font-semibold text-ink-950">{title}</h3>
        </div>
    );
}

function ChecklistItem({ title, text }) {
    return (
        <div className="rounded-2xl bg-white/70 p-3">
            <p className="font-semibold text-ink-900">{title}</p>
            <p className="mt-1 text-xs leading-5 text-ink-500">{text}</p>
        </div>
    );
}
