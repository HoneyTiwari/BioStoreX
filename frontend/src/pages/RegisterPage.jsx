import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Mail, Lock, User, AtSign } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { AuthShell } from "./LoginPage.jsx";

export default function RegisterPage() {
    const { register, authLoading } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        fullName: "",
        userName: "",
        email: "",
        password: "",
        confirmPassword: "",
        registrationNo: "",
    });
    const [errors, setErrors] = useState({});

    const updateField = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const validate = () => {
        const next = {};
        if (!form.fullName.trim()) next.fullName = "Enter your full name";
        if (!form.userName.trim()) next.userName = "Choose a username";
        else if (!/^[a-zA-Z0-9_.]{3,20}$/.test(form.userName)) {
            next.userName = "3-20 characters: letters, numbers, underscore, dot";
        }
        if (!form.email.trim()) next.email = "Enter your email";
        else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email";
        if (!form.password) next.password = "Choose a password";
        else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(form.password)) {
            next.password = "Use 8+ chars with uppercase, lowercase, number, and symbol";
        }
        if (form.confirmPassword !== form.password) next.confirmPassword = "Passwords don't match";

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            await register({
                fullName: form.fullName.trim(),
                userName: form.userName.trim(),
                email: form.email.trim(),
                password: form.password,
                student: form.registrationNo ? { registrationNo: form.registrationNo.trim() } : undefined,
            });
            navigate("/login", { replace: true });
        } catch {
            // Error toast already shown by AuthContext
        }
    };

    return (
        <AuthShell>
            <div className="text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-glove-500 text-white shadow-popover">
                    <GraduationCap className="size-6" />
                </div>
                <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink-950">Create your student account</h1>
                <p className="mt-1 text-sm text-ink-500">Request lab supplies and track your requisitions</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <Input
                    label="Full name"
                    leftIcon={<User className="size-4" />}
                    value={form.fullName}
                    onChange={updateField("fullName")}
                    error={errors.fullName}
                    autoFocus
                />
                <Input
                    label="Username"
                    leftIcon={<AtSign className="size-4" />}
                    value={form.userName}
                    onChange={updateField("userName")}
                    error={errors.userName}
                    autoComplete="username"
                />
                <Input
                    label="Email"
                    type="email"
                    leftIcon={<Mail className="size-4" />}
                    value={form.email}
                    onChange={updateField("email")}
                    error={errors.email}
                    autoComplete="email"
                />
                <Input
                    label="Registration number (optional)"
                    value={form.registrationNo}
                    onChange={updateField("registrationNo")}
                    placeholder="e.g. BT2024042"
                />
                <Input
                    label="Password"
                    type="password"
                    leftIcon={<Lock className="size-4" />}
                    value={form.password}
                    onChange={updateField("password")}
                    error={errors.password}
                    autoComplete="new-password"
                />
                <Input
                    label="Confirm password"
                    type="password"
                    leftIcon={<Lock className="size-4" />}
                    value={form.confirmPassword}
                    onChange={updateField("confirmPassword")}
                    error={errors.confirmPassword}
                    autoComplete="new-password"
                />

                <Button type="submit" className="w-full" size="lg" loading={authLoading}>
                    Create account
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-500">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-iodine-600 hover:text-iodine-700">
                    Sign in
                </Link>
            </p>
        </AuthShell>
    );
}
