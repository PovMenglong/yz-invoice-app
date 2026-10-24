
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Invoice = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  status: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  created_at: string;
  customer_name: string;
};

type Filter = "all" | "draft" | "pending" | "paid" | "overdue";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(Number(amount) || 0);
}

function isOverdue(invoice: Invoice) {
  return (
    invoice.status.toLowerCase() !== "paid" &&
    invoice.due_date !== null &&
    invoice.due_date < new Date().toISOString().slice(0, 10)
  );
}

function matchesFilter(invoice: Invoice, filter: Filter) {
  const status = invoice.status.toLowerCase();

  switch (filter) {
    case "draft":
      return status === "draft";
    case "paid":
      return status === "paid";
    case "overdue":
      return isOverdue(invoice);
    case "pending":
      return status === "pending" || status === "sent" ||
        status === "unpaid" || status === "partial";
    default:
      return true;
  }
}

function statusStyle(invoice: Invoice) {
  if (isOverdue(invoice)) {
    return "bg-red-100 text-red-700";
  }

  switch (invoice.status.toLowerCase()) {
    case "paid":
      return "bg-green-100 text-green-700";
    case "draft":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-amber-100 text-amber-800";
  }
}

export default function InvoiceDashboard({
  invoices,
}: {
  invoices: Invoice[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.invoice_number.toLowerCase().includes(term) ||
        invoice.customer_name.toLowerCase().includes(term);

      return matchesSearch && matchesFilter(invoice, filter);
    });
  }, [invoices, search, filter]);

  const paid = invoices.filter(
    (invoice) => invoice.status.toLowerCase() === "paid"
  );

  const pending = invoices.filter((invoice) =>
    matchesFilter(invoice, "pending")
  );

  const overdue = invoices.filter((invoice) => isOverdue(invoice));

  const totalAmount = (items: Invoice[]) =>
    items.reduce(
      (total, invoice) => total + Number(invoice.grand_total || 0),
      0
    );

  const currency = invoices[0]?.currency || "USD";

  const filters: { label: string; value: Filter }[] = [
    { label: "All invoices", value: "all" },
    { label: "Draft", value: "draft" },
    { label: "Pending", value: "pending" },
    { label: "Paid", value: "paid" },
    { label: "Overdue", value: "overdue" },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl p-5 sm:p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Invoice Management
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Manage, search, and track your company invoices.
          </p>
        </div>

        <Link
          href="/protected/invoices/new"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
        >
          + Create invoice
        </Link>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total invoices"
          value={String(invoices.length)}
          detail={`${money(totalAmount(invoices), currency)} total value`}
        />
        <SummaryCard
          label="Paid"
          value={String(paid.length)}
          detail={`${money(totalAmount(paid), currency)} paid value`}
        />
        <SummaryCard
          label="Pending"
          value={String(pending.length)}
          detail={`${money(totalAmount(pending), currency)} pending value`}
        />
        <SummaryCard
          label="Overdue"
          value={String(overdue.length)}
          detail={`${money(totalAmount(overdue), currency)} overdue value`}
        />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="text-lg font-semibold">Invoices</h2>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search invoice number or customer..."
            className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            aria-label="Search invoices"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  filter === item.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="font-semibold">No invoices found</h3>
            <p className="mt-2 text-sm text-gray-500">
              Try another search or filter, or create your first invoice.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Invoice</th>
                  <th className="px-5 py-4 font-medium">Customer</th>
                  <th className="px-5 py-4 font-medium">Issue date</th>
                  <th className="px-5 py-4 font-medium">Due date</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-semibold">
                      <Link
                        href={`/protected/invoices/${invoice.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      {invoice.customer_name}
                    </td>
                    <td className="px-5 py-4">
                      {invoice.issue_date}
                    </td>
                    <td className="px-5 py-4">
                      {invoice.due_date || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(invoice)}`}
                      >
                        {isOverdue(invoice)
                          ? "Overdue"
                          : invoice.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      {money(Number(invoice.grand_total), invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="border-t border-gray-200 px-5 py-4 text-sm text-gray-500">
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </footer>
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-gray-500">{detail}</p>
    </div>
  );
}
