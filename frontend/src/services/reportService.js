import { api } from "./apiClient.js";

export const reportService = {
    overview: () => api.get("/reports/overview"),
};

