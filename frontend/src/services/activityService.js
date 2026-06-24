import { api } from "./apiClient.js";

export const activityService = {
    logs: () => api.get("/activity/logs"),
};

