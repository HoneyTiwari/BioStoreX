import { ClipboardList } from "lucide-react";
import { usePageHeader } from "../hooks/usePageHeader.js";
import { useRequests } from "../hooks/useRequests.js";
import Card from "../components/ui/Card.jsx";
import { StatusBadge } from "../components/ui/Badge.jsx";
import { SectionLoader } from "../components/ui/Spinner.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Button from "../components/ui/Button.jsx";
import { formatDate, formatRelativeTime } from "../utils/format.js";
import { Link } from "react-router-dom";

export default function MyRequestsPage() {
    const { requests, loading, error, refetch } = useRequests("mine");

    usePageHeader({
        title: "My Requests",
        subtitle: loading ? "Loading…" : `${requests.length} request${requests.length === 1 ? "" : "s"}`,
    });

    if (loading) return <SectionLoader label="Loading your requests…" />;

    if (error) {
        return (
            <EmptyState
                icon={ClipboardList}
                title="Couldn't load your requests"
                description={error}
                action={<Button onClick={refetch}>Try again</Button>}
            />
        );
    }

    if (requests.length === 0) {
        return (
            <EmptyState
                icon={ClipboardList}
                title="No requests yet"
                description="Browse the inventory and request items you need for your lab work."
                action={
                    <Button as={Link} to="/inventory">
                        Browse inventory
                    </Button>
                }
            />
        );
    }

    return (
        <div className="space-y-3">
            {requests.map((r) => (
                <Card key={r._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p className="font-medium text-ink-900">{r.item?.displayName || r.item?.name || "Deleted item"}</p>
                        <p className="mt-0.5 text-sm text-ink-500">
                            Requested <span className="font-mono">{r.quantityRequested}</span> {r.item?.unitType} ·{" "}
                            {formatRelativeTime(r.createdAt)}
                        </p>
                        {r.status === "DECLINED" && r.declineReason && (
                            <p className="mt-1 text-sm text-hazard-600">Reason: {r.declineReason}</p>
                        )}
                        {r.status === "ISSUED" && r.issuedAt && (
                            <p className="mt-1 text-xs text-ink-400">Issued on {formatDate(r.issuedAt)}</p>
                        )}
                        {r.status === "RETURNED" && r.returnedAt && (
                            <p className="mt-1 text-xs text-ink-400">
                                Returned {r.quantityReturned} {r.item?.unitType} on {formatDate(r.returnedAt)}
                            </p>
                        )}
                    </div>
                    <StatusBadge status={r.status} className="self-start sm:self-center" />
                </Card>
            ))}
        </div>
    );
}
