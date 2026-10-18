import { api } from "./apiClient.js";

export const authService = {
    register: (payload) => api.post("/user/register", payload),
    login: (payload) => api.post("/user/login", payload),
    logout: () => api.post("/user/logout"),
    me: () => api.get("/user/me"),
    changePassword: (payload) => api.patch("/user/change-password", payload),
    updateProfile: (payload) => api.patch("/user/update-profile", payload),
    // Render's free backend may need 50+ seconds to wake after inactivity.
    forgotPassword: (payload) => api.post("/user/forgot-password", payload, { timeout: 90000 }),
    resetPassword: (payload) => api.post("/user/reset-password", payload, { timeout: 90000 }),
};
