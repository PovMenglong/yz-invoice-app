
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

    return (
        <form action={handleSubmit} className="mt-8 space-y-6">
            <input type="hidden" name="invoiceId" value={invoice.id} />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="invoiceNumber"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Invoice Number
                    </label>
                    <input
                        id="invoiceNumber"
                        name="invoiceNumber"
                        defaultValue={invoice.invoice_number}
                        required
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                </div>

                <div>
                    <label
                        htmlFor="customerName"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Customer Name
                    </label>
                    <input
                        id="customerName"
                        name="customerName"
                        defaultValue={customerName}
                        required
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                </div>

                <div>
                    <label
                        htmlFor="issueDate"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Issue Date
                    </label>
                    <input
                        id="issueDate"
                        name="issueDate"
                        type="date"
                        defaultValue={invoice.issue_date}
                        required
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                </div>

                <div>
                    <label
                        htmlFor="dueDate"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Due Date
                    </label>
                    <input
                        id="dueDate"
                        name="dueDate"
                        type="date"
                        defaultValue={invoice.due_date ?? ""}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                </div>

                <div>
                    <label
                        htmlFor="status"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Status
                    </label>
                    <select
                        id="status"
                        name="status"
                        defaultValue={invoice.status}
                        required
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                    >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                <div>
                    <label
                        htmlFor="subtotal"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Subtotal (USD)
                    </label>
                    <input
                        id="subtotal"
                        name="subtotal"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={invoice.subtotal}
                        required
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                </div>

                <div>
                    <label
                        htmlFor="discountTotal"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Discount (USD)
                    </label>
                    <input
                        id="discountTotal"
                        name="discountTotal"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={invoice.discount_total}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                </div>

                <div>
                    <label
                        htmlFor="taxTotal"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Tax (USD)
                    </label>
                    <input
                        id="taxTotal"
                        name="taxTotal"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={invoice.tax_total}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                </div>
            </div>

            <div>
                <label
                    htmlFor="notes"
                    className="mb-2 block text-sm font-medium text-gray-700"
                >
                    Notes
                </label>
                <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    defaultValue={invoice.notes ?? ""}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                />
            </div>

            {message && (
                <p
                    role="status"
                    className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700"
                >
                    {message}
                </p>
            )}

            <div className="flex flex-wrap gap-3">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSaving ? "Saving..." : "Save Changes"}
                </button>

                <button
                    type="button"
                    onClick={() => router.push(`/protected/invoices/${invoice.id}`)}
                    className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
