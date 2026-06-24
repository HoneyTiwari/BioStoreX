import { forwardRef, useId } from "react";
import clsx from "clsx";

/**
 * Labeled text input with built-in error display. Pass `error` as a string
 * to show validation feedback; the input gets aria-invalid automatically.
 */
const Input = forwardRef(function Input(
    { label, error, hint, className, containerClassName, leftIcon, id, required, ...props },
    ref
) {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
        <div className={clsx("group flex flex-col gap-1.5", containerClassName)}>
            {label && (
                <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {label}
                    {required && <span className="text-hazard-500 ml-0.5">*</span>}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
                        {leftIcon}
                    </span>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
                    className={clsx(
                        "h-11 w-full rounded-xl border bg-white/80 px-3 text-sm text-ink-900 shadow-sm placeholder:text-ink-400",
                        "transition-all duration-150 focus:bg-white focus:outline-none",
                        leftIcon && "pl-9",
                        error
                            ? "border-hazard-400 focus:border-hazard-500 focus:ring-4 focus:ring-hazard-100"
                            : "border-ink-200 focus:border-glove-400 focus:ring-4 focus:ring-glove-400/10",
                        className
                    )}
                    {...props}
                />
            </div>
            {error && (
                <p id={`${inputId}-error`} className="text-xs text-hazard-600">
                    {error}
                </p>
            )}
            {!error && hint && (
                <p id={`${inputId}-hint`} className="text-xs text-ink-500">
                    {hint}
                </p>
            )}
        </div>
    );
});

export default Input;
