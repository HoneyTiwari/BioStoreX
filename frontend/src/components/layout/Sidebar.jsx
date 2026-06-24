import { NavLink } from "react-router-dom";
import { FlaskConical, LogOut, Sparkles, X } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../../hooks/useAuth.js";
import { NAV_ITEMS_BY_ROLE, ROLE_LABELS } from "../../utils/navConfig.js";

export default function Sidebar({ mobileOpen, onCloseMobile }) {
    const { user, logout } = useAuth();
    const navItems = NAV_ITEMS_BY_ROLE[user?.role] || [];

    const content = (
        <div className="glass-panel flex h-full flex-col border-r-0 bg-white/72 text-ink-700 lg:m-3 lg:rounded-3xl">
            <div className="flex items-center gap-2.5 px-5 py-5">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-ink-950 text-white shadow-card">
                    <FlaskConical className="size-5" />
                </div>
                <div>
                    <p className="font-semibold tracking-tight text-ink-950">BioStoreX</p>
                    <p className="text-[11px] font-medium text-ink-500">Lab Inventory System</p>
                </div>
                <button
                    onClick={onCloseMobile}
                    className="ml-auto rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900 lg:hidden"
                    aria-label="Close menu"
                >
                    <X className="size-5" />
                </button>
            </div>

            <div className="mx-3 mb-3 rounded-2xl border border-glove-400/20 bg-glove-500/10 p-3 text-xs text-ink-600">
                <div className="flex items-center gap-2 font-semibold text-glove-600">
                    <Sparkles className="size-3.5" />
                    Smart inventory
                </div>
                <p className="mt-1 leading-relaxed">Track stock, expiry and requests in one workspace.</p>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 scrollbar-thin">
                {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        onClick={onCloseMobile}
                        className={({ isActive }) =>
                            clsx(
                                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                                isActive
                                    ? "bg-ink-950 text-white shadow-card"
                                    : "text-ink-600 hover:bg-white hover:text-ink-950"
                            )
                        }
                    >
                        <Icon className="size-4.5 shrink-0" />
                        {label}
                    </NavLink>
                ))}
            </nav>

            <div className="border-t border-ink-200/70 p-3">
                <NavLink
                    to="/profile"
                    onClick={onCloseMobile}
                    className="flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-white"
                >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-glove-500 to-iodine-500 font-mono text-xs font-semibold text-white shadow-card">
                        {user?.fullName?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-950">{user?.fullName}</p>
                        <p className="truncate text-xs text-ink-500">{ROLE_LABELS[user?.role] || user?.role}</p>
                    </div>
                </NavLink>
                <button
                    onClick={logout}
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-hazard-500/10 hover:text-hazard-500"
                >
                    <LogOut className="size-4.5" />
                    Log out
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden lg:block lg:w-72 lg:shrink-0">
                <div className="fixed inset-y-0 left-0 w-72">{content}</div>
            </aside>

            {/* Mobile drawer */}
            <div
                className={clsx(
                    "fixed inset-0 z-40 lg:hidden transition-opacity",
                    mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                )}
            >
                <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={onCloseMobile} aria-hidden="true" />
                <div
                    className={clsx(
                        "absolute inset-y-0 left-0 w-72 transition-transform duration-200",
                        mobileOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                >
                    {content}
                </div>
            </div>
        </>
    );
}
