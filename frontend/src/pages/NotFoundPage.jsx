import { Link } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import Button from "../components/ui/Button.jsx";

export default function NotFoundPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper-100 px-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-ink-100">
                <FlaskConical className="size-7 text-ink-400" />
            </div>
            <div>
                <p className="font-mono text-sm text-ink-400">404</p>
                <h1 className="mt-1 text-lg font-semibold text-ink-900">Page not found</h1>
                <p className="mt-1 text-sm text-ink-500">The page you're looking for doesn't exist or was moved.</p>
            </div>
            <Button as={Link} to="/dashboard">
                Back to dashboard
            </Button>
        </div>
    );
}
