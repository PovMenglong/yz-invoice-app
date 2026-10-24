
"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateCustomer(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Please sign in before editing a customer.",
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("company_members")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return {
      success: false,
      message: "You do not have permission to edit customers.",
    };
  }

  const customerId = String(formData.get("customerId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const billingAddress = String(
    formData.get("billingAddress") ?? "",
  ).trim();

  if (!customerId || !name) {
    return {
      success: false,
      message: "Customer ID and name are required.",
    };
  }

  if (name.length > 200 || email.length > 254 || phone.length > 50 || billingAddress.length > 1000) {
    return {
      success: false,
      message: "One or more fields are too long.",
    };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      success: false,
      message: "Please enter a valid email address.",
    };
  }

  const { data: existingCustomer, error: lookupError } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .maybeSingle();

  if (lookupError || !existingCustomer) {
    return {
      success: false,
      message: "Customer not found or you do not have permission to edit them.",
    };
  }

  const { error: updateError } = await supabase
    .from("customers")
    .update({
      name,
      email: email || null,
      phone: phone || null,
      billing_address: billingAddress || null,
    })
    .eq("id", customerId);

  if (updateError) {
    return {
      success: false,
      message: `Could not update customer: ${updateError.message}`,
    };
  }

  return {
    success: true,
    message: "Customer updated successfully!",
  };
}
