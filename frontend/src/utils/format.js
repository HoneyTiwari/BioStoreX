/** Formats an ISO date string as a short, readable date (e.g. "12 Jun 2026"). */
export function formatDate(dateInput) {
    if (!dateInput) return "—";
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Relative time, e.g. "2 hours ago" — used in activity/request lists. */
export function formatRelativeTime(dateInput) {
    if (!dateInput) return "—";
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "—";

    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHr = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return formatDate(dateInput);
}

/** Returns the soonest-expiring batch's date, or null if no batches have one. */
export function getSoonestExpiry(batches = []) {
    const dated = batches.filter((b) => b.expiryDate).map((b) => new Date(b.expiryDate));
    if (dated.length === 0) return null;
    return new Date(Math.min(...dated.map((d) => d.getTime())));
}

/** True if a date falls within the next `days` days (and hasn't already passed). */
export function isExpiringSoon(date, days = 30) {
    if (!date) return false;
    const target = new Date(date);
    const now = new Date();
    const diffDays = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= days;
}

export function isExpired(date) {
    if (!date) return false;
    return new Date(date).getTime() < Date.now();
}

/** Stock level classification used to drive badge color and dashboard stats. */
export function getStockLevel(totalQuantity, minThreshold) {
    if (totalQuantity <= 0) return "out";
    if (totalQuantity <= minThreshold) return "low";
    return "ok";
}

export function titleCase(str = "") {
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
}
