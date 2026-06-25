import { Menu, Search } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { ROLE_LABELS } from "../../utils/navConfig.js";

export default function Topbar({ onOpenMobileMenu, title, subtitle, actions }) {
    const { user } = useAuth();

    return (
        <header className="sticky top-0 z-30 mx-0 flex items-center gap-3 border-b border-white/60 bg-paper-100/75 px-4 py-4 backdrop-blur-xl sm:px-6 md:mx-4 md:mt-3 md:rounded-3xl md:border md:border-ink-200/60 md:bg-white/62 md:shadow-card">
            <button
                onClick={onOpenMobileMenu}
                className="rounded-xl p-2 text-ink-600 hover:bg-white md:hidden"
                aria-label="Open menu"
            >
                <Menu className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-semibold tracking-tight text-ink-950 sm:text-2xl">{title}</h1>
                {subtitle && <p className="truncate text-sm text-ink-500">{subtitle}</p>}
            </div>
            <div className="hidden min-w-56 items-center gap-2 rounded-2xl border border-ink-200/70 bg-white/70 px-3 py-2 text-sm text-ink-400 shadow-sm xl:flex">
                <Search className="size-4" />
                <span>Search inventory</span>
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
            <div className="hidden items-center gap-3 rounded-2xl border border-ink-200/70 bg-white/70 px-3 py-2 shadow-sm md:flex">
                <div className="text-right">
                    <p className="max-w-32 truncate text-sm font-semibold text-ink-900">{user?.fullName}</p>
                    <p className="text-xs text-ink-500">{ROLE_LABELS[user?.role] || user?.role}</p>
                </div>
                <div className="flex size-9 items-center justify-center rounded-xl bg-ink-950 font-mono text-xs font-semibold text-white">
                    {user?.fullName?.slice(0, 2).toUpperCase()}
                </div>
            </div>
        </header>
    );
}
