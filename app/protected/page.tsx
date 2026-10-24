
import { createClient } from "@/lib/supabase/server";
import InvoiceDashboard from "./invoice-dashboard";

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

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    return (
      <main className="p-8">
        <p>Your session could not be verified. Please log in again.</p>
        <a className="mt-3 inline-block underline" href="/auth/login">
          Go to login
        </a>
      </main>
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("company_members")
    .select("role, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    console.error("Membership lookup failed:", membershipError.message);

    return (
      <main className="p-8">
        <h1 className="text-xl font-bold">Unable to verify company access</h1>
        <p className="mt-2 text-gray-500">
          Check your company_members SELECT policy and try again.
        </p>
      </main>
    );
  }

  if (!membership || !membership.is_active) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-bold">Company access required</h1>
        <p className="mt-2 text-gray-500">
          Your account must be an active company member to access invoices.
        </p>
      </main>
    );
  }

  const { data: rows, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, customer_id, status, issue_date, due_date, currency, subtotal, discount_total, tax_total, grand_total, created_at"
    )
    .order("created_at", { ascending: false });

  if (invoiceError) {
    console.error("Invoice query failed:", invoiceError.message);

    return (
      <main className="p-8">
        <h1 className="text-xl font-bold">Unable to load invoices</h1>
        <p className="mt-2 text-gray-500">
          Check the invoices SELECT policy and database permissions.
        </p>
      </main>
    );
  }

  const invoiceRows = (rows ?? []) as InvoiceRow[];

  const customerIds = [
    ...new Set(
      invoiceRows
        .map((invoice) => invoice.customer_id)
        .filter((id): id is string => id !== null)
    ),
  ];

  let customerNames = new Map<string, string>();

  if (customerIds.length > 0) {
    const { data: customers, error: customerError } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", customerIds);

    if (customerError) {
      console.error("Customer query failed:", customerError.message);

      return (
        <main className="p-8">
          <h1 className="text-xl font-bold">Unable to load customers</h1>
          <p className="mt-2 text-gray-500">
            Check the customers SELECT policy and database permissions.
          </p>
        </main>
      );
    }

    customerNames = new Map(
      (customers ?? []).map((customer) => [customer.id, customer.name])
    );
  }

  const invoices = invoiceRows.map((invoice) => ({
    ...invoice,
    customer_name: invoice.customer_id
      ? customerNames.get(invoice.customer_id) ?? "Unknown customer"
      : "No customer",
  }));

  return <InvoiceDashboard invoices={invoices} />;
}
