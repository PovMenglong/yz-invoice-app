
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  Languages,
  Moon,
  Plus,
  Search,
  Sun,
  Wallet,
} from "lucide-react";

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
type Language = "en" | "km";

const translations = {
  en: {
    title: "Dashboard",
    subtitle: "Track your invoices and payments at a glance.",
    create: "Create invoice",
    total: "Total invoices",
    paid: "Paid invoices",
    pending: "Pending invoices",
    overdue: "Overdue invoices",
    totalValue: "Total invoice value",
    paidValue: "Paid value",
    pendingValue: "Pending value",
    overdueValue: "Overdue value",
    recent: "Invoices",
    search: "Search invoice number or customer...",
    all: "All invoices",
    draft: "Draft",
    pendingFilter: "Pending",
    paidFilter: "Paid",
    overdueFilter: "Overdue",
    invoice: "Invoice",
    customer: "Customer",
    issueDate: "Issue date",
    dueDate: "Due date",
    status: "Status",
    amount: "Total",
    empty: "No invoices found",
    emptyHint: "Try another search or filter, or create your first invoice.",
    showing: "Showing",
    of: "of",
    invoices: "invoices",
    overdueStatus: "Overdue",
    noCustomer: "No customer",
    workspace: "Company workspace",
    language: "Switch language",
    theme: "Switch theme",
    light: "Light mode",
    dark: "Dark mode",
  },
  km: {
    title: "ផ្ទាំងគ្រប់គ្រង",
    subtitle: "តាមដានវិក្កយបត្រ និងការទូទាត់របស់អ្នក។",
    create: "បង្កើតវិក្កយបត្រ",
    total: "វិក្កយបត្រសរុប",
    paid: "បានទូទាត់",
    pending: "កំពុងរង់ចាំ",
    overdue: "ហួសកំណត់",
    totalValue: "តម្លៃវិក្កយបត្រសរុប",
    paidValue: "ចំនួនទឹកប្រាក់ដែលបានទូទាត់",
    pendingValue: "ចំនួនទឹកប្រាក់ដែលកំពុងរង់ចាំ",
    overdueValue: "ចំនួនទឹកប្រាក់ដែលហួសកំណត់",
    recent: "វិក្កយបត្រ",
    search: "ស្វែងរកលេខវិក្កយបត្រ ឬអតិថិជន...",
    all: "វិក្កយបត្រទាំងអស់",
    draft: "សេចក្តីព្រាង",
    pendingFilter: "កំពុងរង់ចាំ",
    paidFilter: "បានទូទាត់",
    overdueFilter: "ហួសកំណត់",
    invoice: "វិក្កយបត្រ",
    customer: "អតិថិជន",
    issueDate: "កាលបរិច្ឆេទចេញ",
    dueDate: "ថ្ងៃផុតកំណត់",
    status: "ស្ថានភាព",
    amount: "សរុប",
    empty: "រកមិនឃើញវិក្កយបត្រទេ",
    emptyHint: "សាកល្បងស្វែងរក ឬជ្រើសតម្រងផ្សេងទៀត។",
    showing: "បង្ហាញ",
    of: "ក្នុងចំណោម",
    invoices: "វិក្កយបត្រ",
    overdueStatus: "ហួសកំណត់",
    noCustomer: "គ្មានអតិថិជន",
    workspace: "កន្លែងធ្វើការរបស់ក្រុមហ៊ុន",
    language: "ប្តូរភាសា",
    theme: "ប្តូររូបរាង",
    light: "រូបរាងភ្លឺ",
    dark: "រូបរាងងងឹត",
  },
};

function money(amount: number, currency: string, language: Language) {
  try {
    return new Intl.NumberFormat(
      language === "km" ? "km-KH" : "en-US",
      {
        style: "currency",
        currency: currency || "USD",
      }
    ).format(Number(amount) || 0);
  } catch {
    return `${currency || "USD"} ${Number(amount || 0).toFixed(2)}`;
  }
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
      return (
        status === "pending" ||
        status === "sent" ||
        status === "unpaid" ||
        status === "partial"
      );
    default:
      return true;
  }
}

function statusStyle(invoice: Invoice) {
  if (isOverdue(invoice)) {
    return "bg-red-500/10 text-red-600 dark:text-red-400";
  }

  switch (invoice.status.toLowerCase()) {
    case "paid":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "draft":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  }
}

function displayStatus(invoice: Invoice, t: typeof translations.en) {
  if (isOverdue(invoice)) return t.overdueStatus;

  switch (invoice.status.toLowerCase()) {
    case "paid":
      return t.paidFilter;
    case "draft":
      return t.draft;
    case "pending":
    case "sent":
    case "unpaid":
    case "partial":
      return t.pendingFilter;
    default:
      return invoice.status;
  }
}

export default function InvoiceDashboard({
  invoices,
}: {
  invoices: Invoice[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [language, setLanguage] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    const saved = window.localStorage.getItem("invoice-language");
    if (saved === "en" || saved === "km") setLanguage(saved);
  }, []);

  const t = translations[language];
  const isDark = mounted && resolvedTheme === "dark";

  function toggleLanguage() {
    const next = language === "en" ? "km" : "en";
    setLanguage(next);
    window.localStorage.setItem("invoice-language", next);
  }

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.invoice_number.toLowerCase().includes(term) ||
        (invoice.customer_name || "").toLowerCase().includes(term);

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
    { label: t.all, value: "all" },
    { label: t.draft, value: "draft" },
    { label: t.pendingFilter, value: "pending" },
    { label: t.paidFilter, value: "paid" },
    { label: t.overdueFilter, value: "overdue" },
  ];

  return (
    <main
      lang={language === "km" ? "km" : "en"}
      className={`mx-auto w-full max-w-[1600px] space-y-7 text-base ${language === "km" ? "font-khmer" : ""
        }`}
    >
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {t.workspace}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              {t.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t.subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            aria-label={t.language}
            title={t.language}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium transition hover:bg-accent"
          >
            <Languages size={17} />
            {language === "en" ? "ខ្មែរ" : "English"}
          </button>

          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={t.theme}
            title={t.theme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-accent"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link
            href="/protected/invoices/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <Plus size={18} />
            {t.create}
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<FileText size={20} />}
          iconStyle="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          label={t.total}
          value={String(invoices.length)}
          detail={`${money(totalAmount(invoices), currency, language)} · ${t.totalValue}`}
        />
        <SummaryCard
          icon={<CheckCircle2 size={20} />}
          iconStyle="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          label={t.paid}
          value={String(paid.length)}
          detail={`${money(totalAmount(paid), currency, language)} · ${t.paidValue}`}
        />
        <SummaryCard
          icon={<Clock3 size={20} />}
          iconStyle="bg-amber-500/10 text-amber-700 dark:text-amber-400"
          label={t.pending}
          value={String(pending.length)}
          detail={`${money(totalAmount(pending), currency, language)} · ${t.pendingValue}`}
        />
        <SummaryCard
          icon={<AlertCircle size={20} />}
          iconStyle="bg-red-500/10 text-red-600 dark:text-red-400"
          label={t.overdue}
          value={String(overdue.length)}
          detail={`${money(totalAmount(overdue), currency, language)} · ${t.overdueValue}`}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">{t.recent}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.showing} {filteredInvoices.length} {t.of}{" "}
                {invoices.length} {t.invoices}
              </p>
            </div>

            <div className="relative w-full sm:max-w-sm">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.search}
                aria-label={t.search}
                className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                aria-pressed={filter === item.value}
                className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${filter === item.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FileText size={24} />
            </div>
            <h3 className="mt-4 font-semibold">{t.empty}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {t.emptyHint}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-base">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  {[t.invoice, t.customer, t.issueDate, t.dueDate, t.status].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="px-5 py-4 font-medium"
                      >
                        {heading}
                      </th>
                    )
                  )}
                  <th className="px-5 py-4 text-right font-medium">
                    {t.amount}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-border/70 transition-colors hover:bg-accent/40"
                  >
                    <td className="px-5 py-4 font-semibold">
                      <Link
                        href={`/protected/invoices/${invoice.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      {invoice.customer_name || t.noCustomer}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                      {invoice.issue_date || "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                      {invoice.due_date || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(invoice)}`}
                      >
                        {displayStatus(invoice, t)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums">
                      {money(
                        Number(invoice.grand_total),
                        invoice.currency,
                        language
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="border-t border-border px-5 py-4 text-sm text-muted-foreground">
          {t.showing} {filteredInvoices.length} {t.of}{" "}
          {invoices.length} {t.invoices}
        </footer>
      </section>
    </main>
  );
}

function SummaryCard({
  icon,
  iconStyle,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  iconStyle: string;
  label: string;
  value: string;
  detail: string;
}) {

  return (
    <div className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <p className="text-lg font-semibold leading-relaxed text-muted-foreground">
          {label}
        </p>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-5 text-4xl font-bold tracking-tight tabular-nums">
        {value}
      </p>

      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        {detail}
      </p>
    </div>
  );

}
