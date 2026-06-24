import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { PageLoader } from "../ui/Spinner.jsx";

/** Wrap routes that require any authenticated user. */
export function ProtectedRoute() {
    const { user, initializing } = useAuth();
    const location = useLocation();

    if (initializing) return <PageLoader />;

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return <Outlet />;
}

/** Wrap routes that require the current user to have one of `roles`. */
export function RoleRoute({ roles }) {
    const { user, initializing } = useAuth();

    if (initializing) return <PageLoader />;

    if (!user) return <Navigate to="/login" replace />;

    if (!roles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}

/** Wrap public-only routes (login/register) so logged-in users skip them. */
export function PublicOnlyRoute() {
    const { user, initializing } = useAuth();

    if (initializing) return <PageLoader />;
    if (user) return <Navigate to="/dashboard" replace />;

    return <Outlet />;
}
