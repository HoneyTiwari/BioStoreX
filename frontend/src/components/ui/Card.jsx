import clsx from "clsx";

export default function Card({ className, children, as: Tag = "div", ...props }) {
    return (
        <Tag
            className={clsx(
                "glass-panel rounded-2xl transition-all duration-200",
                className
            )}
            {...props}
        >
            {children}
        </Tag>
    );
}
