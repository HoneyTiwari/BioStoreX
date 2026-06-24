import { useState, useCallback, useMemo } from "react";
import { PageHeaderContext } from "./pageHeaderContextDefinition.js";

export function PageHeaderProvider({ children }) {
    const [header, setHeader] = useState({ title: "BioStoreX", subtitle: "", actions: null });

    const setPageHeader = useCallback((next) => {
        setHeader((prev) => ({ ...prev, ...next }));
    }, []);

    const value = useMemo(() => ({ header, setPageHeader }), [header, setPageHeader]);

    return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}
