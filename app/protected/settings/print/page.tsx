
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintSettingsForm from "./print-settings-form";

export const instant = false;

export default async function PrintSettingsPage() {
    await connection();

    const supabase = await createClient();

    const { data, error } = await supabase.auth.getClaims();

    if (error || !data?.claims) {
        redirect("/auth/login");
    }

    const claims = data.claims;

    const userId = claims.sub;

    const { data: membership } = await supabase
        .from("company_members")
        .select("role, is_active")
        .eq("user_id", userId)
        .maybeSingle();

    if (!membership?.is_active || membership.role !== "admin") {
        redirect("/protected/settings");
    }

    const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("singleton", true)
        .maybeSingle();

    if (!company) {
        return <main className="p-8">Company profile not found.</main>;
    }

    const { data: settings } = await supabase
        .from("print_settings")
        .select("*")
        .eq("company_id", company.id)
        .maybeSingle();

    return (
        <PrintSettingsForm
            companyId={company.id}
            initialSettings={settings}
        />
    );
}
