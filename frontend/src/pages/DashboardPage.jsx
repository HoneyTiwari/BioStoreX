import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    ArrowRight,
    Boxes,
    ClipboardList,
    Clock,
    PackagePlus,
    Sparkles,
    UserCheck,
    Users,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { usePageHeader } from "../hooks/usePageHeader.js";
import { useItems } from "../hooks/useItems.js";
import { useRequests } from "../hooks/useRequests.js";
import { adminService } from "../services/adminService.js";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { StatusBadge } from "../components/ui/Badge.jsx";
import { SectionLoader } from "../components/ui/Spinner.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { getStockLevel, formatRelativeTime, getSoonestExpiry, isExpiringSoon } from "../utils/format.js";
import { normalizeRole } from "../utils/navConfig.js";
import RestockInsights from "../components/ai/RestockInsights.jsx";

const cardMotion = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
};

function StatCard({ icon: Icon, label, value, helper, tone = "ink", to }) {
    const toneClasses = {
        ink: "from-ink-950 to-ink-700 text-white",
        iodine: "from-iodine-500 to-iodine-700 text-white",
        hazard: "from-hazard-500 to-hazard-600 text-white",
        glove: "from-glove-500 to-glove-600 text-white",
        specimen: "from-specimen-400 to-iodine-500 text-white",
    };

    const body = (
        <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.18 }}>
            <Card className="group overflow-hidden p-0">
                <div className="relative p-5">
                    <div className={`absolute right-4 top-4 flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClasses[tone]} shadow-card`}>
                        <Icon className="size-5" />
                    </div>
                    <p className="text-sm font-medium text-ink-500">{label}</p>
                    <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-ink-950">{value}</p>
                    {helper && <p className="mt-2 text-sm text-ink-500">{helper}</p>}
                </div>
            </Card>
        </motion.div>
    );

    return to ? <Link to={to}>{body}</Link> : body;
}

function QuickAction({ icon: Icon, title, description, to }) {
    return (
        <Link to={to}>
            <Card className="group flex items-center gap-4 p-4 hover:-translate-y-0.5 hover:shadow-popover">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ink-950 text-white shadow-card">
                    <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-950">{title}</p>
                    <p className="truncate text-sm text-ink-500">{description}</p>
                </div>
                <ArrowRight className="size-4 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-700" />
            </Card>
        </Link>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();
    const role = normalizeRole(user?.role);
    const isStudent = role === "Student";
    const isStorekeeper = role === "Storekeeper";
    const isAdmin = role === "Admin";

    usePageHeader({
        title: `Welcome, ${user?.fullName?.split(" ")[0]}`,
        subtitle: new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }),
        actions: (isStorekeeper || isAdmin) ? (
            <Button as={Link} to="/ai-dashboard" leftIcon={<Sparkles className="size-4" />}>
                AI Dashboard
            </Button>
        ) : null,
    });

    const { items, loading: itemsLoading } = useItems();
    const { requests, loading: requestsLoading } = useRequests(isStudent ? "mine" : "all");
    const [pendingStudentCount, setPendingStudentCount] = useState(0);

    useEffect(() => {
        if (isStudent) return;
        let cancelled = false;
        adminService
            .getPendingStudents()
            .then(({ data }) => {
                if (!cancelled) setPendingStudentCount((data.data || []).length);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [isStudent]);

    const stats = useMemo(() => {
        const lowStockItems = items.filter((i) => getStockLevel(i.totalQuantity, i.minThreshold ?? 5) !== "ok");
        const expiringItems = items.filter((i) => isExpiringSoon(getSoonestExpiry(i.batches)));
        const pending = requests.filter((r) => r.status === "PENDING").length;
        return {
            totalItems: items.length,
            lowStock: lowStockItems.length,
            pending,
            totalRequests: requests.length,
            expiringSoon: expiringItems.length,
            lowStockItems: lowStockItems.slice(0, 5),
        };
    }, [items, requests]);

    const recentRequests = requests.slice(0, 6);

    return (
        <div className="space-y-6">
            <motion.section
                variants={cardMotion}
                initial="initial"
                animate="animate"
                className="premium-surface relative overflow-hidden rounded-3xl border border-white/70 p-6 shadow-card"
            >
                <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-glove-400/20 bg-white/70 px-3 py-1 text-xs font-semibold text-glove-600">
                            <Sparkles className="size-3.5" />
                            BioStoreX command center
                        </div>
                        <h2 className="gradient-text text-3xl font-semibold tracking-tight sm:text-4xl">
                            Lab inventory that stays ahead of demand.
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-ink-600 sm:text-base">
                            Monitor live stock, approve requests, spot expiry risks, and use AI insights to keep the biotechnology store running smoothly.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button as={Link} to="/inventory" variant="outline" leftIcon={<Boxes className="size-4" />}>
                            View inventory
                        </Button>
                        {(isStorekeeper || isAdmin) && (
                            <Button as={Link} to="/add-stock" leftIcon={<PackagePlus className="size-4" />}>
                                Add stock
                            </Button>
                        )}
                    </div>
                </div>
            </motion.section>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard icon={Boxes} label="Inventory items" value={stats.totalItems} helper="Tracked live" tone="ink" to="/inventory" />
                <StatCard icon={AlertTriangle} label="Low stock" value={stats.lowStock} helper="Needs attention" tone={stats.lowStock > 0 ? "hazard" : "glove"} to="/inventory" />
                <StatCard icon={ClipboardList} label={isStudent ? "My requests" : "Requests"} value={stats.totalRequests} helper={`${stats.pending} pending`} tone="iodine" to={isStudent ? "/my-requests" : "/requests"} />
                <StatCard icon={Clock} label="Expiring soon" value={stats.expiringSoon} helper="Batch risk" tone={stats.expiringSoon > 0 ? "specimen" : "glove"} to={isStorekeeper || isAdmin ? "/ai-dashboard" : "/inventory"} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card className="overflow-hidden xl:col-span-2">
                    <div className="flex items-center justify-between border-b border-ink-200/70 px-5 py-4">
                        <div>
                            <h2 className="font-semibold text-ink-950">{isStudent ? "Your recent requests" : "Recent activity"}</h2>
                            <p className="text-sm text-ink-500">Latest request movement across the store</p>
                        </div>
                        <Button as={Link} to={isStudent ? "/my-requests" : "/requests"} variant="ghost" size="sm" rightIcon={<ArrowRight className="size-4" />}>
                            View all
                        </Button>
                    </div>

                    {requestsLoading ? (
                        <SectionLoader label="Loading requests..." />
                    ) : recentRequests.length === 0 ? (
                        <EmptyState
                            icon={ClipboardList}
                            title="No requests yet"
                            description={isStudent ? "Browse inventory to request your first item." : "Student requests will appear here."}
                            className="border-none bg-transparent shadow-none"
                        />
                    ) : (
                        <ol className="divide-y divide-ink-100/80">
                            {recentRequests.map((r) => (
                                <li key={r._id} className="flex items-center gap-4 px-5 py-4">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-ink-600 shadow-sm">
                                        <ClipboardList className="size-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-ink-950">
                                            {r.item?.displayName || r.item?.name || "Deleted item"}
                                        </p>
                                        <p className="truncate text-sm text-ink-500">
                                            {!isStudent && r.user?.fullName ? `${r.user.fullName} - ` : ""}
                                            Qty {r.quantityRequested} - {formatRelativeTime(r.createdAt)}
                                        </p>
                                    </div>
                                    <StatusBadge status={r.status} />
                                </li>
                            ))}
                        </ol>
                    )}
                </Card>

                <div className="space-y-6">
                    <Card className="p-5">
                        <h2 className="font-semibold text-ink-950">Quick actions</h2>
                        <div className="mt-4 space-y-3">
                            <QuickAction icon={Boxes} title="Inventory" description="Search and manage stock" to="/inventory" />
                            {(isStorekeeper || isAdmin) && <QuickAction icon={PackagePlus} title="Add stock" description="Create batches and thresholds" to="/add-stock" />}
                            {(isStorekeeper || isAdmin) && <QuickAction icon={UserCheck} title="Pending students" description={`${pendingStudentCount} awaiting review`} to="/pending-students" />}
                            {isAdmin && <QuickAction icon={Users} title="Users" description="Manage access and roles" to="/users" />}
                            {isStudent && <QuickAction icon={Sparkles} title="Lab Assistant" description="Ask about stock availability" to="/assistant" />}
                        </div>
                    </Card>

                    {(isStorekeeper || isAdmin) && <RestockInsights />}

                    {!itemsLoading && stats.lowStockItems.length > 0 && (
                        <Card className="overflow-hidden">
                            <div className="border-b border-ink-200/70 px-5 py-4">
                                <h2 className="font-semibold text-ink-950">Low stock alerts</h2>
                                <p className="text-sm text-ink-500">Prioritize these items first</p>
                            </div>
                            <div className="divide-y divide-ink-100/80">
                                {stats.lowStockItems.map((item) => (
                                    <div key={item._id} className="flex items-center justify-between gap-3 px-5 py-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-ink-950">{item.displayName || item.name}</p>
                                            <p className="text-xs text-ink-500">Threshold {item.minThreshold ?? 5}</p>
                                        </div>
                                        <span className="font-mono text-sm font-semibold text-hazard-600">
                                            {item.totalQuantity} {item.unitType}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                    <Card className="p-5">
                        <h2 className="font-semibold text-ink-950">Request status mix</h2>
                        <div className="mt-4 space-y-3">
                            {["PENDING", "APPROVED", "ISSUED", "RETURNED", "DECLINED"].map((status) => {
                                const count = requests.filter((request) => request.status === status).length;
                                const width = requests.length ? Math.max(4, (count / requests.length) * 100) : 0;
                                return (
                                    <div key={status}>
                                        <div className="mb-1 flex justify-between text-xs text-ink-500">
                                            <span>{status}</span>
                                            <span>{count}</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-ink-100">
                                            <div className="h-2 rounded-full bg-glove-500" style={{ width: `${width}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
