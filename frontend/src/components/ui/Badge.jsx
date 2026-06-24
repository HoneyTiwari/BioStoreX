import clsx from "clsx";

const VARIANT_CLASSES = {
    neutral: "bg-ink-100 text-ink-700",
    pending: "bg-specimen-400/15 text-specimen-500 ring-1 ring-inset ring-specimen-400/30",
    approved: "bg-glove-500/10 text-glove-600 ring-1 ring-inset ring-glove-500/25",
    declined: "bg-hazard-500/10 text-hazard-600 ring-1 ring-inset ring-hazard-500/25",
    issued: "bg-iodine-500/10 text-iodine-700 ring-1 ring-inset ring-iodine-500/25",
    returned: "bg-ink-500/10 text-ink-600 ring-1 ring-inset ring-ink-500/25",
    success: "bg-glove-500/10 text-glove-600 ring-1 ring-inset ring-glove-500/25",
    danger: "bg-hazard-500/10 text-hazard-600 ring-1 ring-inset ring-hazard-500/25",
};

// Maps backend Request.status values directly onto badge variants/labels.
const STATUS_MAP = {
    PENDING: { variant: "pending", label: "Pending" },
    APPROVED: { variant: "approved", label: "Approved" },
    DECLINED: { variant: "declined", label: "Declined" },
    ISSUED: { variant: "issued", label: "Issued" },
    RETURNED: { variant: "returned", label: "Returned" },
};

export function StatusBadge({ status, className }) {
    const meta = STATUS_MAP[status] || { variant: "neutral", label: status };
    return <Badge variant={meta.variant} className={className}>{meta.label}</Badge>;
}

export default function Badge({ variant = "neutral", className, children }) {
    return (
        <span
            className={clsx(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                VARIANT_CLASSES[variant],
                className
            )}
        >
            {children}
        </span>
    );
}
