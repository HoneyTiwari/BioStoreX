import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

const VARIANT_CLASSES = {
    primary: "bg-ink-950 text-white shadow-card hover:-translate-y-0.5 hover:bg-ink-900 hover:shadow-popover active:translate-y-0 disabled:bg-ink-300",
    secondary: "bg-glove-500 text-white shadow-card hover:-translate-y-0.5 hover:bg-glove-600 active:translate-y-0 disabled:bg-glove-300",
    outline: "border border-ink-300/80 bg-white/75 text-ink-800 shadow-sm hover:-translate-y-0.5 hover:border-ink-400 hover:bg-white active:translate-y-0 disabled:text-ink-300",
    ghost: "text-ink-700 hover:bg-white/70 active:bg-white disabled:text-ink-300",
    danger: "bg-hazard-500 text-white shadow-card hover:-translate-y-0.5 hover:bg-hazard-600 active:translate-y-0 disabled:bg-hazard-300",
    success: "bg-glove-500 text-white shadow-card hover:-translate-y-0.5 hover:bg-glove-600 active:translate-y-0 disabled:bg-glove-300",
};

const SIZE_CLASSES = {
    sm: "h-8 px-3 text-sm gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-12 px-6 text-base gap-2",
    icon: "h-10 w-10 p-0",
};

/**
 * Universal button. Pass `loading` to disable interaction and show a spinner
 * without shifting layout (label stays mounted, just visually hidden).
 */
const Button = forwardRef(function Button(
    { variant = "primary", size = "md", loading = false, disabled, className, children, leftIcon, rightIcon, as: Tag = "button", ...props },
    ref
) {
    return (
        <Tag
            ref={ref}
            disabled={Tag === "button" ? disabled || loading : undefined}
            aria-disabled={Tag !== "button" ? disabled || loading : undefined}
            className={clsx(
                "inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150",
                "transition-all",
                "disabled:cursor-not-allowed",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iodine-500",
                VARIANT_CLASSES[variant],
                SIZE_CLASSES[size],
                className
            )}
            {...props}
        >
            {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
                leftIcon && <span className="shrink-0">{leftIcon}</span>
            )}
            {children}
            {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </Tag>
    );
});

export default Button;
