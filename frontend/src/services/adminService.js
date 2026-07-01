import { api } from "./apiClient.js";

export const adminService = {
    addStorekeeper: (payload) => api.post("/admin/add-storekeeper", payload),
    getAllUsers: (params) => api.get("/admin/users", { params }),
    blacklist: (userId) => api.patch(`/admin/blacklist/${userId}`),
    unblacklist: (userId) => api.patch(`/admin/unblacklist/${userId}`),
    getPendingStudents: () => api.get("/admin/pending-students"),
    getPendingStudentCount: () => api.get("/admin/pending-students", { params: { count: "true" } }),
    approveStudent: (userId) => api.patch(`/admin/approve-student/${userId}`),
    rejectStudent: (userId) => api.delete(`/admin/reject-student/${userId}`),
};
