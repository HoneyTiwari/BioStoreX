import {
    LayoutDashboard,
    Boxes,
    ClipboardList,
    Users,
    Sparkles,
    PackagePlus,
    UserCheck,
    BrainCircuit,
    FileText,
    Activity,
} from "lucide-react";

/**
 * Single source of truth for which nav items each role sees. Keeping this
 * centralized avoids scattering role checks across the Sidebar JSX.
 */
export const NAV_ITEMS_BY_ROLE = {
    Student: [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/inventory", label: "Inventory", icon: Boxes },
        { to: "/my-requests", label: "My Requests", icon: ClipboardList },
        { to: "/assistant", label: "Lab Assistant", icon: Sparkles },
    ],
    Storekeeper: [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/inventory", label: "Inventory", icon: Boxes },
        { to: "/add-stock", label: "Add Stock", icon: PackagePlus },
        { to: "/requests", label: "Requests", icon: ClipboardList },
        { to: "/pending-students", label: "Pending Students", icon: UserCheck },
        { to: "/reports", label: "Reports", icon: FileText },
        { to: "/activity", label: "Activity Logs", icon: Activity },
        { to: "/ai-dashboard", label: "AI Dashboard", icon: BrainCircuit },
        { to: "/assistant", label: "Lab Assistant", icon: Sparkles },
    ],
    Admin: [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/inventory", label: "Inventory", icon: Boxes },
        { to: "/add-stock", label: "Add Stock", icon: PackagePlus },
        { to: "/requests", label: "Requests", icon: ClipboardList },
        { to: "/users", label: "Users", icon: Users },
        { to: "/pending-students", label: "Pending Students", icon: UserCheck },
        { to: "/reports", label: "Reports", icon: FileText },
        { to: "/activity", label: "Activity Logs", icon: Activity },
        { to: "/ai-dashboard", label: "AI Dashboard", icon: BrainCircuit },
        { to: "/assistant", label: "Lab Assistant", icon: Sparkles },
    ],
};

export const ROLE_LABELS = {
    Student: "Student",
    Storekeeper: "Storekeeper",
    Admin: "Administrator",
};

// Category metadata reused across item cards, badges, and the add-stock form.
export const CATEGORY_META = {
    CHEMICAL: { label: "Chemical", colorVar: "var(--color-cat-chemical)" },
    GLASSWARE: { label: "Glassware", colorVar: "var(--color-cat-glassware)" },
    CONSUMABLE: { label: "Consumable", colorVar: "var(--color-cat-consumable)" },
    BIO_MATERIAL: { label: "Bio Material", colorVar: "var(--color-cat-bio)" },
    EQUIPMENT: { label: "Equipment", colorVar: "var(--color-cat-equipment)" },
};

export const UNIT_TYPES = ["g", "mg", "kg", "mL", "L", "pieces", "box", "pack"];
