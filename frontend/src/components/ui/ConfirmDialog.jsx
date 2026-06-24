import Modal from "./Modal.jsx";
import Button from "./Button.jsx";

/**
 * Simple confirm/cancel dialog. Controlled by the parent via `open`; the
 * parent owns the async action and passes `loading` while it's in flight.
 */
export default function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title = "Are you sure?",
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "danger",
    loading = false,
}) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        {cancelLabel}
                    </Button>
                    <Button variant={variant} onClick={onConfirm} loading={loading}>
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            {description && <p className="text-sm text-ink-600">{description}</p>}
        </Modal>
    );
}
