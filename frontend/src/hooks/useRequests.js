import { useCallback, useEffect, useState } from "react";
import { requestService } from "../services/requestService.js";
import { getErrorMessage } from "../services/apiClient.js";
import { useAuth } from "./useAuth.js";

export function useRequests(scope = "mine") {
    const { user, initializing } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const authReady = !initializing && Boolean(user);

    const fetchRequests = useCallback(async () => {
        if (!authReady) return;

        setLoading(true);
        setError("");
        try {
            const { data } = scope === "all" ? await requestService.getAll() : await requestService.getMine();
            setRequests(data.data || []);
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
