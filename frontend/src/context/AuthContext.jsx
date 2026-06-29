
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { authService } from "../services/authService.js";
import { getErrorMessage, setAuthTokens } from "../services/apiClient.js";
import { AuthContext } from "./authContextDefinition.js";

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    // `initializing` covers the very first session-restore attempt on app
    // load; `authLoading` covers in-flight login/register/logout actions.
    const [initializing, setInitializing] = useState(true);
    const [authLoading, setAuthLoading] = useState(false);

    // Try to restore a session on first load using the httpOnly refresh
    // cookie (if present). The apiClient's 401 interceptor will attempt a
    // refresh automatically when /user/me fails with 401.
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const { data } = await authService.me();
                if (!cancelled) setUser(data.data);
            } catch {
                if (!cancelled) setUser(null);
            } finally {
                if (!cancelled) setInitializing(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    // If the apiClient detects a refresh failure mid-session, log the user out client-side.
    useEffect(() => {
        const handler = () => {
            setUser(null);
            toast.error("Your session expired. Please log in again.");
        };
        window.addEventListener("biostorex:session-expired", handler);
        return () => window.removeEventListener("biostorex:session-expired", handler);
    }, []);

    const login = useCallback(async (credentials) => {
        setAuthLoading(true);
        try {
            const { data } = await authService.login(credentials);
            setAuthTokens({
                accessToken: data.data.accessToken,
                refreshToken: data.data.refreshToken,
            });
            setUser(data.data.user);
            toast.success(`Welcome back, ${data.data.user.fullName.split(" ")[0]}!`);
            return data.data.user;
        } catch (error) {
            toast.error(getErrorMessage(error, "Login failed. Check your credentials."));
            throw error;
        } finally {
            setAuthLoading(false);
        }
    }, []);

    const register = useCallback(async (payload) => {
        setAuthLoading(true);
        try {
            const { data } = await authService.register(payload);
            toast.success(data.message, { duration: 6000 });
            return data.data;
        } catch (error) {
            toast.error(getErrorMessage(error, "Registration failed."));
            throw error;
        } finally {
            setAuthLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await authService.logout();
        } catch {
            // Even if the server call fails, clear local state so the user
            // isn't stuck appearing logged-in.
        } finally {
            setAuthTokens();
            setUser(null);
            toast.success("Logged out");
        }
    }, []);

    const refreshCurrentUser = useCallback(async () => {
        try {
            const { data } = await authService.me();
            setUser(data.data);
        } catch {
            // Ignore; handled elsewhere.
        }
    }, []);

    const value = useMemo(
        () => ({ user, setUser, initializing, authLoading, login, register, logout, refreshCurrentUser }),
        [user, initializing, authLoading, login, register, logout, refreshCurrentUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
