import { Component } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "./Button.jsx";

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // In a real deployment this would forward to an error-tracking
        // service. We at least keep a console trace for local debugging.
        console.error("BioStoreX render error:", error, info);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper-100 px-6 text-center">
                    <div className="flex size-14 items-center justify-center rounded-full bg-hazard-500/10">
                        <AlertTriangle className="size-7 text-hazard-500" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-lg font-semibold text-ink-900">Something went wrong</h1>
                        <p className="text-sm text-ink-500 max-w-sm">
                            BioStoreX hit an unexpected error. Try reloading — if it keeps happening,
                            contact your storekeeper or administrator.
                        </p>
                    </div>
                    <Button onClick={this.handleReset}>Reload BioStoreX</Button>
                </div>
            );
        }

        return this.props.children;
    }
}
