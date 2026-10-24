
"use server";

import { createClient } from "@/lib/supabase/server";

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Please sign in before adding a customer.",
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
      message: "You do not have permission to add customers.",
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const billingAddress = String(
    formData.get("billingAddress") ?? "",
  ).trim();

  if (!name) {
    return {
      success: false,
      message: "Customer name is required.",
    };
  }

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return {
      success: false,
      message: "Please enter a valid email address.",
    };
  }

  const { error } = await supabase.from("customers").insert({
    name,
    email: email || null,
    phone: phone || null,
    billing_address: billingAddress || null,
  });

  if (error) {
    return {
      success: false,
      message: `Could not add customer: ${error.message}`,
    };
  }

  return {
    success: true,
    message: "Customer added successfully!",
  };
}
