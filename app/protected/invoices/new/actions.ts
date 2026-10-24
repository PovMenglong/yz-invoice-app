
"use server";

import { createClient } from "@/lib/supabase/server";

export async function createInvoice(formData: FormData) {
  const supabase = await createClient();

  // Verify the current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, message: "Please sign in before creating an invoice." };
  }

  const invoiceNumber = String(formData.get("invoiceNumber") ?? "").trim();
  const customerName = String(formData.get("customerName") ?? "").trim();
  const amount = Number(formData.get("amount"));

  if (!invoiceNumber || !customerName || !Number.isFinite(amount) || amount <= 0) {
    return { success: false, message: "Please enter valid invoice details." };
  }

  // Reuse an existing customer with this exact name, or create one
  let { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("name", customerName)
    .limit(1)
    .maybeSingle();

  if (customerError) {
    return { success: false, message: `Could not find customer: ${customerError.message}` };
  }

  if (!customer) {
    const result = await supabase
      .from("customers")
      .insert({ name: customerName })
      .select("id")
      .single();

    customer = result.data;
    customerError = result.error;

    if (customerError || !customer) {
      return {
        success: false,
        message: `Could not create customer: ${customerError?.message ?? "Unknown error"}`,
      };
    }
  }

  // Save the invoice
  const { error: invoiceError } = await supabase.from("invoices").insert({
    invoice_number: invoiceNumber,
    customer_id: customer.id,
    status: "draft",
    issue_date: new Date().toISOString().slice(0, 10),
    currency: "USD",
    subtotal: amount,
    discount_total: 0,
    tax_total: 0,
    grand_total: amount,
    created_by: user.id,
  });

  if (invoiceError) {
    return { success: false, message: `Could not save invoice: ${invoiceError.message}` };
  }

  return { success: true, message: "Invoice created successfully!" };
}
