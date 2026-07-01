import { useCallback, useEffect, useState } from "react";
import { requestService } from "../services/requestService.js";
import { getErrorMessage } from "../services/apiClient.js";
import { useAuth } from "./useAuth.js";

const CACHE_TTL_MS = 30 * 1000;
const requestCache = new Map();

export const invalidateRequestsCache = (scope) => {
    if (scope) {
        requestCache.delete(scope);
        return;
    }
    requestCache.clear();
};

export function useRequests(scope = "mine") {
    const { user, initializing } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const authReady = !initializing && Boolean(user);

    const fetchRequests = useCallback(async () => {
        if (!authReady) return;

        const cached = requestCache.get(scope);
        if (cached?.data && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
            setRequests(cached.data);
            setLoading(false);
            return;
        }

        setLoading(!cached?.data);
        setError("");
        try {
            const promise = cached?.promise || (scope === "all" ? requestService.getAll() : requestService.getMine());
            requestCache.set(scope, { data: cached?.data || null, fetchedAt: cached?.fetchedAt || 0, promise });
            const { data } = await promise;
            const next = data.data || [];
            requestCache.set(scope, { data: next, fetchedAt: Date.now(), promise: null });
            setRequests(next);
        } catch (err) {
            setError(getErrorMessage(err, "Couldn't load requests."));
        } finally {
            setLoading(false);
        }
    }, [authReady, scope]);

    useEffect(() => {
        if (!authReady) return;
        fetchRequests();
    }, [authReady, fetchRequests]);

    return { requests, loading, error, refetch: fetchRequests };
}
