import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Download, FileText, PackageCheck, PackageSearch } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { usePageHeader } from "../hooks/usePageHeader.js";
import { reportService } from "../services/reportService.js";
import { getErrorMessage } from "../services/apiClient.js";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { SectionLoader } from "../components/ui/Spinner.jsx";
import Pagination from "../components/ui/Pagination.jsx";

function Stat({ icon: Icon, label, value }) {
    return (
        <Card className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-ink-950 text-white">
                <Icon className="size-5" />
            </div>
            <div>
                <p className="font-mono text-2xl font-semibold text-ink-950">{value}</p>
                <p className="text-sm text-ink-500">{label}</p>
            </div>
        </Card>
    );
}

export default function ReportsPage() {
    const { user, initializing } = useAuth();
    const authReady = !initializing && Boolean(user);

    usePageHeader({ title: "Reports", subtitle: "Inventory, low-stock, expiry, issue, and monthly usage reports" });
    const [state, setState] = useState({ loading: true, error: "", data: null });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const load = useCallback(async () => {
        if (!authReady) return;

        setState({ loading: true, error: "", data: null });
        try {
            const { data } = await reportService.overview();
            setState({ loading: false, error: "", data: data.data });
        } catch (error) {
            setState({ loading: false, error: getErrorMessage(error, "Could not load reports."), data: null });
        }
    }, [authReady]);

    useEffect(() => {
        if (!authReady) return;
        load();
    }, [authReady, load]);

    const issuedReturned = useMemo(() => state.data?.issuedReturned || [], [state.data]);
    const paged = useMemo(() => issuedReturned.slice((page - 1) * pageSize, page * pageSize), [issuedReturned, page, pageSize]);
    const totalPages = Math.ceil(issuedReturned.length / pageSize);

    const downloadJson = () => {
        const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `biostorex-report-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (state.loading) return <SectionLoader label="Generating reports..." />;
    if (state.error) return <EmptyState icon={FileText} title="Reports unavailable" description={state.error} action={<Button onClick={load}>Retry</Button>} />;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => window.print()} leftIcon={<FileText className="size-4" />}>Print / save PDF</Button>
                <Button onClick={downloadJson} leftIcon={<Download className="size-4" />}>Download report JSON</Button>
            </div>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <Stat icon={PackageSearch} label="Inventory items" value={state.data.summary.totalItems} />
                <Stat icon={AlertTriangle} label="Low stock" value={state.data.summary.lowStockCount} />
                <Stat icon={PackageCheck} label="Issued this month" value={state.data.summary.monthlyIssued} />
                <Stat icon={BarChart3} label="Expiry risk" value={state.data.summary.expiryRiskCount} />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <ReportList title="Low-stock report" rows={state.data.lowStock} empty="No low-stock items." render={(item) => (
                    <span>{item.displayName || item.name} - {item.totalQuantity} {item.unitType} left</span>
                )} />
                <ReportList title="Expiry report" rows={state.data.expiryRisk.slice(0, 12)} empty="No batches expiring within 90 days." render={(item) => (
                    <span>{item.itemName} / {item.batchNo} - {item.daysUntilExpiry} days</span>
                )} />
            </div>

            <Card className="overflow-hidden">
                <div className="border-b border-ink-200/70 px-5 py-4">
                    <h2 className="font-semibold text-ink-950">Issued / returned item report</h2>
                    <p className="text-sm text-ink-500">Recent item movement from issue logs.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="sticky top-0 bg-white/85 text-xs uppercase text-ink-500 backdrop-blur">
                            <tr>
                                <th className="px-5 py-3">Item</th>
                                <th className="px-5 py-3">Type</th>
                                <th className="px-5 py-3">Quantity</th>
                                <th className="px-5 py-3">User</th>
                                <th className="px-5 py-3">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100/80">
                            {paged.map((row) => (
                                <tr key={row._id} className="hover:bg-white/70">
                                    <td className="px-5 py-3 font-medium text-ink-950">{row.itemName}</td>
                                    <td className="px-5 py-3 text-ink-600">{row.type}</td>
                                    <td className="px-5 py-3 font-mono">{Math.abs(row.quantity)}</td>
                                    <td className="px-5 py-3 text-ink-600">{row.user?.fullName || "Unknown"}</td>
                                    <td className="px-5 py-3 text-ink-500">{new Date(row.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination page={page} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
            </Card>
        </div>
    );
}

function ReportList({ title, rows, empty, render }) {
    return (
        <Card className="overflow-hidden">
            <div className="border-b border-ink-200/70 px-5 py-4">
                <h2 className="font-semibold text-ink-950">{title}</h2>
            </div>
            {rows.length === 0 ? (
                <p className="px-5 py-8 text-sm text-ink-500">{empty}</p>
            ) : (
                <div className="divide-y divide-ink-100/80">
                    {rows.map((row, index) => <div key={row._id || row.batchNo || index} className="px-5 py-3 text-sm text-ink-700">{render(row)}</div>)}
                </div>
            )}
        </Card>
    );
}
