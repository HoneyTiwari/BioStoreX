import clsx from "clsx";

/**
 * Used whenever a list/table has nothing to show — gives the user a clear
 * next action instead of a blank panel.
 */
export default function EmptyState({ icon: Icon, title, description, action, className }) {
    return (
        <div className={clsx("glass-panel flex flex-col items-center justify-center gap-3 rounded-2xl border-dashed px-6 py-14 text-center", className)}>
            {Icon && (
                <div className="flex size-12 items-center justify-center rounded-2xl bg-glove-500/10 text-glove-600 shadow-sm">
                    <Icon className="size-6" />
                </div>
            )}
            <div className="space-y-1">
                <p className="text-sm font-semibold text-ink-800">{title}</p>
                {description && <p className="text-sm text-ink-500 max-w-sm">{description}</p>}
            </div>
            {action}
        </div>
    );
}
