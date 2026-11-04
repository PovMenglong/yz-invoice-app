"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateInvoiceStatus } from "./status-actions";

const statuses = [
    { value: "draft", label: "Draft" },
    { value: "issued", label: "Issued" },
    { value: "paid", label: "Paid" },
    { value: "void", label: "Void" },
] as const;

type InvoiceStatus = (typeof statuses)[number]["value"];

type Props = {
    invoiceId: string;
    currentStatus: string;
};

export default function UpdateInvoiceStatus({
    invoiceId,
    currentStatus,
}: Props) {
    const router = useRouter();

    const [status, setStatus] = useState<InvoiceStatus>(
        statuses.some((item) => item.value === currentStatus)
            ? (currentStatus as InvoiceStatus)
            : "draft"
    );

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    async function handleUpdate() {
        setSaving(true);
        setMessage("");

        const result = await updateInvoiceStatus(invoiceId, status);

        setSaving(false);
        setIsError(!result.success);
        setMessage(result.message);

        if (result.success) {
            router.refresh();
        }
    }

    return (
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Update Invoice Status
                </h3>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Change the current status of this invoice.
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
                <select
                    value={status}
                    onChange={(event) =>
                        setStatus(event.target.value as InvoiceStatus)
                    }
                    disabled={saving}
                    className="min-h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                    {statuses.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={saving || status === currentStatus}
                    className="min-h-10 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                    {saving ? "Updating..." : "Update Status"}
                </button>
            </div>

            {message && (
                <p
                    role="status"
                    className={`mt-3 text-sm ${isError
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                >
                    {message}
                </p>
            )}
        </div>
    );
}