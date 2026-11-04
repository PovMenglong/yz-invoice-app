
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CompanySettingsForm from "./company-settings-form";

export const instant = false;

export default async function CompanySettingsPage() {
    await connection();

    const supabase = await createClient();

    // Verify the signed-in user.
    const {
        data: claimsData,
        error: claimsError,
    } = await supabase.auth.getClaims();

    const userId = claimsData?.claims?.sub;

    if (claimsError || typeof userId !== "string") {
        redirect("/auth/login");
    }

    // Verify active company membership and admin role.
    const { data: membership, error: membershipError } = await supabase
        .from("company_members")
        .select("role, is_active")
        .eq("user_id", userId)
        .maybeSingle();

    if (membershipError) {
        console.error("Company membership lookup failed:", membershipError.message);
        return (
            <main className="mx-auto max-w-3xl p-6">
                <h1 className="text-xl font-bold">Unable to verify access</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Please check your company membership permissions and try again.
                </p>
            </main>
        );
    }

    if (!membership || !membership.is_active) {
        return (
            <main className="mx-auto max-w-3xl p-6">
                <h1 className="text-xl font-bold">Company access required</h1>
                <p className="mt-2 text-muted-foreground">
                    Your account must be an active company member to access this page.
                </p>
            </main>
        );
    }

    if (membership.role !== "admin") {
        return (
            <main className="mx-auto max-w-3xl p-6">
                <h1 className="text-xl font-bold">Administrator access required</h1>
                <p className="mt-2 text-muted-foreground">
                    Only company administrators can change company settings.
                </p>
            </main>
        );
    }

    // Load the single company record.
    const { data: company, error: companyError } = await supabase
        .from("companies")
        .select(
            "id, name, billing_address, phone, email, website, tax_id, logo_path, khqr_path, authorized_signature_path, company_stamp_path"
        )
        .eq("singleton", true)
        .maybeSingle();

    if (companyError) {
        console.error("Company settings query failed:", companyError.message);
        return (
            <main className="mx-auto max-w-3xl p-6">
                <h1 className="text-xl font-bold">Unable to load company settings</h1>
                <p className="mt-2 text-muted-foreground">
                    Check the companies table SELECT policy and database permissions.
                </p>
            </main>
        );
    }

    if (!company) {
        return (
            <main className="mx-auto max-w-3xl p-6">
                <h1 className="text-xl font-bold">Company record not found</h1>
                <p className="mt-2 text-muted-foreground">
                    Please ensure the single company record exists in the companies table.
                </p>
            </main>
        );
    }

    return <CompanySettingsForm company={company} />;
}

type CompanySettingsFormProps = {
    company: {
        id: string;
        name: string;
        billing_address: string | null;
        phone: string | null;
        email: string | null;
        website: string | null;
        tax_id: string | null;
        logo_path: string | null;
        khqr_path: string | null;
        authorized_signature_path: string | null;
        company_stamp_path: string | null;
    };
};