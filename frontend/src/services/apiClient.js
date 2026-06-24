import axios from "axios";

/**
 * Base URL resolution:
 * - In dev, Vite proxies /api to the backend (see vite.config.js), so a
 *   relative path works out of the box.
 * - In production, set VITE_API_BASE_URL to the deployed backend's origin.
 */
const baseURL = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;

export const api = axios.create({
    baseURL,
    withCredentials: true, // send/receive httpOnly refresh/access cookies
    timeout: 20000,
});

// In-memory access token (kept out of localStorage to reduce XSS exposure;
// the httpOnly cookie set by the server is the durable source of truth —
// this is just a fast path so we don't have to read cookies from JS).
let accessToken = null;

export const setAccessToken = (token) => {
    accessToken = token;
};

export const getAccessToken = () => accessToken;

api.interceptors.request.use((config) => {
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});

let refreshPromise = null;

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;

        // Don't try to refresh for the auth endpoints themselves, and only
        // retry once per request.
        const isAuthRoute = originalRequest?.url?.includes("/user/login") ||
            originalRequest?.url?.includes("/user/refresh-token");

        if (status === 401 && !originalRequest._retry && !isAuthRoute) {
            originalRequest._retry = true;

            try {
                // Coalesce concurrent 401s into a single refresh call.
                if (!refreshPromise) {
                    refreshPromise = api.post("/user/refresh-token").finally(() => {
                        refreshPromise = null;
                    });
                }
                const { data } = await refreshPromise;
                setAccessToken(data?.data?.accessToken || null);
                return api(originalRequest);
            } catch (refreshError) {
                setAccessToken(null);
                // Let the caller (AuthContext) react to this by redirecting to login.
                window.dispatchEvent(new CustomEvent("biostorex:session-expired"));
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

/**
 * Extracts a human-readable error message from an Axios error, falling back
 * gracefully when the backend didn't return the expected ApiError shape.
 */
export const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
    if (error?.response?.data?.message) return error.response.data.message;
    if (error?.message === "Network Error") return "Can't reach the server. Check your connection and try again.";
    if (error?.code === "ECONNABORTED") return "The request timed out. Please try again.";
    return fallback;
};
