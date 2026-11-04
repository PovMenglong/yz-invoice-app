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

    const inputClass =
        "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-500 dark:focus:ring-blue-500/20";

    const labelClass =
        "mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200";

    return (
        <main className="mx-auto max-w-3xl px-6 py-10">
            <Link
                href="/protected/customers"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
                ← Back to Customers
            </Link>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#c5a45d]">
                Add Customer
            </h1>

            <p className="mt-2 text-gray-500 dark:text-slate-400">
                Enter your customer's contact and billing information.
            </p>

            <form
                action={handleSubmit}
                className="mt-8 space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
                <div>
                    <label htmlFor="name" className={labelClass}>
                        Customer Name <span className="text-red-600">*</span>
                    </label>

                    <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        maxLength={200}
                        placeholder="Enter customer or company name"
                        className={inputClass}
                    />
                </div>

                <div>
                    <label htmlFor="email" className={labelClass}>
                        Email Address
                    </label>

                    <input
                        id="email"
                        name="email"
                        type="email"
                        maxLength={254}
                        placeholder="customer@example.com"
                        className={inputClass}
                    />
                </div>

                <div>
                    <label htmlFor="phone" className={labelClass}>
                        Phone Number
                    </label>

                    <input
                        id="phone"
                        name="phone"
                        type="tel"
                        maxLength={50}
                        placeholder="Enter phone number"
                        className={inputClass}
                    />
                </div>

                <div>
                    <label htmlFor="billingAddress" className={labelClass}>
                        Billing Address
                    </label>

                    <textarea
                        id="billingAddress"
                        name="billingAddress"
                        rows={4}
                        maxLength={1000}
                        placeholder="Enter billing address"
                        className={inputClass}
                    />
                </div>

                {message && (
                    <p
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                    >
                        {message}
                    </p>
                )}

                <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5 dark:border-slate-700">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? "Saving..." : "Save Customer"}
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push("/protected/customers")}
                        className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </main>
    );
}