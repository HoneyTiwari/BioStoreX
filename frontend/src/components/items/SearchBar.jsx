import { Search, Sparkles, X } from "lucide-react";
import clsx from "clsx";

export default function SearchBar({ value, onChange, aiEnabled, onToggleAi, aiAvailable, placeholder = "Search inventory..." }) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={aiEnabled ? "Ask in plain language... e.g. \"something to measure 5ml\"" : placeholder}
                    className="h-12 w-full rounded-2xl border border-ink-200 bg-white/80 pl-10 pr-9 text-sm text-ink-900 shadow-sm placeholder:text-ink-400 transition-all focus:border-glove-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-glove-400/10"
                />
                {value && (
                    <button
                        onClick={() => onChange("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                        aria-label="Clear search"
                    >
                        <X className="size-4" />
                    </button>
                )}
            </div>

            {aiAvailable && (
                <button
                    onClick={onToggleAi}
                    title={aiEnabled ? "Switch to plain search" : "Switch to AI-powered smart search"}
                    className={clsx(
                        "flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-2xl border px-4 text-sm font-medium shadow-sm transition-all",
                        aiEnabled
                            ? "border-iodine-500/30 bg-iodine-500/10 text-iodine-700"
                            : "border-ink-200 bg-white/75 text-ink-600 hover:bg-white hover:text-ink-950"
                    )}
                >
                    <Sparkles className="size-4" />
                    <span className="hidden sm:inline">Smart search</span>
                </button>
            )}
        </div>
    );
}
