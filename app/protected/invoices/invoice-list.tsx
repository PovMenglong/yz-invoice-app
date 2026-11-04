"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Invoice = {
    id: string;
    invoice_number: string;
    customer_id: string | null;
    customer_name: string;
    status: string;
    issue_date: string;
    due_date: string | null;
    currency: string;
    subtotal: number;
    discount_total: number;
    tax_total: number;
    grand_total: number;
    created_at: string;
};

type Filter = "all" | "draft" | "pending" | "paid" | "void" | "overdue";

type Props = {
    invoices: Invoice[];
};

const filters: { label: string; value: Filter }[] = [
    { label: "All invoices", value: "all" },
    { label: "Draft", value: "draft" },
    { label: "Pending", value: "pending" },
    { label: "Paid", value: "paid" },
    { label: "Void", value: "void" },
    { label: "Overdue", value: "overdue" },
];

function isOverdue(invoice: Invoice, today: string) {
    const status = invoice.status.toLowerCase();

    return (
        status !== "paid" &&
        status !== "draft" &&
        status !== "void" &&
        Boolean(invoice.due_date) &&
        invoice.due_date! < today
    );
}

function formatMoney(amount: number, currency: string) {
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency || "USD",
        }).format(Number(amount) || 0);
    } catch {
        return `${currency || "USD"} ${Number(amount || 0).toFixed(2)}`;
    }
}

function formatDate(date: string | null) {
    if (!date) return "—";

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

    if (match) {
        return `${match[2]}/${match[3]}/${match[1]}`;
    }

    return date;
}

function statusLabel(invoice: Invoice, today: string) {
    if (isOverdue(invoice, today)) return "Overdue";

    const status = invoice.status.toLowerCase();

    if (status === "paid") return "Paid";
    if (status === "draft") return "Draft";

    return invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
}

function statusClass(invoice: Invoice, today: string) {
    const status = statusLabel(invoice, today).toLowerCase();

    if (status === "paid") {
        return "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800";
    }

    if (status === "overdue") {
        return "bg-red-100 text-red-800 ring-1 ring-inset ring-red-200 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-800";
    }

    if (status === "draft") {
        return "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
    }

    return "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800";
}

export default function InvoiceList({ invoices }: Props) {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [today, setToday] = useState("");
    const [dateReady, setDateReady] = useState(false);

    useEffect(() => {
        // Use the browser's local calendar date for overdue calculations.
        const updateToday = () => {
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");

            setToday(`${year}-${month}-${day}`);
            setDateReady(true);
        };

        updateToday();
    }, []);

    const filteredInvoices = useMemo(() => {
        const query = search.trim().toLowerCase();

        return invoices.filter((invoice) => {
            const matchesSearch =
                !query ||
                invoice.invoice_number.toLowerCase().includes(query) ||
                invoice.customer_name.toLowerCase().includes(query);

            const status = invoice.status.toLowerCase();

            const matchesFilter =
                filter === "all" ||
                (filter === "overdue" &&
                    dateReady &&
                    isOverdue(invoice, today)) ||
                (filter === "paid" && status === "paid") ||
                (filter === "draft" && status === "draft") ||
                (filter === "void" && status === "void") ||
                (filter === "pending" &&
                    status !== "paid" &&
                    status !== "draft" &&
                    status !== "void" &&
                    (!dateReady || !isOverdue(invoice, today)));

            return matchesSearch && matchesFilter;
        });
    }, [invoices, search, filter, today, dateReady]);

    const summary = useMemo(() => {
        return {
            total: invoices.length,
            paid: invoices.filter(
                (invoice) => invoice.status.toLowerCase() === "paid"
            ).length,
            pending: invoices.filter((invoice) => {
                const status = invoice.status.toLowerCase();

                return (
                    status !== "paid" &&
                    status !== "draft" &&
                    status !== "void" &&
                    (!dateReady || !isOverdue(invoice, today))
                );
            }).length,
            overdue: dateReady
                ? invoices.filter((invoice) => isOverdue(invoice, today)).length
                : 0,
        };
    }, [invoices, today, dateReady]);

    return (
        <section className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    label="Total invoices"
                    value={summary.total}
                    color="blue"
                />
                <SummaryCard
                    label="Paid invoices"
                    value={summary.paid}
                    color="green"
                />
                <SummaryCard
                    label="Pending invoices"
                    value={summary.pending}
                    color="amber"
                />
                <SummaryCard
                    label="Overdue invoices"
                    value={summary.overdue}
                    color="red"
                />
            </div>

            {/* Invoice table */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="space-y-4 border-b border-gray-200 p-4 sm:p-6 dark:border-slate-700">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                                Invoice list
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                                Search, filter, and manage your invoices.
                            </p>
                        </div>

                        <label className="relative block w-full lg:max-w-md">
                            <span className="sr-only">Search invoices</span>
                            <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                            >
                                <circle cx="11" cy="11" r="7" />
                                <path d="m20 20-4-4" />
                            </svg>

                            <input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search invoice number or customer..."
                                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/10"
                            />
                        </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {filters.map((item) => {
                            const active = filter === item.value;

                            return (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => setFilter(item.value)}
                                    aria-pressed={active}
                                    className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${active
                                            ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                                            : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                        }`}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>

                    <p className="text-sm text-gray-500 dark:text-slate-400">
                        Showing{" "}
                        <span className="font-semibold text-gray-800 dark:text-slate-200">
                            {filteredInvoices.length}
                        </span>{" "}
                        of {invoices.length} invoices
                    </p>
                </div>

                {filteredInvoices.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                            <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                className="h-7 w-7"
                            >
                                <path d="M7 3.75h7l5 5v11.5H7a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z" />
                                <path d="M14 3.75v5h5M9 13h6M9 16.5h6" />
                            </svg>
                        </div>

                        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-slate-100">
                            No invoices found
                        </h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                            Try another search term or status filter.
                        </p>

                        {invoices.length === 0 && (
                            <Link
                                href="/protected/invoices/new"
                                className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                                Create your first invoice
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                            <table className="w-full text-left text-lg">
                            <thead className="bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-white">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Invoice</th>
                                    <th className="px-6 py-4 font-bold">Customer</th>
                                    <th className="px-6 py-4 font-bold">Issue date</th>
                                    <th className="px-6 py-4 font-bold">Due date</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold">Total</th>
                                    <th className="px-6 py-4 font-bold">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                                {filteredInvoices.map((invoice) => (
                                    <tr
                                        key={invoice.id}
                                        className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/70"
                                    >
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <Link
                                                href={`/protected/invoices/${invoice.id}`}
                                                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                                            >
                                                {invoice.invoice_number}
                                            </Link>
                                        </td>

                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-700 dark:text-slate-200">
                                            {invoice.customer_name}
                                        </td>

                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                                            {formatDate(invoice.issue_date)}
                                        </td>

                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                                            {formatDate(invoice.due_date)}
                                        </td>

                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                                                    invoice,
                                                    today
                                                )}`}
                                            >
                                                {statusLabel(invoice, today)}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap px-6 py-4 text-left text-lg font-bold text-gray-900 dark:text-slate-100">
                                            {formatMoney(
                                                invoice.grand_total,
                                                invoice.currency
                                            )}
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-4">
                                            <div className="flex items-center gap-3 text-sm">
                                                <Link
                                                    href={`/protected/invoices/${invoice.id}`}
                                                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                                                >
                                                    View
                                                </Link>

                                                <Link
                                                    href={`/protected/invoices/${invoice.id}/edit`}
                                                    className="font-medium text-gray-700 hover:underline dark:text-slate-300"
                                                >
                                                    Edit
                                                </Link>

                                                <Link
                                                    href={`/protected/invoices/${invoice.id}`}
                                                    title="Open the invoice details page to print or export PDF"
                                                    className="font-medium text-gray-700 hover:underline dark:text-slate-300"
                                                >
                                                    Print/PDF
                                                </Link>

                                                <Link
                                                    href={`/protected/invoices/${invoice.id}`}
                                                    title="Open the invoice details page to access the delete action"
                                                    className="font-medium text-red-600 hover:underline dark:text-red-400"
                                                >
                                                    Delete
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex flex-col gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400">
                    <span>
                        Showing {filteredInvoices.length} of {invoices.length} invoices
                    </span>
                    <span className="text-xs">
                        Invoice Management
                    </span>
                </div>
            </div>
        </section>
    );
}

function SummaryCard({
    label,
    value,
    color = "blue",
}: {
    label: string;
    value: number;
    color?: "blue" | "green" | "amber" | "red";
}) {
    const colors = {
        blue: {
            border: "border-t-blue-500",
            icon: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
            value: "text-blue-700 dark:text-blue-400",
        },
        green: {
            border: "border-t-emerald-500",
            icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
            value: "text-emerald-700 dark:text-emerald-400",
        },
        amber: {
            border: "border-t-amber-500",
            icon: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
            value: "text-amber-700 dark:text-amber-400",
        },
        red: {
            border: "border-t-rose-500",
            icon: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
            value: "text-rose-700 dark:text-rose-400",
        },
    };

    const selected = colors[color];

    return (
        <div
            className={`rounded-xl border border-t-4 border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 ${selected.border}`}
        >
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
                    {label}
                </p>

                <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected.icon}`}
                >
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                    >
                        {color === "blue" && (
                            <>
                                <path d="M7 3.75h7l5 5v11.5H7a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z" />
                                <path d="M14 3.75v5h5M9 13h6M9 16.5h6" />
                            </>
                        )}
                        {color === "green" && (
                            <>
                                <circle cx="12" cy="12" r="9" />
                                <path d="m8 12 2.5 2.5L16 9" />
                            </>
                        )}
                        {color === "amber" && (
                            <>
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v5l3 2" />
                            </>
                        )}
                        {color === "red" && (
                            <>
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v6M12 16.5v.1" />
                            </>
                        )}
                    </svg>
                </span>
            </div>

            <p className={`mt-3 text-3xl font-bold tracking-tight ${selected.value}`}>
                {value.toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                {color === "blue"
                    ? "Across all invoices"
                    : color === "green"
                        ? "Successfully paid"
                        : color === "amber"
                            ? "Awaiting payment"
                            : "Past their due date"}
            </p>
        </div>
    );
}

function TableHeading({
    children,
    align = "left",
}: {
    children: React.ReactNode;
    align?: "left" | "right";
}) {
    return (
        <th
            scope="col"
            className={`whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 ${align === "right" ? "text-right" : "text-left"
                }`}
        >
            {children}
        </th>
    );
}
