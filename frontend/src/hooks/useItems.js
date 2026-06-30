import { useCallback, useEffect, useState } from "react";
import { itemService } from "../services/itemService.js";
import { getErrorMessage } from "../services/apiClient.js";
import { useAuth } from "./useAuth.js";

export function useItems() {
    const { user, initializing } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const authReady = !initializing && Boolean(user);

    const fetchItems = useCallback(async () => {
        if (!authReady) return;

        setLoading(true);
        setError("");
        try {
            const { data } = await itemService.getAll();
            setItems(data.data || []);
        } catch (err) {
            setError(getErrorMessage(err, "Couldn't load inventory."));
        } finally {
            setLoading(false);
        }
    }, [authReady]);

    useEffect(() => {
        if (!authReady) return;
        fetchItems();
    }, [authReady, fetchItems]);

    return { items, loading, error, refetch: fetchItems };
}
