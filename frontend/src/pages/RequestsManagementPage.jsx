import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ClipboardList, Check, Search, X, PackageCheck, Undo2 } from "lucide-react";
import clsx from "clsx";
import { usePageHeader } from "../hooks/usePageHeader.js";
import { useRequests } from "../hooks/useRequests.js";
import { useAuth } from "../hooks/useAuth.js";
import Card from "../components/ui/Card.jsx";
import { StatusBadge } from "../components/ui/Badge.jsx";
import { SectionLoader } from "../components/ui/Spinner.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import Input from "../components/ui/Input.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import { requestService } from "../services/requestService.js";
import { getErrorMessage } from "../services/apiClient.js";
import { formatRelativeTime } from "../utils/format.js";
import { normalizeRole } from "../utils/navConfig.js";
import Pagination from "../components/ui/Pagination.jsx";

const TABS = [
    { key: "PENDING", label: "Pending" },
    { key: "APPROVED", label: "Approved" },
    { key: "ISSUED", label: "Issued" },
    { key: "DECLINED", label: "Declined" },
    { key: "RETURNED", label: "Returned" },
    { key: "ALL", label: "All" },
];

export default function RequestsManagementPage() {
    const { user } = useAuth();
    const { requests, loading, error, refetch } = useRequests("all");
    const [tab, setTab] = useState("PENDING");
    const [actioningId, setActioningId] = useState(null);
    const [declineTarget, setDeclineTarget] = useState(null);
    const [declineReason, setDeclineReason] = useState("");
    const [returnTarget, setReturnTarget] = useState(null);
    const [returnQty, setReturnQty] = useState("");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    usePageHeader({
        title: "Requests",
        subtitle: loading ? "Loading…" : `${requests.length} total request${requests.length === 1 ? "" : "s"}`,
    });

    const counts = useMemo(() => {
        const map = { ALL: requests.length };
        for (const r of requests) map[r.status] = (map[r.status] || 0) + 1;
        return map;
    }, [requests]);

    const visibleRequests = useMemo(() => {
        const scoped = tab === "ALL" ? requests : requests.filter((r) => r.status === tab);
        const needle = query.trim().toLowerCase();
        if (!needle) return scoped;
        return scoped.filter((r) =>
            `${r.item?.displayName || r.item?.name || ""} ${r.user?.fullName || ""} ${r.user?.userName || ""} ${r.status || ""}`
                .toLowerCase()
                .includes(needle)
        );
    }, [requests, tab, query]);

    const role = normalizeRole(user?.role);
    const canProcessRequests = role === "Storekeeper" || role === "Admin";
    const pagedRequests = visibleRequests.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(visibleRequests.length / pageSize);

    const handleApprove = async (id) => {
        setActioningId(id);
        try {
            await requestService.approve(id);
            toast.success("Request approved");
            refetch();
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't approve this request."));
        } finally {
            setActioningId(null);
        }
    };

    const handleDeclineConfirm = async () => {
        if (!declineTarget) return;
        setActioningId(declineTarget._id);
        try {
            await requestService.decline(declineTarget._id, declineReason);
            toast.success("Request declined");
            setDeclineTarget(null);
            setDeclineReason("");
            refetch();
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't decline this request."));
        } finally {
            setActioningId(null);
        }
    };

    const handleIssue = async (id) => {
        setActioningId(id);
        try {
            await requestService.issue(id);
            toast.success("Item marked as issued");
            refetch();
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't issue this item."));
        } finally {
            setActioningId(null);
        }
    };

    const handleReturnConfirm = async (e) => {
        e.preventDefault();
        if (!returnTarget) return;

        const numeric = Number(returnQty);
        if (!returnQty || numeric <= 0 || numeric > returnTarget.quantityApproved) {
            toast.error(`Enter a quantity between 1 and ${returnTarget.quantityApproved}`);
            return;
        }

        setActioningId(returnTarget._id);
        try {
            await requestService.returnItem(returnTarget._id, { quantity: numeric });
            toast.success("Item return recorded");
            setReturnTarget(null);
            setReturnQty("");
            refetch();
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't record the return."));
        } finally {
            setActioningId(null);
        }
    };

    if (loading) return <SectionLoader label="Loading requests…" />;

    if (error) {
        return (
            <EmptyState
                icon={ClipboardList}
                title="Couldn't load requests"
                description={error}
                action={<Button onClick={refetch}>Try again</Button>}
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="glass-panel rounded-3xl p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                    <input
                        value={query}
                        onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                        placeholder="Search requests by item, student, or status..."
                        className="h-11 w-full rounded-2xl border border-ink-200 bg-white/80 pl-10 pr-3 text-sm shadow-sm outline-none transition-all focus:border-glove-400 focus:bg-white focus:ring-4 focus:ring-glove-400/10"
                    />
                </div>
                <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => { setTab(t.key); setPage(1); }}
                            className={clsx(
                                "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all",
                                tab === t.key ? "bg-ink-950 text-white shadow-card" : "border border-ink-200 bg-white/75 text-ink-600 hover:bg-white hover:text-ink-950"
                            )}
                        >
                            {t.label}
                            {counts[t.key] > 0 && (
                                <span className={clsx("rounded-full px-1.5 text-xs", tab === t.key ? "bg-white/20" : "bg-ink-100")}>
                                    {counts[t.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {visibleRequests.length === 0 ? (
                <EmptyState icon={ClipboardList} title="Nothing here" description="No requests match this filter." />
            ) : (
                <div className="space-y-3">
                    {pagedRequests.map((r) => (
                        <Card key={r._id} className="flex flex-col gap-3 p-4 hover:-translate-y-0.5 hover:shadow-popover sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <p className="font-medium text-ink-900">
                                    {r.item?.displayName || r.item?.name || "Deleted item"}
                                </p>
                                <p className="mt-0.5 text-sm text-ink-500">
                                    {r.user?.fullName} ({r.user?.userName}) · Qty{" "}
                                    <span className="font-mono">{r.quantityRequested}</span> {r.item?.unitType} ·{" "}
                                    {formatRelativeTime(r.createdAt)}
                                </p>
                                {r.status === "DECLINED" && r.declineReason && (
                                    <p className="mt-1 text-sm text-hazard-600">Reason: {r.declineReason}</p>
                                )}
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                <StatusBadge status={r.status} />
                                {canProcessRequests && r.status === "PENDING" && (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="success"
                                            leftIcon={<Check className="size-3.5" />}
                                            loading={actioningId === r._id}
                                            onClick={() => handleApprove(r._id)}
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            leftIcon={<X className="size-3.5" />}
                                            onClick={() => setDeclineTarget(r)}
                                        >
                                            Decline
                                        </Button>
                                    </>
                                )}
                                {canProcessRequests && r.status === "APPROVED" && (
                                    <Button
                                        size="sm"
                                        leftIcon={<PackageCheck className="size-3.5" />}
                                        loading={actioningId === r._id}
                                        onClick={() => handleIssue(r._id)}
                                    >
                                        Mark issued
                                    </Button>
                                )}
                                {canProcessRequests && r.status === "ISSUED" && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        leftIcon={<Undo2 className="size-3.5" />}
                                        onClick={() => setReturnTarget(r)}
                                    >
                                        Record return
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            {visibleRequests.length > 0 && (
                <Card>
                    <Pagination page={page} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
                </Card>
            )}

            <ConfirmDialog
                open={Boolean(declineTarget)}
                onClose={() => {
                    setDeclineTarget(null);
                    setDeclineReason("");
                }}
                onConfirm={handleDeclineConfirm}
                title="Decline this request?"
                confirmLabel="Decline request"
                loading={actioningId === declineTarget?._id}
                description={
                    <div className="space-y-3">
                        <p>
                            Declining the request for{" "}
                            <strong>{declineTarget?.item?.displayName || declineTarget?.item?.name}</strong> from{" "}
                            {declineTarget?.user?.fullName}.
                        </p>
                        <Input
                            label="Reason (optional)"
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                            placeholder="e.g. Out of stock, request unclear"
                        />
                    </div>
                }
            />

            <Modal
                open={Boolean(returnTarget)}
                onClose={() => {
                    setReturnTarget(null);
                    setReturnQty("");
                }}
                title="Record item return"
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setReturnTarget(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleReturnConfirm} loading={actioningId === returnTarget?._id}>
                            Confirm return
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleReturnConfirm} className="space-y-3">
                    <p className="text-sm text-ink-500">
                        Issued: <span className="font-mono">{returnTarget?.quantityApproved}</span>{" "}
                        {returnTarget?.item?.unitType}
                    </p>
                    <Input
                        label="Quantity being returned"
                        type="number"
                        min={1}
                        max={returnTarget?.quantityApproved}
                        value={returnQty}
                        onChange={(e) => setReturnQty(e.target.value)}
                        autoFocus
                    />
                </form>
            </Modal>
        </div>
    );
}
