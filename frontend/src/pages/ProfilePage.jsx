import { useState } from "react";
import toast from "react-hot-toast";
import { User, Lock } from "lucide-react";
import { usePageHeader } from "../hooks/usePageHeader.js";
import { useAuth } from "../hooks/useAuth.js";
import Card from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { authService } from "../services/authService.js";
import { getErrorMessage } from "../services/apiClient.js";
import { ROLE_LABELS } from "../utils/navConfig.js";

export default function ProfilePage() {
    const { user, refreshCurrentUser } = useAuth();
    usePageHeader({ title: "Profile", subtitle: "Manage your account details" });

    const [profileForm, setProfileForm] = useState({ fullName: user?.fullName || "", userName: user?.userName || "" });
    const [profileErrors, setProfileErrors] = useState({});
    const [savingProfile, setSavingProfile] = useState(false);

    const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [pwErrors, setPwErrors] = useState({});
    const [savingPassword, setSavingPassword] = useState(false);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        const next = {};
        if (!profileForm.fullName.trim()) next.fullName = "Required";
        if (!profileForm.userName.trim()) next.userName = "Required";
        setProfileErrors(next);
        if (Object.keys(next).length > 0) return;

        setSavingProfile(true);
        try {
            await authService.updateProfile(profileForm);
            await refreshCurrentUser();
            toast.success("Profile updated");
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't update your profile."));
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        const next = {};
        if (!pwForm.currentPassword) next.currentPassword = "Required";
        if (!pwForm.newPassword || pwForm.newPassword.length < 6) next.newPassword = "At least 6 characters";
        if (pwForm.confirmPassword !== pwForm.newPassword) next.confirmPassword = "Passwords don't match";
        setPwErrors(next);
        if (Object.keys(next).length > 0) return;

        setSavingPassword(true);
        try {
            await authService.changePassword({
                currentPassword: pwForm.currentPassword,
                newPassword: pwForm.newPassword,
            });
            toast.success("Password changed");
            setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't change your password."));
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <div className="mx-auto max-w-xl space-y-6">
            <Card className="p-6">
                <div className="flex items-center gap-2 text-ink-900">
                    <User className="size-4 text-iodine-500" />
                    <h2 className="font-semibold">Account details</h2>
                </div>
                <p className="mt-1 text-sm text-ink-500">
                    {user?.email} · {ROLE_LABELS[user?.role] || user?.role}
                </p>

                <form onSubmit={handleProfileSubmit} className="mt-5 space-y-4">
                    <Input
                        label="Full name"
                        value={profileForm.fullName}
                        onChange={(e) => {
                            setProfileForm((p) => ({ ...p, fullName: e.target.value }));
                            setProfileErrors((p) => ({ ...p, fullName: "" }));
                        }}
                        error={profileErrors.fullName}
                    />
                    <Input
                        label="Username"
                        value={profileForm.userName}
                        onChange={(e) => {
                            setProfileForm((p) => ({ ...p, userName: e.target.value }));
                            setProfileErrors((p) => ({ ...p, userName: "" }));
                        }}
                        error={profileErrors.userName}
                    />
                    <div className="flex justify-end">
                        <Button type="submit" loading={savingProfile}>
                            Save changes
                        </Button>
                    </div>
                </form>
            </Card>

            <Card className="p-6">
                <div className="flex items-center gap-2 text-ink-900">
                    <Lock className="size-4 text-iodine-500" />
                    <h2 className="font-semibold">Change password</h2>
                </div>

                <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
                    <Input
                        label="Current password"
                        type="password"
                        value={pwForm.currentPassword}
                        onChange={(e) => {
                            setPwForm((p) => ({ ...p, currentPassword: e.target.value }));
                            setPwErrors((p) => ({ ...p, currentPassword: "" }));
                        }}
                        error={pwErrors.currentPassword}
                        autoComplete="current-password"
                    />
                    <Input
                        label="New password"
                        type="password"
                        value={pwForm.newPassword}
                        onChange={(e) => {
                            setPwForm((p) => ({ ...p, newPassword: e.target.value }));
                            setPwErrors((p) => ({ ...p, newPassword: "" }));
                        }}
                        error={pwErrors.newPassword}
                        autoComplete="new-password"
                    />
                    <Input
                        label="Confirm new password"
                        type="password"
                        value={pwForm.confirmPassword}
                        onChange={(e) => {
                            setPwForm((p) => ({ ...p, confirmPassword: e.target.value }));
                            setPwErrors((p) => ({ ...p, confirmPassword: "" }));
                        }}
                        error={pwErrors.confirmPassword}
                        autoComplete="new-password"
                    />
                    <div className="flex justify-end">
                        <Button type="submit" variant="secondary" loading={savingPassword}>
                            Change password
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
