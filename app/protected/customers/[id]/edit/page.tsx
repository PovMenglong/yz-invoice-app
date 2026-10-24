
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditCustomerForm from "./edit-customer-form";

export const instant = false;

type EditCustomerPageProps = {
    params: Promise<{ id: string }>;
};

export default async function EditCustomerPage({
    params,
}: EditCustomerPageProps) {
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

    const { data: customer, error } = await supabase
        .from("customers")
        .select("id, name, email, phone, billing_address")
        .eq("id", id)
        .maybeSingle();

    if (error || !customer) {
        notFound();
    }

    return (
        <main className="mx-auto max-w-3xl px-6 py-10">
            <Link
                href="/protected/customers"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
                ← Back to Customers
            </Link>

            <h1 className="mt-6 text-3xl font-bold text-gray-900">
                Edit Customer
            </h1>

            <p className="mt-2 text-gray-500">
                Update this customer's contact and billing information.
            </p>

            <EditCustomerForm
                customer={{
                    id: customer.id,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    billing_address: customer.billing_address,
                }}
            />
        </main>
    );
}
