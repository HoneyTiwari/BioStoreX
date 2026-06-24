import clsx from "clsx";
import { CATEGORY_META } from "../../utils/navConfig.js";

export default function CategoryFilter({ value, onChange }) {
    return (
        <div className="flex flex-wrap gap-2">
            <button
                onClick={() => onChange("")}
                className={clsx(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                    value === "" ? "bg-ink-950 text-white shadow-card" : "border border-ink-200 bg-white/75 text-ink-600 hover:bg-white hover:text-ink-950"
                )}
            >
                All categories
            </button>
            {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <button
                    key={key}
                    onClick={() => onChange(value === key ? "" : key)}
                    className={clsx(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                        value === key ? "text-white border-transparent shadow-card" : "border-ink-200 bg-white/75 text-ink-600 hover:bg-white hover:text-ink-950"
                    )}
                    style={value === key ? { backgroundColor: meta.colorVar } : undefined}
                >
                    <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: value === key ? "white" : meta.colorVar }}
                    />
                    {meta.label}
                </button>
            ))}
        </div>
    );
}
