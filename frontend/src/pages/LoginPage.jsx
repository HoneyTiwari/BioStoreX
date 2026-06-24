import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FlaskConical, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";

export default function LoginPage() {
    const { login, authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [form, setForm] = useState({ identifier: "", password: "" });
    const [errors, setErrors] = useState({});

    const updateField = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const validate = () => {
        const next = {};
        if (!form.identifier.trim()) next.identifier = "Enter your email or username";
        if (!form.password) next.password = "Enter your password";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        const isEmail = form.identifier.includes("@");
        try {
            await login({
                [isEmail ? "email" : "userName"]: form.identifier.trim(),
                password: form.password,
            });
            navigate(location.state?.from || "/dashboard", { replace: true });
        } catch {
            // Error toast already shown by AuthContext.
        }
    };

    return (
        <AuthShell>
            <div className="text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-ink-950 text-white shadow-popover">
                    <FlaskConical className="size-6" />
                </div>
                <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink-950">Welcome back</h1>
                <p className="mt-1 text-sm text-ink-500">Sign in to your BioStoreX account</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <Input
                    label="Email or username"
                    leftIcon={<Mail className="size-4" />}
                    value={form.identifier}
                    onChange={updateField("identifier")}
                    error={errors.identifier}
                    autoComplete="username"
                    autoFocus
                />
                <Input
                    label="Password"
                    type="password"
                    leftIcon={<Lock className="size-4" />}
                    value={form.password}
                    onChange={updateField("password")}
                    error={errors.password}
                    autoComplete="current-password"
                />

                <div className="flex justify-end">
                    <Link to="/forgot-password" className="text-xs font-semibold text-glove-600 hover:text-glove-700">
                        Forgot password?
                    </Link>
                </div>

                <Button type="submit" className="w-full" size="lg" loading={authLoading}>
                    Sign in
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-500">
                Don't have an account?{" "}
                <Link to="/register" className="font-semibold text-glove-600 hover:text-glove-700">
                    Register as a student
                </Link>
            </p>
        </AuthShell>
    );
}

export function AuthShell({ children }) {
    return (
        <div className="flex min-h-screen overflow-hidden">
            <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-ink-950 p-10 text-white lg:flex">
                <div className="absolute inset-0 bg-label-grid opacity-[0.05]" />
                <div className="absolute -right-24 top-16 size-80 rounded-full bg-glove-500/20 blur-3xl" />
                <div className="absolute -bottom-24 left-16 size-80 rounded-full bg-iodine-500/20 blur-3xl" />

                <div className="relative flex items-center gap-2.5">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-white/10 text-iodine-300 ring-1 ring-white/10">
                        <FlaskConical className="size-5" />
                    </div>
                    <span className="text-sm font-semibold tracking-wide">BioStoreX</span>
                </div>

                <div className="relative max-w-lg space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-iodine-300">
                        <Sparkles className="size-3.5" />
                        Biotechnology store intelligence
                    </div>
                    <h2 className="text-5xl font-semibold leading-tight tracking-tight">
                        Inventory, requests, and AI insight in one elegant workspace.
                    </h2>
                    <p className="text-base leading-7 text-ink-300">
                        Track reagents and equipment by batch and expiry, route requests through approval, and ask the AI assistant what needs attention.
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        {["Batch-wise stock", "Expiry risk", "AI restock insight", "Role-based access"].map((item) => (
                            <div key={item} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-ink-200">
                                <ShieldCheck className="size-4 text-glove-400" />
                                {item}
                            </div>
                        ))}
                    </div>
                </div>

                <p className="relative text-[11px] text-ink-500">© {new Date().getFullYear()} BioStoreX</p>
            </div>

            <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
                <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8">{children}</div>
            </div>
        </div>
    );
}
