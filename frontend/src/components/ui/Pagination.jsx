import Button from "./Button.jsx";

export default function Pagination({ page, totalPages, pageSize, onPageChange, onPageSizeChange }) {
    if (totalPages <= 1 && !onPageSizeChange) return null;

    return (
        <div className="flex flex-col gap-3 border-t border-ink-200/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-ink-500">
                Page <span className="font-mono text-ink-900">{page}</span> of <span className="font-mono text-ink-900">{Math.max(totalPages, 1)}</span>
            </div>
            <div className="flex items-center gap-2">
                {onPageSizeChange && (
                    <select
                        value={pageSize}
                        onChange={(event) => onPageSizeChange(Number(event.target.value))}
                        className="h-9 rounded-xl border border-ink-200 bg-white/80 px-2 text-sm text-ink-700"
                    >
                        {[5, 10, 20, 50].map((size) => <option key={size} value={size}>{size}/page</option>)}
                    </select>
                )}
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
            </div>
        </div>
    );
}

