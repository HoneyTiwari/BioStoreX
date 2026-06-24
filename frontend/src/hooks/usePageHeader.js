import { useEffect } from "react";
import { usePageHeaderContext } from "./usePageHeaderContext.js";

/**
 * Call from any page component to set the shared Topbar's title/subtitle/
 * actions for as long as that page is mounted.
 *
 * Example: usePageHeader({ title: "Inventory", subtitle: "342 items" });
 */
export function usePageHeader({ title, subtitle = "", actions = null }) {
    const { setPageHeader } = usePageHeaderContext();

    useEffect(() => {
        setPageHeader({ title, subtitle, actions });
        // We intentionally don't reset on unmount — the next page's mount
        // will overwrite it before the user perceives the old title, and
        // resetting first causes a visible title flash during navigation.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, subtitle, actions]);
}
