
"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateInvoice(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Please sign in before editing an invoice.",
    };
  }

  // Confirm that the signed-in user is an active company member.
  const { data: membership, error: membershipError } = await supabase
    .from("company_members")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return {
      success: false,
      message: "You do not have permission to edit invoices.",
    };
  }

  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const invoiceNumber = String(formData.get("invoiceNumber") ?? "").trim();
  const customerName = String(formData.get("customerName") ?? "").trim();
  const issueDate = String(formData.get("issueDate") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const subtotal = Number(formData.get("subtotal"));
  const discountTotal = Number(formData.get("discountTotal") || 0);
  const taxTotal = Number(formData.get("taxTotal") || 0);

  const allowedStatuses = ["draft", "sent", "paid", "overdue", "cancelled"];

  if (
    !invoiceId ||
    !invoiceNumber ||
    !customerName ||
    !issueDate ||
    !Number.isFinite(subtotal) ||
    !Number.isFinite(discountTotal) ||
    !Number.isFinite(taxTotal) ||
    subtotal < 0 ||
    discountTotal < 0 ||
    taxTotal < 0 ||
    discountTotal > subtotal ||
    !allowedStatuses.includes(status)
  ) {
    return {
      success: false,
      message: "Please check the invoice details and enter valid values.",
    };
  }

  if (dueDate && dueDate < issueDate) {
    return {
      success: false,
      message: "The due date cannot be earlier than the issue date.",
    };
  }

  // Make sure this invoice exists before updating it.
  const { data: existingInvoice, error: invoiceLookupError } = await supabase
    .from("invoices")
    .select("id")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoiceLookupError || !existingInvoice) {
    return {
      success: false,
      message: "Invoice not found or you do not have permission to edit it.",
    };
  }

  // Find the customer by name, or create a new customer if needed.
  const { data: foundCustomer, error: customerLookupError } = await supabase
    .from("customers")
    .select("id")
    .eq("name", customerName)
    .limit(1)
    .maybeSingle();

  if (customerLookupError) {
    return {
      success: false,
      message: "Could not look up the customer.",
    };
  }

  let customerId = foundCustomer?.id;

  if (!customerId) {
    const { data: newCustomer, error: customerInsertError } = await supabase
      .from("customers")
      .insert({ name: customerName })
      .select("id")
      .single();

    if (customerInsertError || !newCustomer) {
      return {
        success: false,
        message: "Could not create the customer. Please check your database permissions.",
      };
    }

    customerId = newCustomer.id;
  }

  const grandTotal = subtotal - discountTotal + taxTotal;

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      invoice_number: invoiceNumber,
      customer_id: customerId,
      status,
      issue_date: issueDate,
      due_date: dueDate || null,
      subtotal,
      discount_total: discountTotal,
      tax_total: taxTotal,
      grand_total: grandTotal,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  if (updateError) {
    return {
      success: false,
      message: `Could not update invoice: ${updateError.message}`,
    };
  }

  return {
    success: true,
    message: "Invoice updated successfully!",
  };
}
