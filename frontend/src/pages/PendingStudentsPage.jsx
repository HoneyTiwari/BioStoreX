import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { UserCheck, Check, X, Mail, Hash } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { usePageHeader } from "../hooks/usePageHeader.js";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import { SectionLoader } from "../components/ui/Spinner.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { adminService } from "../services/adminService.js";
import { getErrorMessage } from "../services/apiClient.js";
import { formatRelativeTime } from "../utils/format.js";

export default function PendingStudentsPage() {
    const { user, initializing } = useAuth();
    const authReady = !initializing && Boolean(user);

    usePageHeader({ title: "Pending Students", subtitle: "Approve or reject new student registrations" });

    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actioningId, setActioningId] = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejecting, setRejecting] = useState(false);

    const fetchPending = useCallback(async () => {
        if (!authReady) return;

        setLoading(true);
        setError("");
        try {
            const { data } = await adminService.getPendingStudents();
            setPending(data.data || []);
        } catch (err) {
            setError(getErrorMessage(err, "Couldn't load pending students."));
        } finally {
            setLoading(false);
        }
    }, [authReady]);

    useEffect(() => {
        if (!authReady) return;
        fetchPending();
    }, [authReady, fetchPending]);

    const handleApprove = async (student) => {
        setActioningId(student._id);
        try {
            await adminService.approveStudent(student._id);
            toast.success(`${student.fullName} can now log in`);
            setPending((prev) => prev.filter((s) => s._id !== student._id));
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't approve this student."));
        } finally {
            setActioningId(null);
        }
    };

    const handleRejectConfirm = async () => {
        if (!rejectTarget) return;
        setRejecting(true);
        try {
            await adminService.rejectStudent(rejectTarget._id);
            toast.success(`${rejectTarget.fullName}'s registration was rejected`);
            setPending((prev) => prev.filter((s) => s._id !== rejectTarget._id));
            setRejectTarget(null);
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't reject this registration."));
        } finally {
            setRejecting(false);
        }
    };

    if (loading) return <SectionLoader label="Loading pending students…" />;

    if (error) {
        return (
            <EmptyState
                icon={UserCheck}
                title="Couldn't load pending students"
                description={error}
                action={<Button onClick={fetchPending}>Try again</Button>}
            />
        );
    }

    if (pending.length === 0) {
        return (
            <EmptyState
                icon={UserCheck}
                title="No pending registrations"
                description="New student sign-ups will show up here for approval before they can log in."
            />
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-sm text-ink-500">
                {pending.length} student{pending.length === 1 ? "" : "s"} waiting for approval
            </p>

            {pending.map((student) => (
                <Card key={student._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p className="font-medium text-ink-900">{student.fullName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
                            <span className="flex items-center gap-1">
                                <Mail className="size-3.5" />
                                {student.email}
                            </span>
                            {student.student?.registrationNo && (
                                <span className="flex items-center gap-1 font-mono">
                                    <Hash className="size-3.5" />
                                    {student.student.registrationNo}
                                </span>
                            )}
                            <span>Registered {formatRelativeTime(student.createdAt)}</span>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            size="sm"
                            variant="success"
                            leftIcon={<Check className="size-3.5" />}
                            loading={actioningId === student._id}
                            onClick={() => handleApprove(student)}
                        >
                            Approve
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<X className="size-3.5" />}
                            onClick={() => setRejectTarget(student)}
                        >
                            Reject
                        </Button>
                    </div>
                </Card>
            ))}

            <ConfirmDialog
                open={Boolean(rejectTarget)}
                onClose={() => setRejectTarget(null)}
                onConfirm={handleRejectConfirm}
                title="Reject this registration?"
                description={`${rejectTarget?.fullName}'s account will be permanently deleted. They can register again if this was a mistake.`}
                confirmLabel="Reject & delete"
                loading={rejecting}
            />
        </div>
    );
}
