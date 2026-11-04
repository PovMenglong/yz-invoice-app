
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Languages,
  Moon,
  Plus,
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

type Language = "en" | "km";
type Period = "week" | "month" | "year";

const translations = {
  en: {
    title: "Dashboard",
    subtitle: "Track your invoices and financial performance.",
    create: "Create invoice",
    totalInvoiced: "Total invoiced",
    collected: "Collected",
    outstanding: "Outstanding",
    overdue: "Overdue",
    period: "Reporting period",
    week: "Week",
    month: "Month",
    year: "Year",
    previous: "Previous period",
    next: "Next period",
    current: "Current period",
    recent: "Recent invoices",
    viewAll: "View all invoices",
    invoice: "Invoice",
    customer: "Customer",
    issueDate: "Issue date",
    dueDate: "Due date",
    status: "Status",
    amount: "Total",
    empty: "No invoices yet",
    emptyHint: "Create your first invoice to see it here.",
    noCustomer: "No customer",
    workspace: "Company workspace",
    language: "Switch language",
    theme: "Switch theme",
    paid: "Paid",
    draft: "Draft",
    pending: "Pending",
    overdueStatus: "Overdue",
    noPeriodInvoices: "No invoices in this period",
    invoicedHint: "Non-draft invoices issued in this period",
    collectedHint: "Paid invoices, grouped by issue date",
    outstandingHint: "Unpaid balance of invoices issued in this period",
    overdueHint: "Unpaid invoices past their due date",
    collectionNote:
      "Collection is estimated using invoice issue dates because payment dates are not recorded yet.",
  },
  km: {
    title: "ផ្ទាំងគ្រប់គ្រង",
    subtitle: "តាមដានវិក្កយបត្រ និងលទ្ធផលហិរញ្ញវត្ថុ។",
    create: "បង្កើតវិក្កយបត្រ",
    totalInvoiced: "វិក្កយបត្រសរុប",
    collected: "បានទទួលប្រាក់",
    outstanding: "ប្រាក់មិនទាន់ទូទាត់",
    overdue: "ហួសកំណត់",
    period: "រយៈពេលរបាយការណ៍",
    week: "សប្តាហ៍",
    month: "ខែ",
    year: "ឆ្នាំ",
    previous: "រយៈពេលមុន",
    next: "រយៈពេលបន្ទាប់",
    current: "រយៈពេលបច្ចុប្បន្ន",
    recent: "វិក្កយបត្រថ្មីៗ",
    viewAll: "មើលវិក្កយបត្រទាំងអស់",
    invoice: "វិក្កយបត្រ",
    customer: "អតិថិជន",
    issueDate: "កាលបរិច្ឆេទចេញ",
    dueDate: "ថ្ងៃផុតកំណត់",
    status: "ស្ថានភាព",
    amount: "សរុប",
    empty: "មិនទាន់មានវិក្កយបត្រទេ",
    emptyHint: "បង្កើតវិក្កយបត្រដំបូងរបស់អ្នក។",
    noCustomer: "គ្មានអតិថិជន",
    workspace: "កន្លែងធ្វើការរបស់ក្រុមហ៊ុន",
    language: "ប្តូរភាសា",
    theme: "ប្តូររូបរាង",
    paid: "បានទូទាត់",
    draft: "សេចក្តីព្រាង",
    pending: "កំពុងរង់ចាំ",
    overdueStatus: "ហួសកំណត់",
    noPeriodInvoices: "មិនមានវិក្កយបត្រក្នុងរយៈពេលនេះទេ",
    invoicedHint: "វិក្កយបត្រដែលបានចេញក្នុងរយៈពេលនេះ មិនរាប់សេចក្តីព្រាង",
    collectedHint: "វិក្កយបត្រដែលបានទូទាត់ ដោយផ្អែកលើថ្ងៃចេញវិក្កយបត្រ",
    outstandingHint: "ប្រាក់មិនទាន់ទូទាត់នៃវិក្កយបត្រដែលបានចេញក្នុងរយៈពេលនេះ",
    overdueHint: "វិក្កយបត្រមិនទាន់ទូទាត់ដែលហួសថ្ងៃកំណត់",
    collectionNote:
      "ការគណនាប្រាក់ដែលបានទទួលប្រើថ្ងៃចេញវិក្កយបត្រ ព្រោះមិនទាន់មានទិន្នន័យថ្ងៃទូទាត់។",
  },
};

function money(amount: number, currency: string, language: Language) {
  try {
    return new Intl.NumberFormat(language === "km" ? "km-KH" : "en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(Number(amount) || 0);
  } catch {
    return `${currency || "USD"} ${Number(amount || 0).toFixed(2)}`;
  }
}

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPeriodRange(period: Period, offset: number) {
  const today = new Date();
  let start: Date;
  let end: Date;

  if (period === "week") {
    const currentMonday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const day = currentMonday.getDay();
    currentMonday.setDate(
      currentMonday.getDate() - (day === 0 ? 6 : day - 1)
    );

    start = new Date(currentMonday);
    start.setDate(start.getDate() + offset * 7);

    end = new Date(start);
    end.setDate(end.getDate() + 6);
  } else if (period === "year") {
    start = new Date(today.getFullYear() + offset, 0, 1);
    end = new Date(today.getFullYear() + offset, 11, 31);
  } else {
    start = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    end = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
  }

  return {
    start: localDateString(start),
    end: localDateString(end),
    startDate: start,
    endDate: end,
  };
}

function formatPeriod(
  period: Period,
  start: Date,
  end: Date,
  language: Language
) {
  const locale = language === "km" ? "km-KH" : "en-US";

  if (period === "year") {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
    }).format(start);
  }

  if (period === "month") {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(start);
  }

  const startText = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(start);

  const endText = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(end);

  return `${startText} – ${endText}`;
}

function isPaid(invoice: Invoice) {
  return invoice.status.toLowerCase() === "paid";
}

function isDraft(invoice: Invoice) {
  return invoice.status.toLowerCase() === "draft";
}

function isOverdue(invoice: Invoice) {
  return (
    !isPaid(invoice) &&
    !isDraft(invoice) &&
    Boolean(invoice.due_date) &&
    invoice.due_date! < localDateString(new Date())
  );
}

function statusStyle(invoice: Invoice) {
  if (isOverdue(invoice)) {
    return "bg-red-500/10 text-red-600 dark:text-red-400";
  }

  if (isPaid(invoice)) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }

  if (isDraft(invoice)) {
    return "bg-muted text-muted-foreground";
  }

  return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
}

function displayStatus(invoice: Invoice, t: typeof translations.en) {
  if (isOverdue(invoice)) return t.overdueStatus;
  if (isPaid(invoice)) return t.paid;
  if (isDraft(invoice)) return t.draft;
  return t.pending;
}

export default function InvoiceDashboard({
  invoices,
}: {
  invoices: Invoice[];
}) {
  const [language, setLanguage] = useState<Language>("en");
  const [period, setPeriod] = useState<Period>("month");
  const [periodOffset, setPeriodOffset] = useState(0);
  const [mounted, setMounted] = useState(false);

  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);

    const saved = window.localStorage.getItem("invoice-language");
    if (saved === "en" || saved === "km") {
      setLanguage(saved);
    }
  }, []);

  const t = translations[language];
  const isDark = mounted && resolvedTheme === "dark";

  const range = useMemo(
    () => getPeriodRange(period, periodOffset),
    [period, periodOffset]
  );

  const periodInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          invoice.issue_date >= range.start &&
          invoice.issue_date <= range.end
      ),
    [invoices, range.start, range.end]
  );

  const issuedInvoices = periodInvoices.filter(
    (invoice) => !isDraft(invoice)
  );

  const paidInvoices = periodInvoices.filter(isPaid);

  const outstandingInvoices = issuedInvoices.filter(
    (invoice) => !isPaid(invoice)
  );

  const overdueInvoices = outstandingInvoices.filter(isOverdue);

  const totalAmount = (items: Invoice[]) =>
    items.reduce(
      (total, invoice) => total + Number(invoice.grand_total || 0),
      0
    );

  const currency = invoices[0]?.currency || "USD";

  const recentInvoices = useMemo(
    () =>
      [...invoices]
        .sort((a, b) => {
          const dateA = a.created_at || a.issue_date;
          const dateB = b.created_at || b.issue_date;
          return dateB.localeCompare(dateA);
        })
        .slice(0, 8),
    [invoices]
  );

  function toggleLanguage() {
    const next = language === "en" ? "km" : "en";
    setLanguage(next);
    window.localStorage.setItem("invoice-language", next);
  }

  function changePeriod(nextPeriod: Period) {
    setPeriod(nextPeriod);
    setPeriodOffset(0);
  }

  const periodLabel = formatPeriod(
    period,
    range.startDate,
    range.endDate,
    language
  );

  const isCurrentPeriod = periodOffset === 0;

  return (
    <main
      lang={language}
      className={`mx-auto w-full max-w-[1600px] space-y-6 text-base ${language === "km" ? "font-khmer" : ""
        }`}
    >
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
            {t.workspace}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#c5a45d]">
            {t.title}
          </h1>
          <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">
            {t.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            aria-label={t.language}
            title={t.language}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Languages size={18} />
            {language === "en" ? "ខ្មែរ" : "English"}
          </button>

          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={t.theme}
            title={t.theme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link
            href="/protected/invoices/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <Plus size={18} />
            {t.create}
          </Link>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.period}
            </h2>
            <p className="mt-1 text-lg text-slate-500 dark:text-slate-400">
              {periodLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {(["week", "month", "year"] as Period[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => changePeriod(item)}
                  aria-pressed={period === item}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${period === item
                      ? "bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    }`}
                >
                  {t[item]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPeriodOffset((value) => value - 1)}
              aria-label={t.previous}
              title={t.previous}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={() => setPeriodOffset((value) => value + 1)}
              disabled={isCurrentPeriod}
              aria-label={t.next}
              title={t.next}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronRight size={18} />
            </button>

            {!isCurrentPeriod && (
              <button
                type="button"
                onClick={() => setPeriodOffset(0)}
                className="h-10 rounded-lg px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
              >
                {t.current}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<FileText size={30} />}
          iconStyle="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
          accent="bg-blue-600"
          label={t.totalInvoiced}
          value={money(totalAmount(issuedInvoices), currency, language)}
          detail={`${issuedInvoices.length} · ${t.invoicedHint}`}
        />

        <SummaryCard
          icon={<CheckCircle2 size={30} />}
          iconStyle="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          accent="bg-emerald-500"
          label={t.collected}
          value={money(totalAmount(paidInvoices), currency, language)}
          detail={`${paidInvoices.length} · ${t.collectedHint}`}
        />

        <SummaryCard
          icon={<Wallet size={30} />}
          iconStyle="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          accent="bg-amber-500"
          label={t.outstanding}
          value={money(totalAmount(outstandingInvoices), currency, language)}
          detail={`${outstandingInvoices.length} · ${t.outstandingHint}`}
        />

        <SummaryCard
          icon={<AlertCircle size={30} />}
          iconStyle="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
          accent="bg-rose-500"
          label={t.overdue}
          value={money(totalAmount(overdueInvoices), currency, language)}
          detail={`${overdueInvoices.length} · ${t.overdueHint}`}
        />
      </section>

      <p className="text-base leading-relaxed text-slate-500 dark:text-slate-400">
        {t.collectionNote}
      </p>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:p-5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileText
              className="text-blue-700 dark:text-blue-400"
              size={21}
            />
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                {t.recent}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {recentInvoices.length} {language === "en" ? "most recent invoices" : "វិក្កយបត្រថ្មីៗ"}
              </p>
            </div>
          </div>

          <Link
            href="/protected/invoices"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-slate-800"
          >
            {t.viewAll}
            <ChevronRight size={20} className="ml-1" />
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <FileText size={20} />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
              {t.empty}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              {t.emptyHint}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[600px] text-left text-base">
              <thead className="bg-blue-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <tr>
                  {[t.invoice, t.customer, t.issueDate, t.dueDate, t.status].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-5 py-4 text-lg font-bold uppercase tracking-wide"
                      >
                        {heading}
                      </th>
                    )
                  )}
                  <th className="whitespace-nowrap px-5 py-4 text-right text-xl font-bold uppercase tracking-wide">
                    {t.amount}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="transition-colors hover:bg-blue-50/60 dark:hover:bg-slate-800/60"
                  >
                    <td className="whitespace-nowrap px-5 py-4">
                      <Link
                        href={`/protected/invoices/${invoice.id}`}
                        className="font-bold text-blue-700 hover:text-blue-900 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-100">
                      {invoice.customer_name || t.noCustomer}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-500 dark:text-slate-400">
                      {invoice.issue_date || "—"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-500 dark:text-slate-400">
                      {invoice.due_date || "—"}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-base font-bold ${statusStyle(invoice)}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {displayStatus(invoice, t)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-6 text-right font-bold tabular-nums text-slate-900 dark:text-white">
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

        <footer className="border-t border-slate-200 px-5 py-4 text-base text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {t.recent}
        </footer>
      </section>
    </main>
  );
}

function SummaryCard({
  icon,
  iconStyle,
  accent,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  iconStyle: string;
  accent: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />

      <div className="flex items-start justify-between gap-3">
        <p className="text-xl font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </p>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconStyle}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-4 break-words text-2xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-white sm:text-3xl">
        {value}
      </p>

      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        {detail}
      </p>
    </div>
  );
}
