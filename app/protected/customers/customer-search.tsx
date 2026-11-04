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
                (emailFilter === "with-email" &&
                    Boolean(customer.email?.trim())) ||
                (emailFilter === "without-email" &&
                    !customer.email?.trim());

            return matchesSearch && matchesEmail;
        });
    }, [customers, search, emailFilter]);

    const inputClass =
        "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400";

    const labelClass =
        "mb-2 block text-lg font-medium text-gray-700 dark:text-slate-200";

    return (
        <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-gray-200 p-6 dark:border-slate-700">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="flex-1">
                        <label htmlFor="customerSearch" className={labelClass}>
                            Search customers
                        </label>
                        <input
                            id="customerSearch"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search name, email, or phone..."
                            className={inputClass}
                        />
                    </div>

                    <div className="sm:w-56">
                        <label htmlFor="emailFilter" className={labelClass}>
                            Email address
                        </label>
                        <select
                            id="emailFilter"
                            value={emailFilter}
                            onChange={(event) => setEmailFilter(event.target.value)}
                            className={inputClass}
                        >
                            <option value="all">All customers</option>
                            <option value="with-email">With email</option>
                            <option value="without-email">Without email</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-base text-gray-500 dark:text-slate-400">
                        Showing {filteredCustomers.length} of {customers.length} customers
                    </p>

                    {(search || emailFilter !== "all") && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setEmailFilter("all");
                            }}
                            className="text-base font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            {filteredCustomers.length === 0 ? (
                <div className="px-6 py-12 text-center">
                    <p className="font-medium text-gray-900 dark:text-white">
                        No matching customers
                    </p>
                    <p className="mt-2 text-base text-gray-500 dark:text-slate-400">
                        Try another search or clear your filters.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-lg">
                        <thead className="bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-white">
                            <tr>
                                <th className="px-6 py-4 font-bold">Customer</th>
                                <th className="px-6 py-4 font-bold">Email</th>
                                <th className="px-6 py-4 font-bold">Phone</th>
                                <th className="px-6 py-4 font-bold">Billing Address</th>
                                <th className="px-6 py-4 font-bold">Action</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {filteredCustomers.map((customer) => (
                                <tr
                                    key={customer.id}
                                    className="hover:bg-gray-50 dark:hover:bg-slate-800/70"
                                >
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                        {customer.name}
                                    </td>

                                    <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                                        {customer.email || "—"}
                                    </td>

                                    <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                                        {customer.phone || "—"}
                                    </td>

                                    <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                                        {customer.billing_address || "—"}
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <Link
                                                href={`/protected/customers/${customer.id}/edit`}
                                                className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
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