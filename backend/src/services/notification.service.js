import { User } from "../models/user.model.js";
import { Item } from "../models/item.model.js";
import { sendEmail } from "./email.service.js";

const EXPIRY_ALERT_DAYS = Number(process.env.EXPIRY_ALERT_DAYS || 30);
const INVENTORY_ALERT_INTERVAL_HOURS = Number(process.env.INVENTORY_ALERT_INTERVAL_HOURS || 24);

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const itemName = (item) => item?.displayName || item?.name || "item";

const sendNotification = async ({ to, subject, text, html }) => {
    const recipients = [...new Set((Array.isArray(to) ? to : [to]).filter(Boolean))];
    if (recipients.length === 0) return;

    try {
        await sendEmail({ to: recipients, subject, text, html });
    } catch (error) {
        console.error("Notification email failed:", error.message);
    }
};

const getInventoryRecipients = async () => {
    const users = await User.find({
        role: { $in: ["Storekeeper", "Admin"] },
        isActive: true,
        isApproved: true,
    }).select("email");

    return users.map((user) => user.email).filter(Boolean);
};

export const notifyStudentApproved = (user) =>
    sendNotification({
        to: user.email,
        subject: "BioStoreX account approved",
        text: `Hello ${user.fullName}, your BioStoreX student account has been approved. You can now log in and request lab inventory items.`,
        html: `<p>Hello ${escapeHtml(user.fullName)},</p><p>Your BioStoreX student account has been approved. You can now log in and request lab inventory items.</p>`,
    });

export const notifyStudentRejected = (user) =>
    sendNotification({
        to: user.email,
        subject: "BioStoreX registration update",
        text: `Hello ${user.fullName}, your BioStoreX student registration was rejected. Please contact the department storekeeper if you think this is a mistake.`,
        html: `<p>Hello ${escapeHtml(user.fullName)},</p><p>Your BioStoreX student registration was rejected. Please contact the department storekeeper if you think this is a mistake.</p>`,
    });

export const notifyRequestApproved = (request) => {
    const name = itemName(request.item);
    return sendNotification({
        to: request.user?.email,
        subject: `BioStoreX request approved: ${name}`,
        text: `Your request for ${request.quantityApproved} ${request.item?.unitType || "units"} of ${name} has been approved.`,
        html: `<p>Your request for <strong>${escapeHtml(request.quantityApproved)} ${escapeHtml(request.item?.unitType || "units")}</strong> of <strong>${escapeHtml(name)}</strong> has been approved.</p>`,
    });
};

export const notifyRequestDeclined = (request) => {
    const name = itemName(request.item);
    return sendNotification({
        to: request.user?.email,
        subject: `BioStoreX request declined: ${name}`,
        text: `Your request for ${name} was declined. Reason: ${request.declineReason}`,
        html: `<p>Your request for <strong>${escapeHtml(name)}</strong> was declined.</p><p><strong>Reason:</strong> ${escapeHtml(request.declineReason)}</p>`,
    });
};

export const notifyRequestIssued = (request) => {
    const name = itemName(request.item);
    return sendNotification({
        to: request.user?.email,
        subject: `BioStoreX item issued: ${name}`,
        text: `${request.quantityApproved} ${request.item?.unitType || "units"} of ${name} has been issued to you.`,
        html: `<p><strong>${escapeHtml(request.quantityApproved)} ${escapeHtml(request.item?.unitType || "units")}</strong> of <strong>${escapeHtml(name)}</strong> has been issued to you.</p>`,
    });
};

export const notifyInventoryAlerts = async (item) => {
    if (!item) return;

    const recipients = await getInventoryRecipients();
    if (recipients.length === 0) return;

    const name = itemName(item);
    const alerts = [];

    if (item.totalQuantity <= item.minThreshold) {
        alerts.push({
            subject: `BioStoreX low stock alert: ${name}`,
            text: `${name} is low on stock. Current stock: ${item.totalQuantity} ${item.unitType}. Minimum threshold: ${item.minThreshold} ${item.unitType}.`,
            html: `<p><strong>${escapeHtml(name)}</strong> is low on stock.</p><p>Current stock: ${escapeHtml(item.totalQuantity)} ${escapeHtml(item.unitType)}<br>Minimum threshold: ${escapeHtml(item.minThreshold)} ${escapeHtml(item.unitType)}</p>`,
        });
    }

    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    for (const batch of item.batches || []) {
        if (!batch.expiryDate) continue;
        const daysUntilExpiry = Math.ceil((new Date(batch.expiryDate).getTime() - now) / msPerDay);
        if (daysUntilExpiry < 0 || daysUntilExpiry > EXPIRY_ALERT_DAYS) continue;

        alerts.push({
            subject: `BioStoreX expiry alert: ${name} batch ${batch.batchNo}`,
            text: `${name} batch ${batch.batchNo} expires in ${daysUntilExpiry} day(s). Quantity: ${batch.quantity} ${item.unitType}.`,
            html: `<p><strong>${escapeHtml(name)}</strong> batch <strong>${escapeHtml(batch.batchNo)}</strong> expires in <strong>${escapeHtml(daysUntilExpiry)} day(s)</strong>.</p><p>Quantity: ${escapeHtml(batch.quantity)} ${escapeHtml(item.unitType)}</p>`,
        });
    }

    await Promise.all(alerts.map((alert) => sendNotification({ to: recipients, ...alert })));
};

export const runInventoryAlertScan = async () => {
    const items = await Item.find({
        $or: [
            { $expr: { $lte: ["$totalQuantity", "$minThreshold"] } },
            { "batches.expiryDate": { $exists: true, $ne: null } },
        ],
    });

    await Promise.all(items.map((item) => notifyInventoryAlerts(item)));
};

export const startInventoryAlertScheduler = () => {
    const intervalMs = INVENTORY_ALERT_INTERVAL_HOURS * 60 * 60 * 1000;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return;

    runInventoryAlertScan().catch((error) => {
        console.error("Inventory alert scan failed:", error.message);
    });

    setInterval(() => {
        runInventoryAlertScan().catch((error) => {
            console.error("Inventory alert scan failed:", error.message);
        });
    }, intervalMs);
};
