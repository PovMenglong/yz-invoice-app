
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCustomer } from "./actions";

export default function DeleteCustomerButton({
    customerId,
    customerName,
}: {
    customerId: string;
    customerName: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");

    function handleDelete() {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${customerName}"? This action cannot be undone.`,
        );

        if (!confirmed) return;

        setError("");

        startTransition(async () => {
            const result = await deleteCustomer(customerId);

            if (!result.success) {
                setError(result.error || "Failed to delete customer.");
                return;
            }

            router.refresh();
        });
    }

    return (
        <div>
            <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
                {isPending ? "Deleting..." : "Delete"}
            </button>

            {error && (
                <p className="mt-2 max-w-xs text-xs text-red-600">{error}</p>
            )}
        </div>
    );
}
