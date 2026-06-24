import { api } from "./apiClient.js";

export const itemService = {
    getAll: () => api.get("/item/all"),
    getById: (id) => api.get(`/item/${id}`),
    search: (q, category) => api.get("/item/search", { params: { q, category } }),
    addStock: (formData) =>
        api.post("/item/add-stock", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        }),
    removeStock: (payload) => api.post("/item/remove-stock", payload),
};
