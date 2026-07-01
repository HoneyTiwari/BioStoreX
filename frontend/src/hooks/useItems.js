import { useCallback, useEffect, useState } from "react";
import { itemService } from "../services/itemService.js";
import { getErrorMessage } from "../services/apiClient.js";
import { useAuth } from "./useAuth.js";

const CACHE_TTL_MS = 60 * 1000;
let itemsCache = { data: null, fetchedAt: 0, promise: null };

export const invalidateItemsCache = () => {
    itemsCache = { data: null, fetchedAt: 0, promise: null };
};

export function useItems() {
    const { user, initializing } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const authReady = !initializing && Boolean(user);

    const fetchItems = useCallback(async () => {
        if (!authReady) return;

        const fresh = itemsCache.data && Date.now() - itemsCache.fetchedAt < CACHE_TTL_MS;
        if (fresh) {
            setItems(itemsCache.data);
            setLoading(false);
            return;
        }

        setLoading(!itemsCache.data);
        setError("");
        try {
            itemsCache.promise ||= itemService.getAll().finally(() => {
                itemsCache.promise = null;
            });
            const { data } = await itemsCache.promise;
            itemsCache = { data: data.data || [], fetchedAt: Date.now(), promise: null };
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
