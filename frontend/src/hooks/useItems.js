import { useCallback, useEffect, useState } from "react";
import { itemService } from "../services/itemService.js";
import { getErrorMessage } from "../services/apiClient.js";

export function useItems() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchItems = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    return { items, loading, error, refetch: fetchItems };
}
