
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteCustomer(customerId: string) {
  const supabase = await createClient();

  // Verify the signed-in user.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Please sign in again." };
  }

  // Verify active company membership.
  const { data: membership, error: membershipError } = await supabase
    .from("company_members")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return {
      success: false,
      error: "You are not authorized to delete customers.",
    };
  }

  // Check whether this customer is used by an invoice.
  const { data: linkedInvoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id")
    .eq("customer_id", customerId)
    .limit(1)
    .maybeSingle();

  if (invoiceError) {
    return {
      success: false,
      error: "Could not check the customer's invoices.",
    };
  }

  if (linkedInvoice) {
    return {
      success: false,
      error:
        "This customer is linked to an invoice. You cannot delete this customer until the invoice is no longer linked to them.",
    };
  }

  // Delete the customer.
  const { data: deletedCustomer, error: deleteError } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    return {
      success: false,
      error: "Could not delete the customer. Please try again.",
    };
  }

  if (!deletedCustomer) {
    return {
      success: false,
      error: "Customer not found or you do not have permission to delete them.",
    };
  }

  revalidatePath("/protected/customers");
  revalidatePath("/protected");

  return { success: true };
}
