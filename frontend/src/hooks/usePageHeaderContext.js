import { useContext } from "react";
import { PageHeaderContext } from "../context/pageHeaderContextDefinition.js";

export function usePageHeaderContext() {
    const ctx = useContext(PageHeaderContext);
    if (!ctx) throw new Error("usePageHeaderContext must be used within PageHeaderProvider");
    return ctx;
}
