
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InviteEmployeeForm from "./invite-employee-form";

export const instant = false;

export default async function TeamSettingsPage() {
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

    // Verify active company membership and Admin role.
    const { data: membership, error: membershipError } = await supabase
        .from("company_members")
        .select("role, is_active")
        .eq("user_id", userId)
        .maybeSingle();

    if (membershipError) {
        console.error("Team membership lookup failed:", membershipError.message);

        return (
            <main className="mx-auto max-w-4xl p-6">
                <h1 className="text-xl font-bold">Unable to verify access</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Please check your company membership permissions and try again.
                </p>
            </main>
        );
    }

    if (!membership || !membership.is_active) {
        return (
            <main className="mx-auto max-w-4xl p-6">
                <h1 className="text-xl font-bold">Company access required</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Your account must be an active company member to access this page.
                </p>
            </main>
        );
    }

    if (membership.role !== "admin") {
        return (
            <main className="mx-auto max-w-4xl p-6">
                <h1 className="text-xl font-bold">Administrator access required</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Only company administrators can manage employees and permissions.
                </p>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-4xl space-y-6 p-6">
            <div>
                <p className="text-sm font-medium text-[#c5a45d]">
                    COMPANY SETTINGS
                </p>

                <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                    Team &amp; Permissions
                </h1>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Invite employees to Y&amp;Z Home Store Cambodia and manage
                    their access to company invoices.
                </p>
            </div>

            <InviteEmployeeForm />

            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Employee roles
                </h2>

                <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                        <p className="font-semibold text-slate-900 dark:text-white">
                            Administrator
                        </p>
                        <p className="mt-1">
                            Can manage company settings, employees, and invoice assignments.
                            Can edit all company invoices.
                        </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                        <p className="font-semibold text-slate-900 dark:text-white">
                            Employee
                        </p>
                        <p className="mt-1">
                            Can view company invoices. Can edit invoices assigned to them
                            and invoices they created, subject to active membership.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
