import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BrainCircuit, Clock, PackageSearch, RefreshCw, Send, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../hooks/useAuth.js";
import { usePageHeader } from "../hooks/usePageHeader.js";
import { aiService } from "../services/aiService.js";
import { getErrorMessage } from "../services/apiClient.js";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { SectionLoader } from "../components/ui/Spinner.jsx";
import ChatMessage from "../components/ai/ChatMessage.jsx";

const riskTone = {
    High: "bg-hazard-500/10 text-hazard-600",
    Medium: "bg-specimen-400/15 text-specimen-600",
    Low: "bg-glove-500/10 text-glove-600",
    Expired: "bg-hazard-500/10 text-hazard-600",
};

function MetricCard({ icon: Icon, label, value, tone = "ink" }) {
    const tones = {
        ink: "bg-ink-100 text-ink-700",
        iodine: "bg-iodine-500/10 text-iodine-600",
        hazard: "bg-hazard-500/10 text-hazard-600",
        specimen: "bg-specimen-400/15 text-specimen-600",
    };

    return (
        <Card className="flex items-center gap-3 p-4">
            <div className={clsx("flex size-10 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
                <Icon className="size-5" />
            </div>
            <div className="min-w-0">
                <p className="font-mono text-xl font-semibold text-ink-900">{value}</p>
                <p className="truncate text-sm text-ink-500">{label}</p>
            </div>
        </Card>
    );
}

function Panel({ title, subtitle, loading, error, onRetry, children }) {
    return (
        <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-5 py-4">
                <div className="min-w-0">
                    <h2 className="font-semibold text-ink-900">{title}</h2>
                    {subtitle && <p className="truncate text-sm text-ink-500">{subtitle}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={onRetry} leftIcon={<RefreshCw className="size-4" />}>
                    Retry
                </Button>
            </div>
            {loading ? (
                <SectionLoader label="Analyzing inventory..." />
            ) : error ? (
                <EmptyState icon={AlertTriangle} title="Could not load analysis" description={error} className="border-none" />
            ) : (
                children
            )}
        </Card>
    );
}

function RiskPill({ value }) {
    return (
        <span className={clsx("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", riskTone[value] || "bg-ink-100 text-ink-600")}>
            {value}
        </span>
    );
}

export default function AiDashboardPage() {
    const { user, initializing } = useAuth();
    const authReady = !initializing && Boolean(user);

    usePageHeader({ title: "AI Dashboard", subtitle: "Inventory intelligence, demand prediction, and expiry risk" });

    const [insights, setInsights] = useState({ loading: true, error: "", data: null });
    const [prediction, setPrediction] = useState({ loading: true, error: "", data: null });
    const [expiry, setExpiry] = useState({ loading: true, error: "", data: null });
    const [messages, setMessages] = useState([
        { role: "assistant", content: "Ask me about stock availability, low-stock items, expiry risk, or possible alternatives." },
    ]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const [chatError, setChatError] = useState("");

    const loadInsights = useCallback(async () => {
        if (!authReady) return;

        setInsights({ loading: true, error: "", data: null });
        try {
            const { data } = await aiService.inventoryInsights();
            setInsights({ loading: false, error: "", data: data.data });
        } catch (error) {
            setInsights({ loading: false, error: getErrorMessage(error, "Inventory insights failed."), data: null });
        }
    }, [authReady]);

    const loadPrediction = useCallback(async () => {
        if (!authReady) return;

        setPrediction({ loading: true, error: "", data: null });
        try {
            const { data } = await aiService.stockPrediction();
            setPrediction({ loading: false, error: "", data: data.data });
        } catch (error) {
            setPrediction({ loading: false, error: getErrorMessage(error, "Stock prediction failed."), data: null });
        }
    }, [authReady]);

    const loadExpiry = useCallback(async () => {
        if (!authReady) return;

        setExpiry({ loading: true, error: "", data: null });
        try {
            const { data } = await aiService.expiryRisk();
            setExpiry({ loading: false, error: "", data: data.data });
        } catch (error) {
            setExpiry({ loading: false, error: getErrorMessage(error, "Expiry analysis failed."), data: null });
        }
    }, [authReady]);

    useEffect(() => {
        if (!authReady) return;
        loadInsights();
        loadPrediction();
        loadExpiry();
    }, [authReady, loadInsights, loadPrediction, loadExpiry]);

    const metrics = useMemo(() => {
        const summary = insights.data?.summary || {};
        const highRisk = prediction.data?.predictions?.filter((item) => item.riskLevel === "High").length || 0;
        const expiryDue = (expiry.data?.windows?.expired || 0) + (expiry.data?.windows?.within30Days || 0);
        return { lowStock: summary.lowStock || 0, overstocked: summary.overstocked || 0, highRisk, expiryDue };
    }, [insights.data, prediction.data, expiry.data]);

    const sendChat = async (event) => {
        event.preventDefault();
        const text = chatInput.trim().slice(0, 1000);
        if (!text || chatLoading) return;

        const nextMessages = [...messages, { role: "user", content: text }];
        setMessages(nextMessages);
        setChatInput("");
        setChatError("");
        setChatLoading(true);

        try {
            const { data } = await aiService.chat(nextMessages);
            setMessages([...nextMessages, { role: "assistant", content: data.data.reply || "I could not generate a reply." }]);
        } catch (error) {
            setChatError(getErrorMessage(error, "AI chat failed."));
        } finally {
            setChatLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {(insights.data?.ai?.executiveSummary || prediction.data?.ai?.overview || expiry.data?.ai?.overview) && (
                <Card className="premium-surface p-5">
                    <div className="flex items-center gap-2 text-ink-950">
                        <BrainCircuit className="size-5 text-iodine-500" />
                        <h2 className="font-semibold">AI summary</h2>
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                        {insights.data?.ai?.executiveSummary && <SummaryNote title="Inventory" text={insights.data.ai.executiveSummary} />}
                        {prediction.data?.ai?.overview && <SummaryNote title="Prediction" text={prediction.data.ai.overview} />}
                        {expiry.data?.ai?.overview && <SummaryNote title="Expiry" text={expiry.data.ai.overview} />}
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard icon={PackageSearch} label="Low stock items" value={metrics.lowStock} tone={metrics.lowStock ? "hazard" : "ink"} />
                <MetricCard icon={TrendingUp} label="Overstocked items" value={metrics.overstocked} tone="iodine" />
                <MetricCard icon={AlertTriangle} label="High runout risk" value={metrics.highRisk} tone={metrics.highRisk ? "hazard" : "ink"} />
                <MetricCard icon={Clock} label="Expired / 30-day expiry" value={metrics.expiryDue} tone={metrics.expiryDue ? "specimen" : "ink"} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                    <Panel title="Inventory Insights" subtitle={insights.data?.ai?.executiveSummary} loading={insights.loading} error={insights.error} onRetry={loadInsights}>
                        <div className="divide-y divide-ink-100">
                            {(insights.data?.items || []).slice(0, 8).map((item) => (
                                <div key={item.itemId} className="px-5 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-ink-900">{item.name}</p>
                                            <p className="text-sm text-ink-500">
                                                {item.category} - Stock {item.totalQuantity} {item.unitType} - Requested {item.requested90d}
                                            </p>
                                        </div>
                                        {item.flags.lowStock && <RiskPill value="High" />}
                                    </div>
                                    <p className="mt-2 text-sm text-ink-600">{item.suggestion}</p>
                                </div>
                            ))}
                        </div>
                    </Panel>

                    <Panel title="Stock Prediction" subtitle={prediction.data?.ai?.overview} loading={prediction.loading} error={prediction.error} onRetry={loadPrediction}>
                        <div className="border-b border-ink-100 px-5 py-4">
                            <div className="flex h-4 overflow-hidden rounded-full bg-ink-100">
                                {["High", "Medium", "Low"].map((risk) => {
                                    const count = prediction.data?.predictions?.filter((item) => item.riskLevel === risk).length || 0;
                                    const total = prediction.data?.predictions?.length || 1;
                                    return (
                                        <div
                                            key={risk}
                                            className={risk === "High" ? "bg-hazard-500" : risk === "Medium" ? "bg-specimen-400" : "bg-glove-500"}
                                            style={{ width: `${(count / total) * 100}%` }}
                                            title={`${risk}: ${count}`}
                                        />
                                    );
                                })}
                            </div>
                            <div className="mt-2 flex justify-between text-xs text-ink-500">
                                <span>High risk</span>
                                <span>Medium</span>
                                <span>Low risk</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-ink-100 text-sm">
                                <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
                                    <tr>
                                        <th className="px-5 py-3 font-medium">Item</th>
                                        <th className="px-5 py-3 font-medium">Risk</th>
                                        <th className="px-5 py-3 font-medium">Runout</th>
                                        <th className="px-5 py-3 font-medium">Trend</th>
                                        <th className="px-5 py-3 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-100">
                                    {(prediction.data?.predictions || []).slice(0, 10).map((item) => (
                                        <tr key={item.itemId}>
                                            <td className="px-5 py-3 font-medium text-ink-900">{item.name}</td>
                                            <td className="px-5 py-3"><RiskPill value={item.riskLevel} /></td>
                                            <td className="px-5 py-3 text-ink-600">{item.estimatedDaysUntilRunout ?? "No recent usage"}</td>
                                            <td className="px-5 py-3 text-ink-600">{item.trend}</td>
                                            <td className="px-5 py-3 text-ink-600">{item.recommendation}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Panel>

                    <Panel title="Expiry Risk" subtitle={expiry.data?.ai?.overview} loading={expiry.loading} error={expiry.error} onRetry={loadExpiry}>
                        {(expiry.data?.risks || []).length === 0 ? (
                            <EmptyState icon={Clock} title="No near expiry batches" description="No batch expires within the next 90 days." className="border-none" />
                        ) : (
                            <div className="divide-y divide-ink-100">
                                {(expiry.data?.risks || []).slice(0, 10).map((risk) => (
                                    <div key={`${risk.itemId}-${risk.batchNo}`} className="flex items-start justify-between gap-4 px-5 py-4">
                                        <div className="min-w-0">
                                            <p className="font-medium text-ink-900">{risk.itemName}</p>
                                            <p className="text-sm text-ink-500">
                                                Batch {risk.batchNo} - Qty {risk.quantity} - {risk.daysUntilExpiry} days
                                            </p>
                                            <p className="mt-1 text-sm text-ink-600">{risk.actionSuggestion}</p>
                                        </div>
                                        <RiskPill value={risk.riskCategory} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>
                </div>

                <Card className="flex min-h-[620px] flex-col overflow-hidden">
                    <div className="border-b border-ink-200 px-5 py-4">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="size-5 text-iodine-500" />
                            <h2 className="font-semibold text-ink-900">AI Chatbot</h2>
                        </div>
                        <p className="mt-1 text-sm text-ink-500">Answers use live BioStoreX database context.</p>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto bg-paper-100/60 p-4 scrollbar-thin">
                        {messages.map((message, index) => (
                            <ChatMessage key={index} role={message.role} content={message.content} />
                        ))}
                        {chatLoading && <ChatMessage role="assistant" content="" isStreaming />}
                        {chatError && (
                            <div className="rounded-lg bg-hazard-500/10 px-3 py-2 text-sm text-hazard-600">
                                {chatError}
                            </div>
                        )}
                    </div>

                    <form onSubmit={sendChat} className="flex items-end gap-2 border-t border-ink-200 p-3">
                        <textarea
                            value={chatInput}
                            onChange={(event) => setChatInput(event.target.value)}
                            rows={2}
                            maxLength={1000}
                            placeholder="Ask about ethanol, low stock, expiry, or alternatives..."
                            className="max-h-28 flex-1 resize-none rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-iodine-500 focus:outline-none focus:ring-2 focus:ring-iodine-100"
                        />
                        <Button type="submit" size="icon" loading={chatLoading} disabled={!chatInput.trim()} aria-label="Send AI message">
                            <Send className="size-4" />
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}

function SummaryNote({ title, text }) {
    return (
        <div className="rounded-2xl bg-white/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</p>
            <p className="mt-2 text-sm leading-6 text-ink-700">{text}</p>
        </div>
    );
}
