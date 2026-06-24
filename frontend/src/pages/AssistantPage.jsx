import { useEffect, useRef, useState } from "react";
import { Sparkles, AlertCircle, FlaskConical } from "lucide-react";
import { usePageHeader } from "../hooks/usePageHeader.js";
import { useAiStatus } from "../hooks/useAiStatus.js";
import { useAuth } from "../hooks/useAuth.js";
import { streamAssistantChat } from "../services/aiService.js";
import EmptyState from "../components/ui/EmptyState.jsx";
import ChatMessage from "../components/ai/ChatMessage.jsx";
import ChatComposer from "../components/ai/ChatComposer.jsx";

const SUGGESTED_PROMPTS = [
    "What items are running low on stock?",
    "How do I request a chemical for my lab work?",
    "What's the status of my pending requests?",
    "Explain the difference between approved and issued",
];

export default function AssistantPage() {
    const { user } = useAuth();
    const { available, checked } = useAiStatus();

    usePageHeader({ title: "Lab Assistant", subtitle: "AI-powered help for inventory and requisitions" });

    const [messages, setMessages] = useState([]);
    const [streaming, setStreaming] = useState(false);
    const [streamError, setStreamError] = useState("");
    const abortRef = useRef(null);
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, streaming]);

    useEffect(() => {
        // Abort any in-flight stream if the user navigates away mid-response.
        return () => abortRef.current?.abort();
    }, []);

    const sendMessage = async (text) => {
        const trimmed = text.trim();
        if (!trimmed || streaming) return;

        setStreamError("");
        const nextMessages = [...messages, { role: "user", content: trimmed }];
        setMessages([...nextMessages, { role: "assistant", content: "" }]);
        setStreaming(true);

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            await streamAssistantChat(
                nextMessages,
                (chunk) => {
                    setMessages((prev) => {
                        const updated = [...prev];
                        const last = updated[updated.length - 1];
                        updated[updated.length - 1] = { ...last, content: last.content + chunk };
                        return updated;
                    });
                },
                controller.signal
            );
        } catch (err) {
            if (err.name !== "AbortError") {
                setStreamError(err.message || "The assistant ran into a problem. Please try again.");
                setMessages((prev) => prev.slice(0, -1)); // drop the empty assistant bubble
            }
        } finally {
            setStreaming(false);
        }
    };

    if (checked && !available) {
        return (
            <EmptyState
                icon={AlertCircle}
                title="Lab Assistant isn't configured yet"
                description="An administrator needs to set GROQ_API_KEY or OPENAI_API_KEY on the server to enable AI features."
            />
        );
    }

    return (
        <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-3xl flex-col">
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto scrollbar-thin pb-4">
                {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-iodine-500/15 text-iodine-500">
                            <FlaskConical className="size-7" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-ink-900">
                                Hi {user?.fullName?.split(" ")[0]}, ask me anything about the lab inventory.
                            </h2>
                            <p className="mt-1 text-sm text-ink-500">
                                I can check stock levels, explain the requisition workflow, and flag what needs attention.
                            </p>
                        </div>
                        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                            {SUGGESTED_PROMPTS.map((prompt) => (
                                <button
                                    key={prompt}
                                    onClick={() => sendMessage(prompt)}
                                    className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-left text-sm text-ink-700 transition-colors hover:border-iodine-300 hover:bg-iodine-500/5"
                                >
                                    <Sparkles className="size-3.5 shrink-0 text-iodine-500" />
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <ChatMessage
                            key={i}
                            role={msg.role}
                            content={msg.content}
                            isStreaming={streaming && i === messages.length - 1 && msg.role === "assistant"}
                        />
                    ))
                )}

                {streamError && (
                    <div className="flex items-center gap-2 rounded-lg bg-hazard-500/10 px-4 py-3 text-sm text-hazard-600">
                        <AlertCircle className="size-4 shrink-0" />
                        {streamError}
                    </div>
                )}
            </div>

            <ChatComposer onSend={sendMessage} disabled={streaming} />
        </div>
    );
}
