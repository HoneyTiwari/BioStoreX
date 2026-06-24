import { useState } from "react";
import toast from "react-hot-toast";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import { requestService } from "../../services/requestService.js";
import { getErrorMessage } from "../../services/apiClient.js";

export default function RequestItemModal({ item, open, onClose, onSuccess }) {
    const [quantity, setQuantity] = useState(1);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (!item) return null;

    const displayName = item.displayName || item.name;
    const max = item.totalQuantity;

    const validate = () => {
        const numeric = Number(quantity);
        if (!quantity || Number.isNaN(numeric)) return "Enter a quantity";
        if (numeric <= 0) return "Quantity must be greater than 0";
        if (numeric > max) return `Only ${max} ${item.unitType} available`;
        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSubmitting(true);
        try {
            await requestService.create({ itemId: item._id, quantity: Number(quantity) });
            toast.success(`Request for ${displayName} submitted`);
            onSuccess?.();
            onClose();
            setQuantity(1);
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't submit your request."));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title={`Request ${displayName}`} size="sm">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-ink-500">
                    <span className="font-mono">{max}</span> {item.unitType} currently available across{" "}
                    {item.batches?.length || 0} batch{item.batches?.length === 1 ? "" : "es"}.
                </p>

                <Input
                    label={`Quantity (${item.unitType})`}
                    type="number"
                    min={1}
                    max={max}
                    value={quantity}
                    onChange={(e) => {
                        setQuantity(e.target.value);
                        setError("");
                    }}
                    error={error}
                    required
                    autoFocus
                />

                <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={submitting}>
                        Submit request
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
