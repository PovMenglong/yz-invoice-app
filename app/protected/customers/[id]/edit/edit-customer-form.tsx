
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCustomer } from "./actions";

type CustomerFormData = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    billing_address: string | null;
};

export default function EditCustomerForm({
    customer,
}: {
    customer: CustomerFormData;
}) {
    const router = useRouter();
    const [message, setMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    async function handleSubmit(formData: FormData) {
        setMessage("");
        setIsSaving(true);

        try {
            const result = await updateCustomer(formData);

            if (!result.success) {
                setMessage(result.message);
                return;
            }

            router.push("/protected/customers");
            router.refresh();
        } catch {
            setMessage("Something went wrong while updating the customer.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form action={handleSubmit} className="mt-8 space-y-6">
            <input type="hidden" name="customerId" value={customer.id} />

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
                    defaultValue={customer.name}
                    required
                    maxLength={200}
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
                    defaultValue={customer.email ?? ""}
                    maxLength={254}
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
                    defaultValue={customer.phone ?? ""}
                    maxLength={50}
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
                    defaultValue={customer.billing_address ?? ""}
                    maxLength={1000}
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
                    {isSaving ? "Saving..." : "Save Changes"}
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
    );
}
