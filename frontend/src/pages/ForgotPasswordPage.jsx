import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Hash, KeyRound, Lock, Mail } from "lucide-react";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { AuthShell } from "./LoginPage.jsx";
import { authService } from "../services/authService.js";
import { getErrorMessage } from "../services/apiClient.js";

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState("request");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [devOtp, setDevOtp] = useState("");

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
            setErrors({ email: "Enter a valid email" });
            return;
        }

        setLoading(true);
        try {
            const { data } = await authService.forgotPassword({ email: email.trim() });
            toast.success(data.message);
            if (data.data?.devOtp) {
                setOtp(data.data.devOtp);
                setDevOtp(data.data.devOtp);
                toast.success(`Development reset code: ${data.data.devOtp}`, { duration: 10000 });
            } else {
                setDevOtp("");
            }
            setStep("reset");
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't send the reset code."));
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        const next = {};
        if (!otp.trim()) next.otp = "Enter the code from your email";
        if (!newPassword || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(newPassword)) {
            next.newPassword = "Use 8+ chars with uppercase, lowercase, number, and symbol";
        }
        if (confirmPassword !== newPassword) next.confirmPassword = "Passwords don't match";
        setErrors(next);
        if (Object.keys(next).length > 0) return;

        setLoading(true);
        try {
            await authService.resetPassword({ email: email.trim(), otp: otp.trim(), newPassword });
            toast.success("Password updated. You can now log in.");
            navigate("/login", { replace: true, state: { resetEmail: email.trim() } });
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't reset your password."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell>
            <div className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-iodine-500/15 text-iodine-500">
                    <KeyRound className="size-6" />
                </div>
                <h1 className="mt-4 text-xl font-semibold text-ink-900">
                    {step === "request" ? "Reset your password" : "Enter the code"}
                </h1>
                <p className="mt-1 text-sm text-ink-500">
                    {step === "request" ? "We'll email you a one-time code" : `Sent to ${email} - expires in 15 minutes`}
                </p>
            </div>

            {step === "request" ? (
                <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
                    <Input
                        label="Email"
                        type="email"
                        leftIcon={<Mail className="size-4" />}
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setErrors({});
                        }}
                        error={errors.email}
                        autoFocus
                    />
                    <Button type="submit" className="w-full" size="lg" loading={loading}>
                        Send reset code
                    </Button>
                </form>
            ) : (
                <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                    {devOtp ? (
                        <div className="rounded-2xl border border-hazard-200 bg-hazard-50 px-4 py-3 text-sm text-hazard-800">
                            <p className="font-semibold">Email delivery is not working yet.</p>
                            <p className="mt-1">
                                Development reset code: <span className="font-mono font-bold">{devOtp}</span>
                            </p>
                        </div>
                    ) : null}
                    <Input
                        label="Reset code"
                        leftIcon={<Hash className="size-4" />}
                        value={otp}
                        onChange={(e) => {
                            setOtp(e.target.value);
                            setErrors((p) => ({ ...p, otp: "" }));
                        }}
                        error={errors.otp}
                        autoFocus
                    />
                    <Input
                        label="New password"
                        type="password"
                        leftIcon={<Lock className="size-4" />}
                        value={newPassword}
                        onChange={(e) => {
                            setNewPassword(e.target.value);
                            setErrors((p) => ({ ...p, newPassword: "" }));
                        }}
                        error={errors.newPassword}
                    />
                    <p className="-mt-2 text-xs leading-5 text-ink-500">
                        Password must include uppercase, lowercase, number, and symbol.
                    </p>
                    <Input
                        label="Confirm new password"
                        type="password"
                        leftIcon={<Lock className="size-4" />}
                        value={confirmPassword}
                        onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setErrors((p) => ({ ...p, confirmPassword: "" }));
                        }}
                        error={errors.confirmPassword}
                    />
                    <Button type="submit" className="w-full" size="lg" loading={loading}>
                        Reset password
                    </Button>
                    <button
                        type="button"
                        onClick={() => setStep("request")}
                        className="w-full text-center text-xs text-ink-500 hover:text-ink-700"
                    >
                        Use a different email
                    </button>
                </form>
            )}

            <p className="mt-6 text-center text-sm text-ink-500">
                Remembered it?{" "}
                <Link to="/login" className="font-medium text-iodine-600 hover:text-iodine-700">
                    Back to sign in
                </Link>
            </p>
        </AuthShell>
    );
}
