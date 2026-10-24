
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteInvoice } from "./actions";

type DeleteInvoiceButtonProps = {
    invoiceId: string;
};

export default function DeleteInvoiceButton({
    invoiceId,
}: DeleteInvoiceButtonProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [message, setMessage] = useState("");

    async function handleDelete() {
        const confirmed = window.confirm(
            "Are you sure you want to delete this invoice? This action cannot be undone.",
        );

        if (!confirmed) {
            return;
        }

        setIsDeleting(true);
        setMessage("");

        try {
            const formData = new FormData();
            formData.append("invoiceId", invoiceId);

            const result = await deleteInvoice(formData);

            if (!result.success) {
                setMessage(result.message);
                setIsDeleting(false);
                return;
            }

            router.replace("/protected");
            router.refresh();
        } catch {
            setMessage("Something went wrong while deleting the invoice.");
            setIsDeleting(false);
        }
    }

    return (
        <div>
            <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isDeleting ? "Deleting..." : "Delete Invoice"}
            </button>

            {message && (
                <p role="alert" className="mt-3 text-sm text-red-600">
                    {message}
                </p>
            )}
        </div>
    );
}
