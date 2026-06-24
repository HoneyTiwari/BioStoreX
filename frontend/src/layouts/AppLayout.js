import { useCallback, useEffect, useState } from "react";
import { requestService } from "../services/requestService.js";
import { getErrorMessage } from "../services/apiClient.js";

export function useRequests(scope = "mine") {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchRequests = useCallback(async () => {
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
    }, [scope]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    return { requests, loading, error, refetch: fetchRequests };
}
