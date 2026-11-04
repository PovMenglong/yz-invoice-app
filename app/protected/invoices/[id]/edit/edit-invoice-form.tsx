
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateInvoice } from "./actions";

type InvoiceFormData = {
    id: string;
    invoice_number: string;
    status: string;
    issue_date: string;
    due_date: string | null;
    subtotal: number;
    discount_total: number;
    tax_total: number;
    notes: string | null;
};

type EditInvoiceFormProps = {
    invoice: InvoiceFormData;
    customerName: string;
};

const labelClass =
    "mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200";

const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-900";

const allowedStatuses = ["draft", "issued", "paid", "void"];

export default function EditInvoiceForm({
    invoice,
    customerName,
}: EditInvoiceFormProps) {
    const router = useRouter();

    const [message, setMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    async function handleSubmit(formData: FormData) {
        setMessage("");
        setIsSaving(true);

        try {
            const result = await updateInvoice(formData);
            setMessage(result.message);

            if (result.success) {
                router.refresh();
                router.push(`/protected/invoices/${invoice.id}`);
            }
        } catch {
            setMessage("Something went wrong while saving the invoice.");
        } finally {
            setIsSaving(false);
        }
    }

    const status = allowedStatuses.includes(invoice.status)
        ? invoice.status
        : "draft";

    return (
        <form action={handleSubmit} className="mt-8 space-y-6">
            <input type="hidden" name="invoiceId" value={invoice.id} />

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        Invoice Information
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Update the invoice number, customer, dates, and status.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="invoiceNumber" className={labelClass}>
                            Invoice Number *
                        </label>
                        <input
                            id="invoiceNumber"
                            name="invoiceNumber"
                            defaultValue={invoice.invoice_number}
                            required
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label htmlFor="customerName" className={labelClass}>
                            Customer Name *
                        </label>
                        <input
                            id="customerName"
                            name="customerName"
                            defaultValue={customerName}
                            required
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label htmlFor="issueDate" className={labelClass}>
                            Issue Date *
                        </label>
                        <input
                            id="issueDate"
                            name="issueDate"
                            type="date"
                            defaultValue={invoice.issue_date}
                            required
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label htmlFor="dueDate" className={labelClass}>
                            Due Date
                        </label>
                        <input
                            id="dueDate"
                            name="dueDate"
                            type="date"
                            defaultValue={invoice.due_date ?? ""}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label htmlFor="status" className={labelClass}>
                            Invoice Status *
                        </label>
                        <select
                            id="status"
                            name="status"
                            defaultValue={status}
                            required
                            className={inputClass}
                        >
                            <option value="draft">Draft</option>
                            <option value="issued">Issued / Sent</option>
                            <option value="paid">Paid</option>
                            <option value="void">Cancelled / Voided</option>
                        </select>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        Financial Information
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Review and update the invoice amounts.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="subtotal" className={labelClass}>
                            Subtotal (USD) *
                        </label>
                        <input
                            id="subtotal"
                            name="subtotal"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={invoice.subtotal}
                            required
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label htmlFor="discountTotal" className={labelClass}>
                            Discount (USD)
                        </label>
                        <input
                            id="discountTotal"
                            name="discountTotal"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={invoice.discount_total}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label htmlFor="taxTotal" className={labelClass}>
                            Tax (USD)
                        </label>
                        <input
                            id="taxTotal"
                            name="taxTotal"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={invoice.tax_total}
                            className={inputClass}
                        />
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
                <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
                    Additional Notes
                </h2>

                <label htmlFor="notes" className={labelClass}>
                    Notes
                </label>
                <textarea
                    id="notes"
                    name="notes"
                    rows={5}
                    defaultValue={invoice.notes ?? ""}
                    placeholder="Enter invoice notes..."
                    className={`${inputClass} resize-y`}
                />
            </section>

            {message && (
                <div
                    role="status"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                    {message}
                </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-700 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    onClick={() => router.push(`/protected/invoices/${invoice.id}`)}
                    disabled={isSaving}
                    className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSaving ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </form>
    );
}
