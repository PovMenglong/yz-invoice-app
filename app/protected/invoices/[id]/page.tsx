
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export default async function InvoiceDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
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

    if (membershipError) {
        throw new Error("Unable to verify company access.");
    }

    if (!membership || !membership.is_active) {
        return (
            <main className="p-8">
                <h1 className="text-xl font-bold">Company access required</h1>
                <p className="mt-2 text-gray-600">
                    Your account must be an active company member to view invoices.
                </p>
            </main>
        );
    }

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
    let customerName = "No customer";

    if (invoiceData.customer_id) {
        const { data: customer, error: customerError } = await supabase
            .from("customers")
            .select("name")
            .eq("id", invoiceData.customer_id)
            .maybeSingle();

        if (customerError) {
            throw new Error("Unable to load customer details.");
        }

        customerName = customer?.name ?? "Unknown customer";
    }

    const money = (value: number) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: invoiceData.currency || "USD",
        }).format(Number(value) || 0);

    return (
        <main className="mx-auto max-w-4xl p-5 sm:p-8">
            <Link
                href="/protected"
                className="text-blue-600 hover:underline"
            >
                ← Back to dashboard
            </Link>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold">
                        Invoice {invoiceData.invoice_number}
                    </h1>
                    <p className="mt-2 text-gray-500">Invoice details</p>
                </div>

                <span className="w-fit rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold capitalize text-gray-700">
                    {invoiceData.status}
                </span>
            </div>

            <section className="mt-8 rounded-xl border bg-white p-6 text-gray-900 shadow-sm">
                <h2 className="text-lg font-semibold">Customer</h2>
                <p className="mt-2">{customerName}</p>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div>
                        <p className="text-sm text-gray-500">Issue date</p>
                        <p className="mt-1 font-medium">{invoiceData.issue_date}</p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">Due date</p>
                        <p className="mt-1 font-medium">
                            {invoiceData.due_date || "—"}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">Invoice ID</p>
                        <p className="mt-1 break-all text-sm">{invoiceData.id}</p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">Created at</p>
                        <p className="mt-1">
                            {new Date(invoiceData.created_at).toLocaleString()}
                        </p>
                    </div>
                </div>

                <hr className="my-6" />

                <h2 className="text-lg font-semibold">Payment summary</h2>

                <div className="mt-4 space-y-3">
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-600">Subtotal</span>
                        <span>{money(invoiceData.subtotal)}</span>
                    </div>

                    <div className="flex justify-between gap-4">
                        <span className="text-gray-600">Discount</span>
                        <span>−{money(invoiceData.discount_total)}</span>
                    </div>

                    <div className="flex justify-between gap-4">
                        <span className="text-gray-600">Tax</span>
                        <span>{money(invoiceData.tax_total)}</span>
                    </div>

                    <hr />

                    <div className="flex justify-between gap-4 text-lg font-bold">
                        <span>Total</span>
                        <span>{money(invoiceData.grand_total)}</span>
                    </div>
                </div>

                {invoiceData.notes && (
                    <div className="mt-6 border-t pt-5">
                        <h2 className="font-semibold">Notes</h2>
                        <p className="mt-2 whitespace-pre-wrap text-gray-600">
                            {invoiceData.notes}
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}
