
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCustomer } from "./actions";

export default function NewCustomerPage() {
    const router = useRouter();
    const [message, setMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    async function handleSubmit(formData: FormData) {
        setMessage("");
        setIsSaving(true);

        try {
            const result = await createCustomer(formData);
            setMessage(result.message);

            if (result.success) {
                router.push("/protected/customers");
                router.refresh();
            }
        } catch {
            setMessage("Something went wrong while adding the customer.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <main className="mx-auto max-w-3xl px-6 py-10">
            <Link
                href="/protected/customers"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
                ← Back to Customers
            </Link>

            <h1 className="mt-6 text-3xl font-bold text-gray-900">
                Add Customer
            </h1>
            <p className="mt-2 text-gray-500">
                Enter your customer's contact and billing information.
            </p>

            <form action={handleSubmit} className="mt-8 space-y-6">
                <div>
                    <label
                        htmlFor="name"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Customer Name *
                    </label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        maxLength={200}
                        placeholder="Enter customer or company name"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                </div>

                <div>
                    <label
                        htmlFor="email"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Email Address
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        maxLength={254}
                        placeholder="customer@example.com"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                </div>

                <div>
                    <label
                        htmlFor="phone"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Phone Number
                    </label>
                    <input
                        id="phone"
                        name="phone"
                        type="tel"
                        maxLength={50}
                        placeholder="Enter phone number"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                </div>

                <div>
                    <label
                        htmlFor="billingAddress"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Billing Address
                    </label>
                    <textarea
                        id="billingAddress"
                        name="billingAddress"
                        rows={4}
                        maxLength={1000}
                        placeholder="Enter billing address"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                </div>

                {message && (
                    <p role="alert" className="text-sm text-red-600">
                        {message}
                    </p>
                )}

                <div className="flex flex-wrap gap-3">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? "Saving..." : "Save Customer"}
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push("/protected/customers")}
                        className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </main>
    );
}
