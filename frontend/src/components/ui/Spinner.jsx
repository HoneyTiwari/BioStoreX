import { Loader2, FlaskConical } from "lucide-react";

export function Spinner({ className = "size-5" }) {
    return <Loader2 className={`animate-spin text-iodine-500 ${className}`} aria-hidden="true" />;
}

/** Full-viewport loading state shown while the session/app bootstraps. */
export function PageLoader({ label = "Loading BioStoreX…" }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper-100">
            <div className="relative">
                <FlaskConical className="size-10 text-iodine-500 animate-pulse-soft" />
            </div>
            <p className="text-sm text-ink-500">{label}</p>
        </div>
    );
}

/** Inline loading block for a section/panel that's mid-fetch. */
export function SectionLoader({ label = "Loading…" }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-ink-400">
            <Spinner className="size-6" />
            <p className="text-sm">{label}</p>
        </div>
    );
}
