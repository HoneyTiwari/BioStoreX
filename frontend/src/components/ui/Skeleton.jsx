import clsx from "clsx";

/** Generic shimmer placeholder block — compose into card/table skeletons. */
export default function Skeleton({ className }) {
    return <div className={clsx("animate-shimmer rounded-md bg-ink-100", className)} aria-hidden="true" />;
}

export function ItemCardSkeleton() {
    return (
        <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-start gap-3">
                <Skeleton className="size-12 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <div className="mt-4 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
            </div>
        </div>
    );
}

export function TableRowSkeleton({ cols = 4 }) {
    return (
        <tr>
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-32" />
                </td>
            ))}
        </tr>
    );
}
