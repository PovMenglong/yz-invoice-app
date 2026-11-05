
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import DeleteInvoiceButton from "./delete/delete-invoice-button";
import DownloadInvoicePdf from "./download-invoice-pdf";
import UpdateInvoiceStatus from "./update-invoice-status";
import InvoicePrintView from "./invoice-print-view";
import InvoiceAssignmentManager from "./invoice-assignment-manager";

export const instant = false;

type InvoiceDetails = {
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
    notes: string | null;
    created_at: string;
};

type CustomerDetails = {
    name: string;
    phone: string;
    email: string;
    billing_address: string;
};

type InvoiceItem = {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount: number;
    tax_rate: number;
    line_total: number;
};

type PrintSettings = {
    template: "professional" | "minimal";
    primary_color: string;
    accent_color: string;
    page_size: "A4" | "Letter";
    orientation: "portrait" | "landscape";
    show_logo: boolean;
    show_tax_id: boolean;
    show_signature: boolean;
    show_stamp: boolean;
};

const defaultPrintSettings: PrintSettings = {
    template: "professional",
    primary_color: "#142b4a",
    accent_color: "#c5a45d",
    page_size: "A4",
    orientation: "portrait",
    show_logo: true,
    show_tax_id: true,
    show_signature: true,
    show_stamp: true,
};

export default async function InvoiceDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await connection();

    const { id } = await params;
    const supabase = await createClient();

    // Verify authentication.
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/auth/login");
    }

    // Verify active company membership.
    const { data: membership, error: membershipError } = await supabase
        .from("company_members")
        .select("role, is_active")
        .eq("user_id", user.id)
        .maybeSingle();

    if (membershipError) {
        throw new Error("Unable to verify company access.");
    }

    if (!membership || !membership.is_active) {
        return (
            <main className="min-h-screen bg-slate-50 p-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
                <h1 className="text-xl font-bold">
                    Company access required
                </h1>
                <p className="mt-2 text-slate-600 dark:text-slate-400">
                    Your account must be an active company member to view invoices.
                </p>
            </main>
        );
    }

    // Load invoice.
    const { data: invoice, error } = await supabase
        .from("invoices")
        .select(
            "id, invoice_number, customer_id, status, issue_date, due_date, currency, subtotal, discount_total, tax_total, grand_total, notes, created_at"
        )
        .eq("id", id)
        .maybeSingle();

    if (error) {
        throw new Error("Unable to load invoice details.");
    }

    if (!invoice) {
        notFound();
    }

    const invoiceData = invoice as InvoiceDetails;

    // Load company information.
    const { data: company, error: companyError } = await supabase
        .from("companies")
        .select(
            "id, name, billing_address, phone, email, website, tax_id, logo_path, khqr_path, authorized_signature_path, company_stamp_path"
        )
        .eq("singleton", true)
        .maybeSingle();

    if (companyError) {
        console.error(
            "Unable to load company information:",
            companyError.message
        );
    }

    // Load invoice items.
    const { data: invoiceItems, error: itemsError } = await supabase
        .from("invoice_items")
        .select(
            "id, description, quantity, unit_price, discount, tax_rate, line_total"
        )
        .eq("invoice_id", invoiceData.id)
        .order("sort_order", { ascending: true });

    if (itemsError) {
        throw new Error("Unable to load invoice items.");
    }

    const items = (invoiceItems ?? []) as InvoiceItem[];

    // Load customer information.
    let customerData: CustomerDetails = {
        name: "No customer",
        phone: "",
        email: "",
        billing_address: "",
    };

    if (invoiceData.customer_id) {
        const { data: customer, error: customerError } = await supabase
            .from("customers")
            .select("name, phone, email, billing_address")
            .eq("id", invoiceData.customer_id)
            .maybeSingle();

        if (customerError) {
            throw new Error("Unable to load customer details.");
        }

        customerData = {
            name: customer?.name ?? "Unknown customer",
            phone: customer?.phone ?? "",
            email: customer?.email ?? "",
            billing_address: customer?.billing_address ?? "",
        };
    }

    // Load saved print settings.
    let printSettings = defaultPrintSettings;

    if (company?.id) {
        const { data: savedSettings, error: settingsError } = await supabase
            .from("print_settings")
            .select(
                "template, primary_color, accent_color, page_size, orientation, show_logo, show_tax_id, show_signature, show_stamp"
            )
            .eq("company_id", company.id)
            .maybeSingle();

        if (settingsError) {
            throw new Error("Unable to load print settings.");
        }

        if (savedSettings) {
            printSettings = {
                template:
                    savedSettings.template === "minimal"
                        ? "minimal"
                        : "professional",
                primary_color:
                    savedSettings.primary_color ??
                    defaultPrintSettings.primary_color,
                accent_color:
                    savedSettings.accent_color ??
                    defaultPrintSettings.accent_color,
                page_size:
                    savedSettings.page_size === "Letter"
                        ? "Letter"
                        : "A4",
                orientation:
                    savedSettings.orientation === "landscape"
                        ? "landscape"
                        : "portrait",
                show_logo: savedSettings.show_logo ?? true,
                show_tax_id: savedSettings.show_tax_id ?? true,
                show_signature: savedSettings.show_signature ?? true,
                show_stamp: savedSettings.show_stamp ?? true,
            };
        }
    }

    // Generate temporary URLs for private company assets.
    async function getCompanyImageUrl(path: string | null) {
        if (!path) return null;

        const { data, error } = await supabase.storage
            .from("company-assets")
            .createSignedUrl(path, 60 * 60);

        if (error) {
            console.error(
                "Unable to load company image:",
                error.message
            );
            return null;
        }

        return data.signedUrl;
    }

    const companyLogoUrl = await getCompanyImageUrl(
        company?.logo_path ?? null
    );

    const companyKhqrUrl = await getCompanyImageUrl(
        company?.khqr_path ?? null
    );

    const companySignatureUrl = await getCompanyImageUrl(
        company?.authorized_signature_path ?? null
    );

    const companyStampUrl = await getCompanyImageUrl(
        company?.company_stamp_path ?? null
    );

    // Verify invoice editing permissions.
    const { data: canEdit, error: permissionError } = await supabase.rpc(
        "can_edit_invoice",
        { target_invoice_id: invoiceData.id }
    );

    if (permissionError) {
        throw new Error("Unable to verify invoice editing permissions.");
    }

    // Verify admin permissions.
    const canAdministerAssignments = membership.role === "admin";
    const canDelete = canAdministerAssignments;

    // Load employees and current assignments for administrators.
    let employees: { id: string; name: string }[] = [];
    let assignedEmployeeIds: string[] = [];

    if (canAdministerAssignments) {
        const { data: employeeMemberships, error: employeesError } =
            await supabase
                .from("company_members")
                .select("user_id")
                .eq("role", "employee")
                .eq("is_active", true);

        if (employeesError) {
            throw new Error("Unable to load active employees.");
        }

        const employeeIds = (employeeMemberships ?? []).map(
            (member) => member.user_id
        );

        let employeeProfiles: { id: string; full_name: string }[] = [];

        if (employeeIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
                .from("profiles")
                .select("id, full_name")
                .in("id", employeeIds);

            if (profilesError) {
                throw new Error("Unable to load employee profiles.");
            }

            employeeProfiles = profiles ?? [];
        }

        const profileNameById = new Map(
            employeeProfiles.map((profile) => [profile.id, profile.full_name])
        );

        employees = employeeIds.map((id) => ({
            id,
            name: profileNameById.get(id) || "Employee (profile unavailable)",
        }));

        const { data: assignments, error: assignmentsError } = await supabase
            .from("invoice_assignments")
            .select("user_id")
            .eq("invoice_id", invoiceData.id);

        if (assignmentsError) {
            throw new Error("Unable to load invoice assignments.");
        }

        assignedEmployeeIds = (assignments ?? []).map(
            (assignment) => assignment.user_id
        );
    }

    // Currency formatting.
    const money = (value: number) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: invoiceData.currency || "USD",
        }).format(Number(value) || 0);

    // Invoice status styling.
    const status = invoiceData.status.toLowerCase();

    const statusStyle =
        status === "paid"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
            : status === "void"
                ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                : status === "draft"
                    ? "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300";

    const cardClass =
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900";

    const sectionClass =
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors duration-200 sm:p-6 dark:border-slate-800 dark:bg-slate-900";

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 transition-colors duration-200 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
            <div className="mx-auto max-w-6xl space-y-6">

                {/* Breadcrumb */}
                <Link
                    href="/protected/invoices"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#142b4a] dark:text-slate-400 dark:hover:text-[#c5a45d]"
                >
                    <span aria-hidden="true">←</span>
                    Back to Invoices
                </Link>

                {/* Invoice header */}
                <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6 shadow-sm transition-colors duration-200 sm:p-8 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-[#142b4a] dark:shadow-xl">
                    <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#c5a45d]/10 blur-3xl" />

                    <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7936] dark:text-[#d8b96f]">
                                    Invoice Details
                                </span>

                                <span
                                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusStyle}`}
                                >
                                    {invoiceData.status}
                                </span>
                            </div>

                            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#142b4a] sm:text-4xl dark:text-white">
                                {invoiceData.invoice_number}
                            </h1>

                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                Manage invoice information, customer details, and payment summary.
                            </p>

                            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                                Customer:{" "}
                                <span className="font-semibold text-slate-900 dark:text-white">
                                    {customerData.name}
                                </span>
                            </p>
                        </div>

                        {/* Invoice actions */}
                        <div className="flex flex-col gap-3 xl:min-w-[310px]">
                            {canEdit && (
                                <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-white/10 dark:bg-black/20">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Update invoice status
                                    </p>

                                    <UpdateInvoiceStatus
                                        invoiceId={invoiceData.id}
                                        currentStatus={invoiceData.status}
                                    />
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                <DownloadInvoicePdf
                                    invoiceId={invoiceData.id}
                                    invoiceNumber={invoiceData.invoice_number}
                                />

                                {canEdit ? (
                                    <Link
                                        href={`/protected/invoices/${invoiceData.id}/edit`}
                                        className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#142b4a]/20 bg-[#142b4a] px-6 py-3 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#1d3b63] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a45d] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-[#c5a45d]/30 dark:focus-visible:ring-offset-slate-900"
                                    >
                                        <span aria-hidden="true">✎</span>
                                        Edit Invoice
                                    </Link>
                                ) : (
                                    <span className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        View only
                                    </span>
                                )}
                            </div>

                            {canDelete && (
                                <div className="flex justify-end">
                                    <DeleteInvoiceButton
                                        invoiceId={invoiceData.id}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative mt-7 border-t border-slate-200 pt-4 dark:border-white/10">
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>
                                Issue date:{" "}
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                    {invoiceData.issue_date}
                                </span>
                            </span>

                            <span>
                                Due date:{" "}
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                    {invoiceData.due_date || "—"}
                                </span>
                            </span>

                            <span>
                                Currency:{" "}
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                    {invoiceData.currency}
                                </span>
                            </span>
                        </div>
                    </div>
                </section>

                {canAdministerAssignments && (
                    <InvoiceAssignmentManager
                        invoiceId={invoiceData.id}
                        employees={employees}
                        initialAssignedEmployeeIds={assignedEmployeeIds}
                    />
                )}
                
                {/* Financial overview */}
                <section>
                    <div className="mb-3">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            Financial Overview
                        </h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            A quick summary of this invoice.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <FinancialCard
                            label="Subtotal"
                            value={money(invoiceData.subtotal)}
                            description="Before discounts and tax"
                        />

                        <FinancialCard
                            label="Discount"
                            value={`−${money(invoiceData.discount_total)}`}
                            description="Total discount applied"
                        />

                        <FinancialCard
                            label="Tax"
                            value={money(invoiceData.tax_total)}
                            description="Total tax"
                        />

                        <FinancialCard
                            label="Grand Total"
                            value={money(invoiceData.grand_total)}
                            description="Final invoice amount"
                            highlight
                        />
                    </div>
                </section>

                {/* Company and customer information */}
                <section className="grid gap-5 lg:grid-cols-2">

                    {/* Company information */}
                    <div className={cardClass}>
                        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#9b7936] dark:text-[#d8b96f]">
                                From
                            </p>

                            <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                                Company Information
                            </h2>
                        </div>

                        <div className="flex gap-4 p-5">
                            {companyLogoUrl && (
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950">
                                    <img
                                        src={companyLogoUrl}
                                        alt="Company logo"
                                        className="max-h-full max-w-full object-contain"
                                    />
                                </div>
                            )}

                            <div className="min-w-0">
                                <h3 className="font-bold text-slate-900 dark:text-white">
                                    {company?.name ?? "Company"}
                                </h3>

                                {company?.billing_address && (
                                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-400">
                                        {company.billing_address}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-3 border-t border-slate-200 p-5 sm:grid-cols-2 dark:border-slate-800">
                            {company?.phone && (
                                <InfoItem
                                    label="Phone"
                                    value={company.phone}
                                />
                            )}

                            {company?.email && (
                                <InfoItem
                                    label="Email"
                                    value={company.email}
                                />
                            )}

                            {company?.website && (
                                <InfoItem
                                    label="Website"
                                    value={company.website}
                                />
                            )}

                            {company?.tax_id && (
                                <InfoItem
                                    label="Tax ID"
                                    value={company.tax_id}
                                />
                            )}
                        </div>
                    </div>

                    {/* Customer information */}
                    <div className={cardClass}>
                        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#9b7936] dark:text-[#d8b96f]">
                                Bill to
                            </p>

                            <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                                Customer Information
                            </h2>
                        </div>

                        <div className="p-5">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {customerData.name}
                            </h3>

                            <div className="mt-4 space-y-3">
                                {customerData.billing_address && (
                                    <InfoItem
                                        label="Billing address"
                                        value={customerData.billing_address}
                                    />
                                )}

                                {customerData.phone && (
                                    <InfoItem
                                        label="Phone"
                                        value={customerData.phone}
                                    />
                                )}

                                {customerData.email && (
                                    <InfoItem
                                        label="Email"
                                        value={customerData.email}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Invoice information */}
                <section className={sectionClass}>
                    <div className="mb-5">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            Invoice Information
                        </h2>

                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Important dates and invoice reference details.
                        </p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <InfoItem
                            label="Invoice number"
                            value={invoiceData.invoice_number}
                        />

                        <InfoItem
                            label="Issue date"
                            value={invoiceData.issue_date}
                        />

                        <InfoItem
                            label="Due date"
                            value={invoiceData.due_date || "—"}
                        />

                        <InfoItem
                            label="Created at"
                            value={new Date(
                                invoiceData.created_at
                            ).toLocaleDateString()}
                        />
                    </div>
                </section>

                {/* Payment summary */}
                <section className={sectionClass}>
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            Payment Summary
                        </h2>

                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Breakdown of this invoice's financial information.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <MoneyRow
                            label="Subtotal"
                            value={money(invoiceData.subtotal)}
                        />

                        <MoneyRow
                            label="Discount"
                            value={`−${money(invoiceData.discount_total)}`}
                        />

                        <MoneyRow
                            label="Tax"
                            value={money(invoiceData.tax_total)}
                        />

                        <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="text-base font-semibold text-slate-900 dark:text-white">
                                    Grand Total
                                </span>

                                <span className="text-2xl font-bold text-[#9b7936] sm:text-3xl dark:text-[#d8b96f]">
                                    {money(invoiceData.grand_total)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {invoiceData.notes && (
                        <div className="mt-7 border-t border-slate-200 pt-6 dark:border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                Additional Notes
                            </h3>

                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400">
                                {invoiceData.notes}
                            </p>
                        </div>
                    )}
                </section>

                {/* Payment and authorization assets */}
                {(companyKhqrUrl ||
                    companySignatureUrl ||
                    companyStampUrl) && (
                        <section className={sectionClass}>
                            <div className="mb-5">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Payment & Authorization
                                </h2>

                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                    Company payment and authorization documents.
                                </p>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {companyKhqrUrl && (
                                    <AssetCard
                                        title="KHQR Code"
                                        src={companyKhqrUrl}
                                    />
                                )}

                                {companySignatureUrl && (
                                    <AssetCard
                                        title="Authorized Signature"
                                        src={companySignatureUrl}
                                    />
                                )}

                                {companyStampUrl && (
                                    <AssetCard
                                        title="Company Stamp"
                                        src={companyStampUrl}
                                    />
                                )}
                            </div>
                        </section>
                    )}

                {/* A4 invoice print preview */}
                <section className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#9b7936] dark:text-[#d8b96f]">
                                Document
                            </p>

                            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                                Invoice Print Preview
                            </h2>

                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                Preview your invoice using the saved print design settings.
                            </p>
                        </div>

                        <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                            {printSettings.page_size} · {printSettings.orientation}
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-lg">
                        <InvoicePrintView
                            invoice={{
                                ...invoiceData,
                                notes: invoiceData.notes ?? "",
                            }}
                            company={{
                                name: company?.name ?? "",
                                billing_address: company?.billing_address ?? "",
                                phone: company?.phone ?? "",
                                email: company?.email ?? "",
                                website: company?.website ?? "",
                                tax_id: company?.tax_id ?? "",
                                logo_url: companyLogoUrl ?? "",
                                khqr_url: companyKhqrUrl ?? "",
                                signature_url: companySignatureUrl ?? "",
                                stamp_url: companyStampUrl ?? "",
                            }}
                            customer={{
                                name: customerData.name,
                                phone: customerData.phone,
                                email: customerData.email,
                                billing_address: customerData.billing_address,
                            }}
                            items={items}
                            printSettings={printSettings}
                        />
                    </div>
                </section>

                {/* Footer */}
                <div className="border-t border-slate-200 py-5 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-500">
                    Y&Z Home Store Cambodia · Invoice{" "}
                    {invoiceData.invoice_number}
                </div>
            </div>
        </main>
    );
}

// Financial summary card.
function FinancialCard({
    label,
    value,
    description,
    highlight = false,
}: {
    label: string;
    value: string;
    description: string;
    highlight?: boolean;
}) {
    return (
        <div
            className={`rounded-2xl border p-5 shadow-sm transition-colors duration-200 ${highlight
                    ? "border-[#c5a45d]/50 bg-gradient-to-br from-[#f8f4e9] to-white dark:from-[#142b4a] dark:to-slate-900 dark:shadow-lg"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 dark:shadow-lg"
                }`}
        >
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {label}
            </p>

            <p
                className={`mt-3 break-words text-2xl font-bold ${highlight
                        ? "text-[#142b4a] dark:text-[#d8b96f]"
                        : "text-slate-900 dark:text-white"
                    }`}
            >
                {value}
            </p>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                {description}
            </p>
        </div>
    );
}

// Information display component.
function InfoItem({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
                {label}
            </p>

            <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-800 dark:text-slate-200">
                {value}
            </p>
        </div>
    );
}

// Financial breakdown row.
function MoneyRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-600 dark:text-slate-400">
                {label}
            </span>

            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {value}
            </span>
        </div>
    );
}

// Company asset display component.
function AssetCard({
    title,
    src,
}: {
    title: string;
    src: string;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {title}
            </h3>

            <div className="flex min-h-40 items-center justify-center rounded-lg bg-white p-3">
                <img
                    src={src}
                    alt={title}
                    className="max-h-48 max-w-full object-contain"
                />
            </div>
        </div>
    );
}
