import { useEffect, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import Card from "../ui/Card.jsx";
import { Spinner } from "../ui/Spinner.jsx";
import { aiService } from "../../services/aiService.js";
import { useAiStatus } from "../../hooks/useAiStatus.js";

/** Renders a small amount of trusted markdown (bold + bullets) from the AI response. */
function MiniMarkdown({ text }) {
    const lines = text.split("\n").filter(Boolean);
    return (
        <ul className="space-y-2">
            {lines.map((line, i) => {
                const cleaned = line.replace(/^[-*]\s*/, "");
                const parts = cleaned.split(/(\*\*[^*]+\*\*)/g);
                return (
                    <li key={i} className="flex gap-2 text-sm text-ink-700">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-iodine-500" />
                        <span>
                            {parts.map((part, j) =>
                                part.startsWith("**") ? (
                                    <strong key={j} className="font-semibold text-ink-900">
                                        {part.slice(2, -2)}
                                    </strong>
                                ) : (
                                    <span key={j}>{part}</span>
                                )
                            )}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

export default function RestockInsights() {
    const { available } = useAiStatus();
    const [insights, setInsights] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [fetched, setFetched] = useState(false);

    const fetchInsights = async () => {
        setLoading(true);
        setError("");
        try {
            const { data } = await aiService.restockInsights();
            setInsights(data.data.insights);
        } catch {
            setError("Couldn't generate insights right now.");
        } finally {
            setLoading(false);
            setFetched(true);
        }
    };

    useEffect(() => {
        if (available) fetchInsights();
    }, [available]);

    if (!available) return null;

    return (
        <Card className="p-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-ink-900">
                    <Sparkles className="size-4 text-iodine-500" />
                    <h3 className="font-semibold">AI restock insights</h3>
                </div>
                <button
                    onClick={fetchInsights}
                    disabled={loading}
                    className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-50"
                    aria-label="Refresh insights"
                >
                    <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>

            <div className="mt-3">
                {loading && !fetched ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-ink-400">
                        <Spinner className="size-4" />
                        Analyzing inventory…
                    </div>
                ) : error ? (
                    <p className="text-sm text-hazard-600">{error}</p>
                ) : (
                    <MiniMarkdown text={insights} />
                )}
            </div>
        </Card>
    );
}
