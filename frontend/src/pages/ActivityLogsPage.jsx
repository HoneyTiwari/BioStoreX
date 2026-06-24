import { useEffect, useMemo, useState } from "react";
import { Activity, Search } from "lucide-react";
import { usePageHeader } from "../hooks/usePageHeader.js";
import { activityService } from "../services/activityService.js";
import { getErrorMessage } from "../services/apiClient.js";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { SectionLoader } from "../components/ui/Spinner.jsx";
import Pagination from "../components/ui/Pagination.jsx";

export default function ActivityLogsPage() {
    usePageHeader({ title: "Activity Logs", subtitle: "Stock, issue, return, and admin audit history" });
    const [state, setState] = useState({ loading: true, error: "", data: [] });
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const load = async () => {
        setState({ loading: true, error: "", data: [] });
        try {
            const { data } = await activityService.logs();
            setState({ loading: false, error: "", data: data.data.activities || [] });
        } catch (error) {
            setState({ loading: false, error: getErrorMessage(error, "Could not load activity logs."), data: [] });
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return state.data;
        return state.data.filter((item) => `${item.title} ${item.itemName || ""} ${item.actor?.fullName || ""} ${item.targetUser?.fullName || ""} ${item.type}`.toLowerCase().includes(needle));
    }, [state.data, query]);

    const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(filtered.length / pageSize);

    if (state.loading) return <SectionLoader label="Loading activity logs..." />;
    if (state.error) return <EmptyState icon={Activity} title="Activity unavailable" description={state.error} action={<Button onClick={load}>Retry</Button>} />;

    return (
        <div className="space-y-4">
            <div className="glass-panel rounded-3xl p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                    <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search activity by item, action, or user..." className="h-11 w-full rounded-2xl border border-ink-200 bg-white/80 pl-10 pr-3 text-sm shadow-sm outline-none transition-all focus:border-glove-400 focus:bg-white focus:ring-4 focus:ring-glove-400/10" />
                </div>
            </div>

            <Card className="overflow-hidden">
                {paged.length === 0 ? (
                    <EmptyState icon={Activity} title="No activity found" description="Try a different search." className="border-none bg-transparent shadow-none" />
                ) : (
                    <ol className="divide-y divide-ink-100/80">
                        {paged.map((item) => (
                            <li key={item._id} className="flex gap-4 px-5 py-4">
                                <div className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-ink-950 text-white">
                                    <Activity className="size-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="font-semibold text-ink-950">{item.title}</p>
                                        <p className="text-xs text-ink-500">{new Date(item.createdAt).toLocaleString()}</p>
                                    </div>
                                    <p className="mt-1 text-sm text-ink-600">
                                        {item.itemName ? `${item.itemName} - ` : ""}
                                        {item.actor?.fullName ? `By ${item.actor.fullName}` : "System"}
                                        {item.targetUser?.fullName ? ` for ${item.targetUser.fullName}` : ""}
                                    </p>
                                    {item.note && <p className="mt-1 text-xs text-ink-500">{item.note}</p>}
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
                <Pagination page={page} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
            </Card>
        </div>
    );
}

