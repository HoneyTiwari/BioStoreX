import { useState, useRef } from "react";
import { Send } from "lucide-react";
import { Spinner } from "../ui/Spinner.jsx";

export default function ChatComposer({ onSend, disabled }) {
    const [value, setValue] = useState("");
    const textareaRef = useRef(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!value.trim() || disabled) return;
        onSend(value);
        setValue("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleInput = (e) => {
        setValue(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-ink-200 pt-3">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask about stock, requests, or lab procedures…"
                rows={1}
                disabled={disabled}
                className="max-h-32 flex-1 resize-none rounded-xl border border-ink-300 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-iodine-500 focus:outline-none focus:ring-2 focus:ring-iodine-100 disabled:bg-ink-50"
            />
            <button
                type="submit"
                disabled={disabled || !value.trim()}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-iodine-500 text-white transition-colors hover:bg-iodine-600 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400"
                aria-label="Send message"
            >
                {disabled ? <Spinner className="size-4 text-current" /> : <Send className="size-4" />}
            </button>
        </form>
    );
}
