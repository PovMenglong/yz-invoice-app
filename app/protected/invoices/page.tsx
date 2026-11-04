
import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import InvoiceList from "./invoice-list";

export const instant = false;

type InvoiceRow = {
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
};

export default async function InvoicesPage() {
    await connection();

    const supabase = await createClient();

    // Verify the signed-in user.
    const { data: claimsData, error: claimsError } =
        await supabase.auth.getClaims();

    const userId = claimsData?.claims?.sub;

    if (claimsError || typeof userId !== "string") {
        return (
            <main className="mx-auto max-w-7xl p-6 sm:p-8">
                <h1 className="text-2xl font-bold">Sign in required</h1>
                <p className="mt-2 text-gray-600">
                    Please sign in to view invoices.
                </p>
                <Link
                    href="/auth/login"
                    className="mt-4 inline-block text-blue-600 hover:underline"
                >
                    Go to login
                </Link>
            </main>
        );
    }

    // Verify active company membership.
    const { data: membership, error: membershipError } =
        await supabase
            .from("company_members")
            .select("role, is_active")
            .eq("user_id", userId)
            .maybeSingle();

    if (membershipError) {
        console.error(
            "Membership lookup failed:",
            membershipError.message
        );

        return (
            <main className="mx-auto max-w-7xl p-6 sm:p-8">
                <h1 className="text-xl font-bold">
                    Unable to verify company access
                </h1>
                <p className="mt-2 text-gray-600">
                    Please check your company membership permissions.
                </p>
            </main>
        );
    }

    if (!membership || !membership.is_active) {
        return (
            <main className="mx-auto max-w-7xl p-6 sm:p-8">
                <h1 className="text-xl font-bold">Access required</h1>
                <p className="mt-2 text-gray-600">
                    Your account must be an active company member to view invoices.
                </p>
            </main>
        );
    }

    // Load invoices using the existing database fields.
    const { data: rows, error: invoiceError } =
        await supabase
            .from("invoices")
            .select(
                "id, invoice_number, customer_id, status, issue_date, due_date, currency, subtotal, discount_total, tax_total, grand_total, created_at"
            )
            .order("created_at", { ascending: false });

    if (invoiceError) {
        console.error("Invoice query failed:", invoiceError.message);

        return (
            <main className="mx-auto max-w-7xl p-6 sm:p-8">
                <h1 className="text-xl font-bold">Unable to load invoices</h1>
                <p className="mt-2 text-gray-600">
                    Please check the invoice SELECT policy and database permissions.
                </p>
            </main>
        );
    }

    const invoices = (rows ?? []) as InvoiceRow[];

    // Load customer names in one query rather than one query per invoice.
    const customerIds = [
        ...new Set(
            invoices
                .map((invoice) => invoice.customer_id)
                .filter((id): id is string => id !== null)
        ),
    ];

    let customerNames = new Map<string, string>();

    if (customerIds.length > 0) {
        const { data: customers, error: customerError } =
            await supabase
                .from("customers")
                .select("id, name")
                .in("id", customerIds);

        if (customerError) {
            console.error(
                "Customer lookup failed:",
                customerError.message
            );

            return (
                <main className="mx-auto max-w-7xl p-6 sm:p-8">
                    <h1 className="text-xl font-bold">
                        Unable to load customer names
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Please check the customer SELECT policy and permissions.
                    </p>
                </main>
            );
        }

        customerNames = new Map(
            (customers ?? []).map((customer) => [
                customer.id,
                customer.name,
            ])
        );
    }

    const invoiceList = invoices.map((invoice) => ({
        ...invoice,
        customer_name: invoice.customer_id
            ? customerNames.get(invoice.customer_id) ?? "Unknown customer"
            : "No customer",
    }));

    return (
        <main className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#c5a45d]">
                        Invoice Management
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                        Search, track, and manage your company invoices.
                    </p>
                </div>

                <Link
                    href="/protected/invoices/new"
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                    + Create Invoice
                </Link>
            </div>

            <InvoiceList invoices={invoiceList} />

            <div className="mt-8">
                <Link
                    href="/protected"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                    ← Back to Dashboard
                </Link>
            </div>
        </main>
    );
}
