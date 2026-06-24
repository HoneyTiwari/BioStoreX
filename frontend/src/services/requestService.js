import { api } from "./apiClient.js";

export const requestService = {
    create: (payload) => api.post("/request/request-item", payload),
    getAll: () => api.get("/request/all-requests"),
    getMine: () => api.get("/request/my-requests"),
    approve: (id) => api.put(`/request/approve/${id}`),
    decline: (id, reason) => api.put(`/request/decline/${id}`, { reason }),
    issue: (id) => api.put(`/request/issue/${id}`),
    returnItem: (id, payload) => api.put(`/request/return/${id}`, payload),
};
