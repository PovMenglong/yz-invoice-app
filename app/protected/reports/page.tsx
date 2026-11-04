
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type InvoiceRow = {
    id: string;
    invoice_number: string;
    status: string;
    currency: string;
    grand_total: number;
    issue_date: string;
};

const NAVY = "#142b4a";
const GOLD = "#c5a45d";

export default async function ReportsPage() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/auth/login");
    }

    const { data: membership, error: membershipError } = await supabase
        .from("company_members")
        .select("is_active")
        .eq("user_id", user.id)
        .maybeSingle();

    if (
        membershipError ||
        !membership ||
        membership.is_active !== true
    ) {
        return (
            <main className="mx-auto w-full max-w-7xl p-6 sm:p-8">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
                    <h1 className="text-2xl font-bold text-[#142b4a] dark:text-white">
                        Company access required
                    </h1>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        Your account must be an active company member to view reports.
                    </p>
                </div>
            </main>
        );
    }

    const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, currency, grand_total, issue_date")
        .order("issue_date", { ascending: false });

    if (error) {
        console.error("Reports invoice query failed:", error.message);

        return (
            <main className="mx-auto w-full max-w-7xl p-6 sm:p-8">
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
                    <h1 className="text-2xl font-bold text-red-800 dark:text-red-300">
                        Unable to load reports
                    </h1>
                    <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                        Check your invoices SELECT policy and try again.
                    </p>
                </div>
            </main>
        );
    }

    const invoices = (data ?? []) as InvoiceRow[];

    const paid = invoices.filter(
        (invoice) => invoice.status.toLowerCase() === "paid"
    );

    const pending = invoices.filter((invoice) =>
        ["pending", "draft"].includes(invoice.status.toLowerCase())
    );

    const formatMoney = (amount: number, currency: string) => {
        try {
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency,
                maximumFractionDigits: 2,
            }).format(amount);
        } catch {
            return `${currency} ${amount.toLocaleString("en-US", {
                maximumFractionDigits: 2,
            })}`;
        }
    };

    const totalByCurrency = (rows: InvoiceRow[]) => {
        const totals = new Map<string, number>();

        for (const invoice of rows) {
            totals.set(
                invoice.currency,
                (totals.get(invoice.currency) ?? 0) +
                Number(invoice.grand_total)
            );
        }

        return Array.from(totals.entries());
    };

    const totalInvoices = totalByCurrency(invoices);
    const paidTotals = totalByCurrency(paid);
    const pendingTotals = totalByCurrency(pending);

    const cards = [
        {
            label: "Total invoices",
            count: invoices.length,
            description: "All recorded invoices",
            accent: "border-l-[#142b4a]",
            icon: "▤",
        },
        {
            label: "Paid invoices",
            count: paid.length,
            description: "Successfully paid",
            accent: "border-l-emerald-600",
            icon: "✓",
        },
        {
            label: "Draft / pending",
            count: pending.length,
            description: "Awaiting completion",
            accent: "border-l-[#c5a45d]",
            icon: "◷",
        },
    ];

    const valueSections = [
        {
            title: "Total invoice value",
            description: "Combined value of all invoices",
            rows: totalInvoices,
            accent: "border-t-[#142b4a]",
        },
        {
            title: "Paid invoice value",
            description: "Value of paid invoices",
            rows: paidTotals,
            accent: "border-t-emerald-600",
        },
        {
            title: "Draft / pending value",
            description: "Value awaiting payment",
            rows: pendingTotals,
            accent: "border-t-[#c5a45d]",
        },
    ];

    const getStatusStyle = (status: string) => {
        switch (status.toLowerCase()) {
            case "paid":
                return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
            case "issued":
                return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300";
            case "pending":
                return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
            case "draft":
                return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
            case "void":
                return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
            default:
                return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
        }
    };

    return (
        <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
            {/* Page heading */}
            <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
                <div
                    className="absolute left-0 top-0 h-full w-1.5"
                    style={{ backgroundColor: GOLD }}
                />

                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div>
                        <p
                            className="text-xs font-bold uppercase tracking-[0.2em]"
                            style={{ color: GOLD }}
                        >
                            Y&Z Home Store Cambodia
                        </p>

                        <h1
                            className="mt-1 text-3xl font-bold tracking-tight text-[#c5a45d]"
                            style={{ color: GOLD }}
                        >
                            Financial Reports
                        </h1>

                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Review invoice performance, payment status, and financial totals.
                        </p>
                    </div>

                    <Link
                        href="/protected/invoices"
                        className="inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                        style={{ backgroundColor: NAVY }}
                    >
                        View all invoices
                        <span className="ml-2" aria-hidden="true">→</span>
                    </Link>
                </div>
            </header>

            {/* Summary cards */}
            <section>
                <div className="mb-4 flex items-center gap-3">
                    <div
                        className="h-6 w-1 rounded-full"
                        style={{ backgroundColor: GOLD }}
                    />
                    <h2 className="text-lg font-bold text-[#142b4a] dark:text-white">
                        Invoice overview
                    </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {cards.map((card) => (
                        <div
                            key={card.label}
                            className={`rounded-xl border border-slate-200 border-l-4 ${card.accent} bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                        {card.label}
                                    </p>

                                    <p className="mt-3 text-4xl font-bold tracking-tight text-[#142b4a] dark:text-white">
                                        {card.count}
                                    </p>

                                    <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                                        {card.description}
                                    </p>
                                </div>

                                <div
                                    className="flex h-11 w-11 items-center justify-center rounded-xl text-xl font-bold"
                                    style={{
                                        backgroundColor: "#f7f2e7",
                                        color: NAVY,
                                    }}
                                >
                                    {card.icon}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Financial totals */}
            <section>
                <div className="mb-4 flex items-center gap-3">
                    <div
                        className="h-6 w-1 rounded-full"
                        style={{ backgroundColor: GOLD }}
                    />
                    <div>
                        <h2 className="text-lg font-bold text-[#142b4a] dark:text-white">
                            Financial summary
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            Amounts are grouped separately by currency.
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    {valueSections.map((section) => (
                        <div
                            key={section.title}
                            className={`rounded-xl border border-slate-200 border-t-4 ${section.accent} bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900`}
                        >
                            <h3 className="font-bold text-[#142b4a] dark:text-white">
                                {section.title}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {section.description}
                            </p>

                            <div className="mt-5 space-y-4">
                                {section.rows.length > 0 ? (
                                    section.rows.map(([currency, amount]) => (
                                        <div
                                            key={currency}
                                            className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800"
                                        >
                                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                                {currency}
                                            </span>

                                            <span className="text-right text-base font-bold text-[#142b4a] dark:text-white">
                                                {formatMoney(amount, currency)}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                        No data available yet.
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Invoice table */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center dark:border-slate-700 sm:p-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div
                                className="h-6 w-1 rounded-full"
                                style={{ backgroundColor: GOLD }}
                            />
                            <h2 className="text-lg font-bold text-[#142b4a] dark:text-white">
                                Invoice details
                            </h2>
                        </div>

                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {invoices.length} invoices in the current report.
                        </p>
                    </div>

                    <Link
                        href="/protected/invoices"
                        className="inline-flex items-center justify-center rounded-lg border border-[#c5a45d] bg-[#f7f2e7] px-4 py-2.5 text-sm font-semibold text-[#142b4a] transition hover:bg-[#eee4cf] dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                    >
                        Manage invoices
                        <span className="ml-2" aria-hidden="true">→</span>
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px] text-left text-sm">
                        <thead className="bg-[#142b4a] text-white">
                            <tr>
                                <th className="px-5 py-4 font-semibold">Invoice number</th>
                                <th className="px-5 py-4 font-semibold">Issue date</th>
                                <th className="px-5 py-4 font-semibold">Status</th>
                                <th className="px-5 py-4 text-right font-semibold">Total amount</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {invoices.map((invoice) => (
                                <tr
                                    key={invoice.id}
                                    className="transition hover:bg-[#f7f2e7]/60 dark:hover:bg-slate-800/60"
                                >
                                    <td className="px-5 py-4">
                                        <Link
                                            href={`/protected/invoices/${invoice.id}`}
                                            className="font-bold text-[#142b4a] hover:underline dark:text-amber-300"
                                        >
                                            {invoice.invoice_number}
                                        </Link>
                                    </td>

                                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                                        {invoice.issue_date || "—"}
                                    </td>

                                    <td className="px-5 py-4">
                                        <span
                                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusStyle(invoice.status)}`}
                                        >
                                            {invoice.status}
                                        </span>
                                    </td>

                                    <td className="px-5 py-4 text-right font-bold text-[#142b4a] dark:text-white">
                                        {formatMoney(
                                            Number(invoice.grand_total),
                                            invoice.currency
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {invoices.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-5 py-14 text-center"
                                    >
                                        <div className="mx-auto max-w-sm">
                                            <div className="text-3xl text-slate-300">▤</div>
                                            <p className="mt-3 font-semibold text-[#142b4a] dark:text-white">
                                                No invoices found
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                Create your first invoice to see financial reports here.
                                            </p>

                                            <Link
                                                href="/protected/invoices/new"
                                                className="mt-4 inline-flex rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
                                                style={{ backgroundColor: NAVY }}
                                            >
                                                Create invoice
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Reports are based on invoices accessible to your company account.
                    </p>
                </div>
            </section>
        </main>
    );
}
