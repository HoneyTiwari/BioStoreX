import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "../components/layout/Sidebar.jsx";
import Topbar from "../components/layout/Topbar.jsx";
import { PageHeaderProvider } from "../context/PageHeaderContext.jsx";
import { usePageHeaderContext } from "../hooks/usePageHeaderContext.js";

function AppFrame() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { header } = usePageHeaderContext();
    const location = useLocation();

    return (
        <div className="min-h-screen text-ink-900">
            <div className="flex min-h-screen">
                <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

                <div className="flex min-w-0 flex-1 flex-col lg:pl-2">
                    <Topbar
                        onOpenMobileMenu={() => setMobileOpen(true)}
                        title={header.title}
                        subtitle={header.subtitle}
                        actions={header.actions}
                    />
                    <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                            >
                                <Outlet />
                            </motion.div>
                        </AnimatePresence>
                    </main>
                </div>
            </div>
        </div>
    );
}

export default function AppLayout() {
    return (
        <PageHeaderProvider>
            <AppFrame />
        </PageHeaderProvider>
    );
}
