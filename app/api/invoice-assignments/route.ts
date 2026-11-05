import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorizeAdmin() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            response: NextResponse.json(
                { error: "You must sign in first." },
                { status: 401 },
            ),
        } as const;
    }

    const { data: membership, error: membershipError } = await supabase
        .from("company_members")
        .select("role, is_active")
        .eq("user_id", user.id)
        .maybeSingle();

    if (membershipError) {
        console.error("Membership check failed:", membershipError.message);

        return {
            response: NextResponse.json(
                { error: "Unable to verify company permissions." },
                { status: 500 },
            ),
        } as const;
    }

    if (!membership || !membership.is_active) {
        return {
            response: NextResponse.json(
                { error: "You must be an active company member." },
                { status: 403 },
            ),
        } as const;
    }

    if (membership.role !== "admin") {
        return {
            response: NextResponse.json(
                { error: "Only administrators can manage invoice assignments." },
                { status: 403 },
            ),
        } as const;
    }

    return { supabase, userId: user.id } as const;
}

async function readAssignmentBody(request: NextRequest) {
    const body: unknown = await request.json().catch(() => null);

    if (typeof body !== "object" || body === null) {
        return null;
    }

    const record = body as Record<string, unknown>;
    const invoiceId =
        typeof record.invoiceId === "string" ? record.invoiceId : "";
    const userId =
        typeof record.userId === "string" ? record.userId : "";

    if (
        !UUID_REGEX.test(invoiceId) ||
        !UUID_REGEX.test(userId)
    ) {
        return null;
    }

    return { invoiceId, userId };
}

export async function POST(request: NextRequest) {
    try {
        const auth = await authorizeAdmin();

        if ("response" in auth) {
            return auth.response;
        }

        const assignment = await readAssignmentBody(request);

        if (!assignment) {
            return NextResponse.json(
                { error: "Valid invoice and employee IDs are required." },
                { status: 400 },
            );
        }

        // Only active employees can be assigned.
        const { data: employee, error: employeeError } = await auth.supabase
            .from("company_members")
            .select("role, is_active")
            .eq("user_id", assignment.userId)
            .maybeSingle();

        if (employeeError) {
            console.error("Employee lookup failed:", employeeError.message);

            return NextResponse.json(
                { error: "Unable to verify the selected employee." },
                { status: 500 },
            );
        }

        if (
            !employee ||
            !employee.is_active ||
            employee.role !== "employee"
        ) {
            return NextResponse.json(
                { error: "Select an active company employee." },
                { status: 400 },
            );
        }

        const { error: insertError } = await auth.supabase
            .from("invoice_assignments")
            .insert({
                invoice_id: assignment.invoiceId,
                user_id: assignment.userId,
                assigned_by: auth.userId,
            });

        if (insertError) {
            if (insertError.code === "23505") {
                return NextResponse.json(
                    { error: "This employee is already assigned to this invoice." },
                    { status: 409 },
                );
            }

            console.error("Invoice assignment failed:", insertError.message);

            return NextResponse.json(
                { error: "Unable to assign this employee to the invoice." },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            message: "Employee assigned successfully.",
        });
    } catch (error) {
        console.error("Unexpected assignment error:", error);

        return NextResponse.json(
            { error: "An unexpected error occurred." },
            { status: 500 },
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const auth = await authorizeAdmin();

        if ("response" in auth) {
            return auth.response;
        }

        const assignment = await readAssignmentBody(request);

        if (!assignment) {
            return NextResponse.json(
                { error: "Valid invoice and employee IDs are required." },
                { status: 400 },
            );
        }

        const { data: deleted, error: deleteError } = await auth.supabase
            .from("invoice_assignments")
            .delete()
            .eq("invoice_id", assignment.invoiceId)
            .eq("user_id", assignment.userId)
            .select("invoice_id")
            .maybeSingle();

        if (deleteError) {
            console.error("Assignment removal failed:", deleteError.message);

            return NextResponse.json(
                { error: "Unable to remove this invoice assignment." },
                { status: 500 },
            );
        }

        if (!deleted) {
            return NextResponse.json(
                { error: "This employee is not assigned to the invoice." },
                { status: 404 },
            );
        }

        return NextResponse.json({
            success: true,
            message: "Employee assignment removed successfully.",
        });
    } catch (error) {
        console.error("Unexpected assignment removal error:", error);

        return NextResponse.json(
            { error: "An unexpected error occurred." },
            { status: 500 },
        );
    }
}
