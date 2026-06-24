import { api } from "./apiClient.js";

export const adminService = {
    addStorekeeper: (payload) => api.post("/admin/add-storekeeper", payload),
    getAllUsers: () => api.get("/admin/users"),
    blacklist: (userId) => api.patch(`/admin/blacklist/${userId}`),
    unblacklist: (userId) => api.patch(`/admin/unblacklist/${userId}`),
    getPendingStudents: () => api.get("/admin/pending-students"),
    approveStudent: (userId) => api.patch(`/admin/approve-student/${userId}`),
    rejectStudent: (userId) => api.delete(`/admin/reject-student/${userId}`),
};
