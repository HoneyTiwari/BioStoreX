import { Package, AlertTriangle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { CATEGORY_META } from "../../utils/navConfig.js";
import { getSoonestExpiry, isExpiringSoon, isExpired, getStockLevel, formatDate } from "../../utils/format.js";

/**
 * Item card styled like a specimen/reagent label: a colored category stripe
 * down the left edge, monospace SKU/batch data, and a small stock gauge.
 * This is the design's signature element — every other surface stays quiet
 * so this pattern reads clearly wherever it repeats (inventory grid, search
 * results, dashboard "low stock" lists).
 */
export default function ItemCard({ item, onRequest, onRemoveStock, role }) {
    const meta = CATEGORY_META[item.category] || { label: item.category, colorVar: "var(--color-ink-500)" };
    const stockLevel = getStockLevel(item.totalQuantity, item.minThreshold ?? 5);
    const soonestExpiry = getSoonestExpiry(item.batches);
    const expiringSoon = isExpiringSoon(soonestExpiry);
    const expired = isExpired(soonestExpiry);
    const displayName = item.displayName || item.name;

    return (
        <motion.div
            layout
            whileHover={{ y: -4 }}
            transition={{ duration: 0.18 }}
            className="group glass-panel relative flex overflow-hidden rounded-2xl hover:shadow-popover"
        >
            {/* Category stripe */}
            <div className="w-1.5 shrink-0" style={{ backgroundColor: meta.colorVar }} aria-hidden="true" />

            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="truncate font-semibold text-ink-900" title={displayName}>
                            {displayName}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                            <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                                style={{ backgroundColor: meta.colorVar }}
                            >
                                {meta.label}
                            </span>
                            {item.sku && (
                                <span className="font-mono text-[11px] text-ink-400">{item.sku}</span>
                            )}
                        </div>
                    </div>
                    <div
                        className={clsx(
                            "flex shrink-0 items-center justify-center rounded-2xl p-2 shadow-sm",
                            stockLevel === "out" && "bg-hazard-500/10 text-hazard-500",
                            stockLevel === "low" && "bg-specimen-400/15 text-specimen-500",
                            stockLevel === "ok" && "bg-glove-500/10 text-glove-500"
                        )}
                    >
                        <Package className="size-4" />
                    </div>
                </div>

                <div className="flex items-end justify-between">
                    <div>
                        <p className="font-mono text-2xl font-semibold leading-none text-ink-950">
                            {item.totalQuantity}
                            <span className="ml-1 text-sm font-normal text-ink-400">{item.unitType}</span>
                        </p>
                        <p className="mt-1 text-xs text-ink-500">
                            {item.batches?.length || 0} batch{item.batches?.length === 1 ? "" : "es"}
                        </p>
                    </div>

                    {stockLevel !== "ok" && (
                        <span
                            className={clsx(
                                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium",
                                stockLevel === "out" ? "bg-hazard-500/10 text-hazard-600" : "bg-specimen-400/15 text-specimen-600"
                            )}
                        >
                            <AlertTriangle className="size-3" />
                            {stockLevel === "out" ? "Out of stock" : "Low stock"}
                        </span>
                    )}
                </div>

                {soonestExpiry && (
                    <div
                        className={clsx(
                            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs",
                            expired ? "bg-hazard-500/10 text-hazard-600" : expiringSoon ? "bg-specimen-400/15 text-specimen-600" : "bg-ink-50 text-ink-500"
                        )}
                    >
                        <Clock className="size-3.5 shrink-0" />
                        {expired ? "Expired " : "Earliest expiry "}
                        <span className="font-mono">{formatDate(soonestExpiry)}</span>
                    </div>
                )}

                {(onRequest || onRemoveStock) && (
                    <div className="mt-auto flex gap-2 pt-1">
                        {role === "Student" && onRequest && (
                            <button
                                onClick={() => onRequest(item)}
                                disabled={item.totalQuantity <= 0}
                                className="flex-1 rounded-xl bg-ink-950 px-3 py-2 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-ink-900 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400"
                            >
                                {item.totalQuantity <= 0 ? "Unavailable" : "Request"}
                            </button>
                        )}
                        {(role === "Storekeeper" || role === "Admin") && onRemoveStock && (
                            <button
                                onClick={() => onRemoveStock(item)}
                                className="flex-1 rounded-xl border border-ink-300/80 bg-white/70 px-3 py-2 text-sm font-medium text-ink-700 transition-all hover:-translate-y-0.5 hover:bg-white"
                            >
                                Remove stock
                            </button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
