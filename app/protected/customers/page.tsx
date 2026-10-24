
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CustomerSearch from "./customer-search";

export const instant = false;

export default async function CustomersPage() {
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
        return (
            <main className="mx-auto max-w-6xl px-6 py-10">
                <h1 className="text-2xl font-bold text-gray-900">
                    Access denied
                </h1>
                <p className="mt-2 text-gray-600">
                    You need an active company membership to view customers.
                </p>
            </main>
        );
    }

    const { data: customers, error } = await supabase
        .from("customers")
        .select("id, name, phone, email, billing_address")
        .order("name", { ascending: true });

    if (error) {
        return (
            <main className="mx-auto max-w-6xl px-6 py-10">
                <h1 className="text-3xl font-bold text-gray-900">
                    Customers
                </h1>
                <p className="mt-4 text-red-600">
                    Could not load customers. Please check your database permissions.
                </p>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-6xl px-6 py-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Customers
                    </h1>
                    <p className="mt-2 text-gray-500">
                        Manage your customer contact and billing information.
                    </p>
                </div>

                <Link
                    href="/protected/customers/new"
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
                >
                    + Add Customer
                </Link>
            </div>

            <CustomerSearch customers={customers ?? []} />

            <div className="mt-6">
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
