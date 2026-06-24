import { useState } from "react";
import toast from "react-hot-toast";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import Select from "../ui/Select.jsx";
import { itemService } from "../../services/itemService.js";
import { getErrorMessage } from "../../services/apiClient.js";
import { formatDate } from "../../utils/format.js";

export default function RemoveStockModal({ item, open, onClose, onSuccess }) {
    const [quantity, setQuantity] = useState("");
    const [batchNo, setBatchNo] = useState("");
    const [note, setNote] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (!item) return null;

    const displayName = item.displayName || item.name;
    const selectedBatch = item.batches?.find((b) => b.batchNo === batchNo);
    const max = batchNo ? selectedBatch?.quantity ?? 0 : item.totalQuantity;

    const reset = () => {
        setQuantity("");
        setBatchNo("");
        setNote("");
        setError("");
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numeric = Number(quantity);

        if (!quantity || Number.isNaN(numeric) || numeric <= 0) {
            setError("Enter a quantity greater than 0");
            return;
        }
        if (numeric > max) {
            setError(`Only ${max} ${item.unitType} available${batchNo ? ` in batch "${batchNo}"` : ""}`);
            return;
        }

        setSubmitting(true);
        try {
            await itemService.removeStock({
                itemId: item._id,
                quantity: numeric,
                batchNo: batchNo || undefined,
                note: note || undefined,
            });
            toast.success(`Removed ${numeric} ${item.unitType} of ${displayName}`);
            onSuccess?.();
            handleClose();
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't remove stock."));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={handleClose} title={`Remove stock — ${displayName}`} size="sm">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                    label="Batch (optional — FIFO if left blank)"
                    value={batchNo}
                    onChange={(e) => {
                        setBatchNo(e.target.value);
                        setError("");
                    }}
                >
                    <option value="">All batches (oldest first)</option>
                    {item.batches?.map((b) => (
                        <option key={b.batchNo} value={b.batchNo}>
                            {b.batchNo} — {b.quantity} {item.unitType}
                            {b.expiryDate ? ` (exp. ${formatDate(b.expiryDate)})` : ""}
                        </option>
                    ))}
                </Select>

                <Input
                    label={`Quantity to remove (${item.unitType})`}
                    type="number"
                    min={1}
                    max={max}
                    value={quantity}
                    onChange={(e) => {
                        setQuantity(e.target.value);
                        setError("");
                    }}
                    error={error}
                    hint={`${max} ${item.unitType} available${batchNo ? " in this batch" : " in total"}`}
                    required
                    autoFocus
                />

                <Input
                    label="Note (optional)"
                    placeholder="e.g. Damaged, spilled, disposed"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />

                <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="danger" loading={submitting}>
                        Remove stock
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
