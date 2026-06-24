import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import clsx from "clsx";

/**
 * Lightweight accessible modal. Closes on Escape and backdrop click, and
 * locks body scroll while open. Not a full focus-trap implementation, but
 * covers the common cases (dialogs with a handful of focusable controls).
 */
export default function Modal({ open, onClose, title, children, size = "md", footer }) {
    const dialogRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        document.addEventListener("keydown", handleKeyDown);

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        // Move initial focus into the dialog for screen reader / keyboard users.
        dialogRef.current?.focus();

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, onClose]);

    if (!open) return null;

    const sizeClass = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" }[size];

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px] animate-fade-in-up"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className={clsx(
                    "relative w-full rounded-2xl bg-white shadow-popover animate-fade-in-up max-h-[90vh] flex flex-col",
                    sizeClass
                )}
            >
                <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
                    <h2 className="text-base font-semibold text-ink-900">{title}</h2>
                    <button
                        onClick={onClose}
                        aria-label="Close dialog"
                        className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800 transition-colors"
                    >
                        <X className="size-4" />
                    </button>
                </div>
                <div className="overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
                {footer && <div className="border-t border-ink-200 px-5 py-3 flex justify-end gap-2">{footer}</div>}
            </div>
        </div>,
        document.body
    );
}
