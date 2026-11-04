"use server";

import { createClient } from "@/lib/supabase/server";

const allowedStatuses = ["draft", "issued", "paid", "void"] as const;

type InvoiceStatus = (typeof allowedStatuses)[number];

export async function updateInvoiceStatus(
    invoiceId: string,
    status: InvoiceStatus
) {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            success: false,
            message: "Please sign in before updating an invoice.",
        };
    }

    if (!allowedStatuses.includes(status)) {
        return {
            success: false,
            message: "Invalid invoice status.",
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
            message: "You do not have permission to update invoices.",
        };
    }

    const { data: canEdit, error: permissionError } = await supabase.rpc(
        "can_edit_invoice",
        { target_invoice_id: invoiceId }
    );

    if (permissionError || !canEdit) {
        return {
            success: false,
            message: "You do not have permission to edit this invoice.",
        };
    }

    const { data: updatedInvoice, error: updateError } = await supabase
        .from("invoices")
        .update({
            status,
            updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId)
        .select("id")
        .maybeSingle();

    if (updateError || !updatedInvoice) {
        return {
            success: false,
            message: "Could not update the invoice status.",
        };
    }

    return {
        success: true,
        message: "Invoice status updated successfully!",
    };
}