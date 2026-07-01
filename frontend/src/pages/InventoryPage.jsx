import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, PackageSearch, PackagePlus, Table2 } from "lucide-react";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { usePageHeader } from "../hooks/usePageHeader.js";
import { useItems } from "../hooks/useItems.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { useAiStatus } from "../hooks/useAiStatus.js";
import ItemCard from "../components/items/ItemCard.jsx";
import SearchBar from "../components/items/SearchBar.jsx";
import CategoryFilter from "../components/items/CategoryFilter.jsx";
import RequestItemModal from "../components/requests/RequestItemModal.jsx";
import RemoveStockModal from "../components/requests/RemoveStockModal.jsx";
import { ItemCardSkeleton } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Button from "../components/ui/Button.jsx";
import { aiService } from "../services/aiService.js";
import { CATEGORY_META, normalizeRole } from "../utils/navConfig.js";
import { getOptimizedCloudinaryUrl } from "../utils/cloudinary.js";

export default function InventoryPage() {
    const { user } = useAuth();
    const { items, loading, error, refetch } = useItems();
    const { available: aiAvailable } = useAiStatus();
    const role = normalizeRole(user?.role);
    const canManageStock = role === "Storekeeper" || role === "Admin";

    const headerActions = useMemo(
        () =>
            canManageStock ? (
                <Button as={Link} to="/add-stock" leftIcon={<PackagePlus className="size-4" />} className="hidden sm:inline-flex">
                    Add stock
                </Button>
            ) : null,
        [canManageStock]
    );

    usePageHeader({
        title: "Inventory",
        subtitle: loading ? "Loading…" : `${items.length} item${items.length === 1 ? "" : "s"} tracked`,
        actions: headerActions,
    });

    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("");
    const [aiMode, setAiMode] = useState(false);
    const [viewMode, setViewMode] = useState("grid");
    // Consolidated into one state value so the effect never needs to call
    // setState synchronously at the top of its body — it only updates state
    // from within the async resolution, which the stricter
    // react-hooks/set-state-in-effect rule is fine with.
    const [aiSearch, setAiSearch] = useState({ status: "idle", results: null });
    const debouncedQuery = useDebouncedValue(query, 400);
    const aiSearchActive = aiMode && Boolean(debouncedQuery.trim());

    const [requestTarget, setRequestTarget] = useState(null);
    const [removeTarget, setRemoveTarget] = useState(null);

    // AI smart search — only fires when toggled on and the query is non-trivial.
    useEffect(() => {
        if (!aiSearchActive) return;

        let cancelled = false;

        aiService
            .smartSearch(debouncedQuery.trim())
            .then(({ data }) => {
                if (!cancelled) setAiSearch({ status: "done", results: data.data || [] });
            })
            .catch(() => {
                if (!cancelled) setAiSearch({ status: "done", results: [] });
            });

        // Mark as loading via a microtask so this isn't a synchronous
        // setState call inside the effect body itself.
        Promise.resolve().then(() => {
            if (!cancelled) setAiSearch((prev) => ({ ...prev, status: "loading" }));
        });

        return () => {
            cancelled = true;
        };
    }, [aiSearchActive, debouncedQuery]);

    const aiLoading = aiSearch.status === "loading";
    const aiResults = aiSearch.results;

    const filteredItems = useMemo(() => {
        if (aiSearchActive) {
            return aiResults || [];
        }

        return items.filter((item) => {
            const matchesQuery = !debouncedQuery.trim() || (item.displayName || item.name)
                .toLowerCase()
                .includes(debouncedQuery.trim().toLowerCase());
            const matchesCategory = !category || item.category === category;
            return matchesQuery && matchesCategory;
        });
    }, [items, debouncedQuery, category, aiSearchActive, aiResults]);

    return (
        <div className="space-y-5">
            <div className="glass-panel rounded-3xl p-4">
                <SearchBar
                    value={query}
                    onChange={setQuery}
                    aiEnabled={aiMode}
                    onToggleAi={() => setAiMode((v) => !v)}
                    aiAvailable={aiAvailable}
                />
                <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    {!aiMode && <CategoryFilter value={category} onChange={setCategory} />}
                    <div className="ml-auto flex w-fit rounded-xl border border-ink-200 bg-white/70 p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setViewMode("grid")}
                            className={clsx("rounded-lg p-2 transition-colors", viewMode === "grid" ? "bg-ink-950 text-white" : "text-ink-500 hover:text-ink-900")}
                            aria-label="Grid view"
                        >
                            <LayoutGrid className="size-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            className={clsx("rounded-lg p-2 transition-colors", viewMode === "table" ? "bg-ink-950 text-white" : "text-ink-500 hover:text-ink-900")}
                            aria-label="Table view"
                        >
                            <Table2 className="size-4" />
                        </button>
                    </div>
                </div>
            </div>

            {canManageStock && (
                <Button as={Link} to="/add-stock" leftIcon={<PackagePlus className="size-4" />} className="w-full sm:hidden">
                    Add stock
                </Button>
            )}

            {loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <ItemCardSkeleton key={i} />
                    ))}
                </div>
            ) : error ? (
                <EmptyState
                    icon={PackageSearch}
                    title="Couldn't load inventory"
                    description={error}
                    action={<Button onClick={refetch}>Try again</Button>}
                />
            ) : aiSearchActive && aiLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <ItemCardSkeleton key={i} />
                    ))}
                </div>
            ) : filteredItems.length === 0 ? (
                <EmptyState
                    icon={PackageSearch}
                    title="No items found"
                    description={
                        aiMode
                            ? "Try rephrasing your question, or switch off smart search."
                            : "Try a different search term or category."
                    }
                />
            ) : viewMode === "table" ? (
                <div className="glass-panel overflow-hidden rounded-2xl">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="sticky top-0 bg-white/85 text-xs uppercase tracking-wide text-ink-500 backdrop-blur">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">Item</th>
                                    <th className="px-5 py-3 font-semibold">Category</th>
                                    <th className="px-5 py-3 font-semibold">Stock</th>
                                    <th className="px-5 py-3 font-semibold">Batches</th>
                                    <th className="px-5 py-3 font-semibold">SKU</th>
                                    <th className="px-5 py-3 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100/80">
                                {filteredItems.map((item) => {
                                    const meta = CATEGORY_META[item.category] || { label: item.category };
                                    const displayName = item.displayName || item.name;
                                    const imageUrl = getOptimizedCloudinaryUrl(item.image?.url, { width: 96, height: 96 });
                                    return (
                                        <tr key={item._id} className="transition-colors hover:bg-white/70">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    {imageUrl ? (
                                                        <img
                                                            src={imageUrl}
                                                            alt={displayName}
                                                            className="size-10 rounded-lg border border-ink-200 bg-white object-cover"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="flex size-10 items-center justify-center rounded-lg bg-ink-100 text-ink-400">
                                                            <PackageSearch className="size-4" />
                                                        </div>
                                                    )}
                                                    <span className="font-medium text-ink-950">{displayName}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-ink-600">{meta.label}</td>
                                            <td className="px-5 py-4 font-mono text-ink-900">{item.totalQuantity} {item.unitType}</td>
                                            <td className="px-5 py-4 text-ink-600">{item.batches?.length || 0}</td>
                                            <td className="px-5 py-4 font-mono text-xs text-ink-500">{item.sku || "Not set"}</td>
                                            <td className="px-5 py-4 text-right">
                                                {role === "Student" && (
                                                    <Button size="sm" onClick={() => setRequestTarget(item)} disabled={item.totalQuantity <= 0}>
                                                        Request
                                                    </Button>
                                                )}
                                                {canManageStock && (
                                                    <Button size="sm" variant="outline" onClick={() => setRemoveTarget(item)}>
                                                        Remove
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredItems.map((item) => (
                        <ItemCard
                            key={item._id}
                            item={item}
                            role={role}
                            onRequest={setRequestTarget}
                            onRemoveStock={setRemoveTarget}
                        />
                    ))}
                </div>
            )}

            <RequestItemModal
                item={requestTarget}
                open={Boolean(requestTarget)}
                onClose={() => setRequestTarget(null)}
                onSuccess={refetch}
            />
            <RemoveStockModal
                item={removeTarget}
                open={Boolean(removeTarget)}
                onClose={() => setRemoveTarget(null)}
                onSuccess={refetch}
            />
        </div>
    );
}
