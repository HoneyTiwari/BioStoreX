import { FlaskConical, User } from "lucide-react";
import clsx from "clsx";

/**
 * Renders a constrained subset of markdown (bold, bullet lists, line
 * breaks) as React elements — deliberately not using
 * dangerouslySetInnerHTML, since this text comes from an LLM response.
 */
function FormattedText({ text }) {
    const blocks = text.split(/\n{2,}/);

    return (
        <div className="space-y-2">
            {blocks.map((block, i) => {
                const lines = block.split("\n").filter((l) => l.trim());
                const isList = lines.length > 0 && lines.every((l) => /^[-*]\s/.test(l.trim()));

                if (isList) {
                    return (
                        <ul key={i} className="space-y-1 pl-1">
                            {lines.map((line, j) => (
                                <li key={j} className="flex gap-2">
                                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-current opacity-60" />
                                    <span>{renderInline(line.replace(/^[-*]\s/, ""))}</span>
                                </li>
                            ))}
                        </ul>
                    );
                }

                return (
                    <p key={i} className="leading-relaxed">
                        {lines.map((line, j) => (
                            <span key={j}>
                                {renderInline(line)}
                                {j < lines.length - 1 && <br />}
                            </span>
                        ))}
                    </p>
                );
            })}
        </div>
    );
}

function renderInline(line) {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
            <strong key={i} className="font-semibold">
                {part.slice(2, -2)}
            </strong>
        ) : (
            <span key={i}>{part}</span>
        )
    );
}

export default function ChatMessage({ role, content, isStreaming }) {
    const isUser = role === "user";

    return (
        <div className={clsx("flex gap-3", isUser && "flex-row-reverse")}>
            <div
                className={clsx(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    isUser ? "bg-ink-900 text-white" : "bg-iodine-500/15 text-iodine-600"
                )}
            >
                {isUser ? <User className="size-4" /> : <FlaskConical className="size-4" />}
            </div>
            <div
                className={clsx(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                    isUser ? "bg-ink-900 text-white rounded-tr-sm" : "bg-white border border-ink-200 text-ink-800 rounded-tl-sm"
                )}
            >
                {content ? (
                    <FormattedText text={content} />
                ) : isStreaming ? (
                    <span className="inline-flex gap-1 py-1">
                        <span className="size-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:-0.3s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:-0.15s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-ink-400" />
                    </span>
                ) : null}
                {isStreaming && content && (
                    <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse-soft bg-current align-text-bottom" />
                )}
            </div>
        </div>
    );
}
