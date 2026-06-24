import { useEffect, useState } from "react";
import { aiService } from "../services/aiService.js";

let cachedStatus = null; // module-level cache — avoids re-checking on every mount

export function useAiStatus() {
    const [available, setAvailable] = useState(cachedStatus ?? false);
    const [checked, setChecked] = useState(cachedStatus !== null);

    useEffect(() => {
        if (cachedStatus !== null) return;

        let cancelled = false;
        aiService
            .getStatus()
            .then(({ data }) => {
                if (cancelled) return;
                cachedStatus = Boolean(data.data.configured);
                setAvailable(cachedStatus);
            })
            .catch(() => {
                if (cancelled) return;
                cachedStatus = false;
                setAvailable(false);
            })
            .finally(() => {
                if (!cancelled) setChecked(true);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return { available, checked };
}
