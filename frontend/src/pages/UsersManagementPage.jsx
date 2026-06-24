import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Search, Users, UserPlus, ShieldOff, ShieldCheck } from "lucide-react";
import { usePageHeader } from "../hooks/usePageHeader.js";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import Modal from "../components/ui/Modal.jsx";
import Input from "../components/ui/Input.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import { SectionLoader } from "../components/ui/Spinner.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { adminService } from "../services/adminService.js";
import { getErrorMessage } from "../services/apiClient.js";
import { ROLE_LABELS } from "../utils/navConfig.js";
import Pagination from "../components/ui/Pagination.jsx";

const initialForm = { fullName: "", userName: "", email: "", password: "" };

export default function UsersManagementPage() {
    usePageHeader({ title: "Users", subtitle: "Manage storekeeper accounts and access" });

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [toggleTarget, setToggleTarget] = useState(null);
    const [toggling, setToggling] = useState(false);
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const fetchUsers = async () => {
        setLoading(true);
        setError("");
        try {
            const { data } = await adminService.getAllUsers();
            setUsers(data.data || []);
        } catch (err) {
            setError(getErrorMessage(err, "Couldn't load users."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const updateField = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const validate = () => {
        const next = {};
        if (!form.fullName.trim()) next.fullName = "Required";
        if (!form.userName.trim()) next.userName = "Required";
        if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email";
        if (!form.password || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(form.password)) {
            next.password = "Use 8+ chars with uppercase, lowercase, number, and symbol";
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleAddStorekeeper = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            await adminService.addStorekeeper(form);
            toast.success(`Storekeeper account created for ${form.fullName}`);
            setAddModalOpen(false);
            setForm(initialForm);
            fetchUsers();
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't create the storekeeper account."));
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleConfirm = async () => {
        if (!toggleTarget) return;
        setToggling(true);
        try {
            if (toggleTarget.isActive) {
                await adminService.blacklist(toggleTarget._id);
                toast.success(`${toggleTarget.fullName} has been deactivated`);
            } else {
                await adminService.unblacklist(toggleTarget._id);
                toast.success(`${toggleTarget.fullName} has been reactivated`);
            }
            setToggleTarget(null);
            fetchUsers();
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't update this user's access."));
        } finally {
            setToggling(false);
        }
    };

    const filteredUsers = users.filter((u) => {
        const text = `${u.fullName} ${u.userName} ${u.email} ${u.role}`.toLowerCase();
        return text.includes(query.trim().toLowerCase());
    });

    const pagedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(filteredUsers.length / pageSize);

    return (
        <div className="space-y-4">
            <div className="glass-panel flex flex-col gap-3 rounded-3xl p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                    <input
                        value={query}
                        onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                        placeholder="Search users by name, email, or role..."
                        className="h-11 w-full rounded-2xl border border-ink-200 bg-white/80 pl-10 pr-3 text-sm shadow-sm outline-none transition-all focus:border-glove-400 focus:bg-white focus:ring-4 focus:ring-glove-400/10"
                    />
                </div>
                <Button leftIcon={<UserPlus className="size-4" />} onClick={() => setAddModalOpen(true)}>
                    Add storekeeper
                </Button>
            </div>

            {loading ? (
                <SectionLoader label="Loading users…" />
            ) : error ? (
                <EmptyState icon={Users} title="Couldn't load users" description={error} action={<Button onClick={fetchUsers}>Try again</Button>} />
            ) : users.length === 0 ? (
                <EmptyState icon={Users} title="No users yet" />
            ) : filteredUsers.length === 0 ? (
                <EmptyState icon={Search} title="No users match your search" description="Try a different name, email, username, or role." />
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 border-b border-ink-200 bg-white/85 text-xs uppercase tracking-wide text-ink-500 backdrop-blur">
                            <tr>
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">Username</th>
                                <th className="px-4 py-3 font-medium">Email</th>
                                <th className="px-4 py-3 font-medium">Role</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {pagedUsers.map((u) => (
                                <tr key={u._id} className="transition-colors hover:bg-white/70">
                                    <td className="px-4 py-3 font-medium text-ink-900">{u.fullName}</td>
                                    <td className="px-4 py-3 font-mono text-ink-600">{u.userName}</td>
                                    <td className="px-4 py-3 text-ink-600">{u.email}</td>
                                    <td className="px-4 py-3 text-ink-600">{ROLE_LABELS[u.role] || u.role}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant={u.isActive ? "success" : "danger"}>
                                            {u.isActive ? "Active" : "Deactivated"}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {u.role !== "Admin" && (
                                            <button
                                                onClick={() => setToggleTarget(u)}
                                                className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-800"
                                            >
                                                {u.isActive ? (
                                                    <>
                                                        <ShieldOff className="size-3.5" /> Deactivate
                                                    </>
                                                ) : (
                                                    <>
                                                        <ShieldCheck className="size-3.5" /> Reactivate
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                    <Pagination page={page} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
                </Card>
            )}

            <Modal
                open={addModalOpen}
                onClose={() => {
                    setAddModalOpen(false);
                    setForm(initialForm);
                    setErrors({});
                }}
                title="Add storekeeper"
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setAddModalOpen(false)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddStorekeeper} loading={submitting}>
                            Create account
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleAddStorekeeper} className="space-y-4">
                    <Input label="Full name" value={form.fullName} onChange={updateField("fullName")} error={errors.fullName} autoFocus />
                    <Input label="Username" value={form.userName} onChange={updateField("userName")} error={errors.userName} />
                    <Input label="Email" type="email" value={form.email} onChange={updateField("email")} error={errors.email} />
                    <Input label="Temporary password" type="password" value={form.password} onChange={updateField("password")} error={errors.password} hint="They can change this after first login." />
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(toggleTarget)}
                onClose={() => setToggleTarget(null)}
                onConfirm={handleToggleConfirm}
                title={toggleTarget?.isActive ? "Deactivate this account?" : "Reactivate this account?"}
                description={`${toggleTarget?.fullName} will ${toggleTarget?.isActive ? "no longer be able to log in." : "regain access to BioStoreX."}`}
                confirmLabel={toggleTarget?.isActive ? "Deactivate" : "Reactivate"}
                variant={toggleTarget?.isActive ? "danger" : "success"}
                loading={toggling}
            />
        </div>
    );
}
