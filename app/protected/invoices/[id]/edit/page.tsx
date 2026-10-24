
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditInvoiceForm from "./edit-invoice-form";

export const instant = false;

type EditPageProps = {
    params: Promise<{ id: string }>;
};

export default async function EditInvoicePage({ params }: EditPageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/sign-in");
    }

    const { data: membership, error: membershipError } = await supabase
        .from("company_members")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

    if (membershipError || !membership) {
        notFound();
    }

    const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select(
            "id, invoice_number, customer_id, status, issue_date, due_date, subtotal, discount_total, tax_total, notes",
        )
        .eq("id", id)
        .maybeSingle();

    if (invoiceError || !invoice) {
        notFound();
    }

    let customerName = "";

    if (invoice.customer_id) {
        const { data: customer, error: customerError } = await supabase
            .from("customers")
            .select("name")
            .eq("id", invoice.customer_id)
            .maybeSingle();

        if (customerError) {
            notFound();
        }

        customerName = customer?.name ?? "";
    }

    return (
        <main className="mx-auto max-w-4xl px-6 py-10">
            <Link
                href={`/protected/invoices/${invoice.id}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
                ← Back to Invoice
            </Link>

            <div className="mt-6">
                <h1 className="text-3xl font-bold text-gray-900">
                    Edit Invoice
                </h1>
                <p className="mt-2 text-gray-500">
                    Update the invoice information below.
                </p>
            </div>

            <EditInvoiceForm
                invoice={{
                    id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    status: invoice.status,
                    issue_date: invoice.issue_date,
                    due_date: invoice.due_date,
                    subtotal: Number(invoice.subtotal),
                    discount_total: Number(invoice.discount_total),
                    tax_total: Number(invoice.tax_total),
                    notes: invoice.notes,
                }}
                customerName={customerName}
            />
        </main>
    );
}
