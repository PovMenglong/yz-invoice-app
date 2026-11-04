import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InvoiceForm from "./invoice-form";

export const instant = false;

export type InvoiceProduct = {
    id: string;
    name: string;
    sku: string | null;
    description: string | null;
    unit: string;
    selling_price: number;
};

export type InvoiceCustomer = {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    billing_address: string | null;
};

export default async function NewInvoicePage() {
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
            <main className="mx-auto max-w-3xl px-4 py-12">
                <h1 className="text-2xl font-bold text-gray-900">
                    Company access required
                </h1>

                <p className="mt-2 text-gray-600">
                    Your account must be an active company member to create invoices.
                </p>

                <Link
                    href="/protected/invoices"
                    className="mt-5 inline-block text-blue-600 hover:underline"
                >
                    Back to invoices
                </Link>
            </main>
        );
    }

    const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, sku, description, unit, selling_price")
        .eq("is_active", true)
        .order("name", { ascending: true });

    if (productsError) {
        console.error("Failed to load products:", productsError.message);
    }

    const activeProducts: InvoiceProduct[] = (products ?? []).map(
        (product) => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            description: product.description,
            unit: product.unit,
            selling_price: Number(product.selling_price),
        })
    );

    const { data: customers, error: customersError } = await supabase
        .from("customers")
        .select("id, name, phone, email, billing_address")
        .order("name", { ascending: true });

    if (customersError) {
        console.error("Failed to load customers:", customersError.message);
    }

    const savedCustomers: InvoiceCustomer[] = (customers ?? []).map(
        (customer) => ({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            billing_address: customer.billing_address,
        })
    );

    return (
        <InvoiceForm
            products={activeProducts}
            customers={savedCustomers}
        />
    );
}