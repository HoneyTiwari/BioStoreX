import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ProtectedRoute, RoleRoute, PublicOnlyRoute } from "./components/layout/RouteGuards.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import ErrorBoundary from "./components/ui/ErrorBoundary.jsx";
import { SectionLoader } from "./components/ui/Spinner.jsx";

const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const RegisterPage = lazy(() => import("./pages/RegisterPage.jsx"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const InventoryPage = lazy(() => import("./pages/InventoryPage.jsx"));
const AddStockPage = lazy(() => import("./pages/AddStockPage.jsx"));
const MyRequestsPage = lazy(() => import("./pages/MyRequestsPage.jsx"));
const RequestsManagementPage = lazy(() => import("./pages/RequestsManagementPage.jsx"));
const UsersManagementPage = lazy(() => import("./pages/UsersManagementPage.jsx"));
const PendingStudentsPage = lazy(() => import("./pages/PendingStudentsPage.jsx"));
const AssistantPage = lazy(() => import("./pages/AssistantPage.jsx"));
const AiDashboardPage = lazy(() => import("./pages/AiDashboardPage.jsx"));
const ReportsPage = lazy(() => import("./pages/ReportsPage.jsx"));
const ActivityLogsPage = lazy(() => import("./pages/ActivityLogsPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));

export default function App() {
    return (
        <ErrorBoundary>
            <HashRouter>
                <AuthProvider>
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: "#13202E",
                                color: "#fff",
                                fontSize: "0.875rem",
                                borderRadius: "0.5rem",
                            },
                            success: { iconTheme: { primary: "#2E7D6B", secondary: "#fff" } },
                            error: { iconTheme: { primary: "#C0432F", secondary: "#fff" } },
                        }}
                    />

                    <Suspense fallback={<SectionLoader label="Loading page..." />}>
                        <Routes>
                            {/* Public-only routes */}
                            <Route element={<PublicOnlyRoute />}>
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/register" element={<RegisterPage />} />
                                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                            </Route>

                        {/* Authenticated app shell */}
                            <Route element={<ProtectedRoute />}>
                                <Route element={<AppLayout />}>
                                    <Route path="/dashboard" element={<DashboardPage />} />
                                    <Route path="/inventory" element={<InventoryPage />} />
                                    <Route path="/assistant" element={<AssistantPage />} />
                                    <Route path="/profile" element={<ProfilePage />} />

                                {/* Student-only */}
                                    <Route element={<RoleRoute roles={["Student"]} />}>
                                        <Route path="/my-requests" element={<MyRequestsPage />} />
                                    </Route>

                                {/* Storekeeper + Admin inventory management */}
                                    <Route element={<RoleRoute roles={["Storekeeper", "Admin"]} />}>
                                        <Route path="/add-stock" element={<AddStockPage />} />
                                    </Route>

                                {/* Storekeeper + Admin */}
                                    <Route element={<RoleRoute roles={["Storekeeper", "Admin"]} />}>
                                        <Route path="/requests" element={<RequestsManagementPage />} />
                                        <Route path="/pending-students" element={<PendingStudentsPage />} />
                                        <Route path="/reports" element={<ReportsPage />} />
                                        <Route path="/activity" element={<ActivityLogsPage />} />
                                        <Route path="/ai-dashboard" element={<AiDashboardPage />} />
                                    </Route>

                                {/* Admin-only */}
                                    <Route element={<RoleRoute roles={["Admin"]} />}>
                                        <Route path="/users" element={<UsersManagementPage />} />
                                    </Route>
                                </Route>
                            </Route>

                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </Suspense>
                </AuthProvider>
            </HashRouter>
        </ErrorBoundary>
    );
}
