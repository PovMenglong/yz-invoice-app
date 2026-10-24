
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import DeleteCustomerButton from "./delete/delete-customer-button";

type Customer = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    billing_address: string | null;
};

export default function CustomerSearch({
    customers,
}: {
    customers: Customer[];
}) {
    const [search, setSearch] = useState("");
    const [emailFilter, setEmailFilter] = useState("all");

    const filteredCustomers = useMemo(() => {
        const term = search.trim().toLowerCase();

        return customers.filter((customer) => {
            const matchesSearch =
                !term ||
                customer.name.toLowerCase().includes(term) ||
                (customer.email ?? "").toLowerCase().includes(term) ||
                (customer.phone ?? "").toLowerCase().includes(term);

            const matchesEmail =
                emailFilter === "all" ||
                (emailFilter === "with-email" && Boolean(customer.email?.trim())) ||
                (emailFilter === "without-email" && !customer.email?.trim());

            return matchesSearch && matchesEmail;
        });
    }, [customers, search, emailFilter]);

    return (
        <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="flex-1">
                        <label
                            htmlFor="customerSearch"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Search customers
                        </label>
                        <input
                            id="customerSearch"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search name, email, or phone..."
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="sm:w-56">
                        <label
                            htmlFor="emailFilter"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Email address
                        </label>
                        <select
                            id="emailFilter"
                            value={emailFilter}
                            onChange={(event) => setEmailFilter(event.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        >
                            <option value="all">All customers</option>
                            <option value="with-email">With email</option>
                            <option value="without-email">Without email</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-500">
                        Showing {filteredCustomers.length} of {customers.length} customers
                    </p>

                    {(search || emailFilter !== "all") && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setEmailFilter("all");
                            }}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            {filteredCustomers.length === 0 ? (
                <div className="px-6 py-12 text-center">
                    <p className="font-medium text-gray-900">
                        No matching customers
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                        Try another search or clear your filters.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="px-6 py-4 font-medium">Customer</th>
                                <th className="px-6 py-4 font-medium">Email</th>
                                <th className="px-6 py-4 font-medium">Phone</th>
                                <th className="px-6 py-4 font-medium">Billing Address</th>
                                <th className="px-6 py-4 font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCustomers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {customer.name}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {customer.email || "—"}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {customer.phone || "—"}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {customer.billing_address || "—"}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <Link
                                                href={`/protected/customers/${customer.id}/edit`}
                                                className="font-medium text-blue-600 hover:text-blue-700"
                                            >
                                                Edit
                                            </Link>

                                            <DeleteCustomerButton
                                                customerId={customer.id}
                                                customerName={customer.name}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
