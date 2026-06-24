import { useEffect, useState } from "react";

/** Returns a debounced copy of `value` that updates `delay`ms after the last change. */
export function useDebouncedValue(value, delay = 350) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}
