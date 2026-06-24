import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

const Select = forwardRef(function Select(
    { label, error, hint, className, containerClassName, id, required, children, ...props },
    ref
) {
    const generatedId = useId();
    const selectId = id || generatedId;

    return (
        <div className={clsx("flex flex-col gap-1.5", containerClassName)}>
            {label && (
                <label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {label}
                    {required && <span className="text-hazard-500 ml-0.5">*</span>}
                </label>
            )}
            <div className="relative">
                <select
                    ref={ref}
                    id={selectId}
                    aria-invalid={Boolean(error)}
                    className={clsx(
                        "h-11 w-full appearance-none rounded-xl border bg-white/80 pl-3 pr-9 text-sm text-ink-900 shadow-sm",
                        "transition-all duration-150 focus:bg-white focus:outline-none",
                        error
                            ? "border-hazard-400 focus:border-hazard-500 focus:ring-4 focus:ring-hazard-100"
                            : "border-ink-200 focus:border-glove-400 focus:ring-4 focus:ring-glove-400/10",
                        className
                    )}
                    {...props}
                >
                    {children}
                </select>
                <ChevronDown className="size-4 text-ink-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {error && <p className="text-xs text-hazard-600">{error}</p>}
            {!error && hint && <p className="text-xs text-ink-500">{hint}</p>}
        </div>
    );
});

export default Select;
