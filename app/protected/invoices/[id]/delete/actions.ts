"use server";

import { createClient } from "@/lib/supabase/server";

export async function deleteInvoice(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Please sign in before deleting an invoice.",
    };
  }

  const invoiceId = String(formData.get("invoiceId") ?? "").trim();

  if (!invoiceId) {
    return {
      success: false,
      message: "Invoice ID is missing.",
    };
  }

  // Check active company membership and role.
  const { data: membership, error: membershipError } = await supabase
    .from("company_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return {
      success: false,
      message: "You don't have permission to delete invoices. Please contact your administrator.",
    };
  }

  if (membership.role !== "admin") {
    return {
      success: false,
      message: "Deletion Not Allowed: Only an administrator can delete invoices.",
    };
  }

  // Check that the invoice exists and is visible to this user.
  const { data: invoice, error: lookupError } = await supabase
    .from("invoices")
    .select("id")
    .eq("id", invoiceId)
    .maybeSingle();

  if (lookupError || !invoice) {
    return {
      success: false,
      message: "Invoice not found or you do not have permission to delete it.",
    };
  }

  // The database RLS policy must also authorize this deletion.
  const { error: deleteError } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId);

  if (deleteError) {
    return {
      success: false,
      message: "Could not delete the invoice. Please try again or contact your administrator.",
    };
  }

  return {
    success: true,
    message: "Invoice deleted successfully.",
  };
}