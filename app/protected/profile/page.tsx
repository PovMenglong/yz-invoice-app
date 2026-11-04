
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export const instant = false;

export default async function ProfilePage() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/auth/login");
    }

    const { data: membership, error: membershipError } = await supabase
        .from("company_members")
        .select("is_active")
        .eq("user_id", user.id)
        .maybeSingle();

    if (
        membershipError ||
        !membership ||
        membership.is_active !== true
    ) {
        return (
            <main className="mx-auto max-w-3xl px-4 py-12">
                <h1 className="text-2xl font-bold">
                    Company access required
                </h1>
                <p className="mt-2 text-muted-foreground">
                    Your account must be an active company member to access your profile.
                </p>
            </main>
        );
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_path")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Profile query failed:", profileError.message);

        return (
            <main className="mx-auto max-w-3xl px-4 py-12">
                <h1 className="text-2xl font-bold">
                    Unable to load profile
                </h1>
                <p className="mt-2 text-muted-foreground">
                    Check your profiles SELECT policy and try again.
                </p>
            </main>
        );
    }

    let avatarUrl: string | null = null;

    if (profile?.avatar_path) {
        const { data, error } = await supabase.storage
            .from("profile-photos")
            .createSignedUrl(profile.avatar_path, 60 * 60);

        if (error) {
            console.error("Profile photo URL failed:", error.message);
        } else {
            avatarUrl = data.signedUrl;
        }
    }

    const fullName = profile?.full_name ?? "";

    return (
        <main className="mx-auto w-full max-w-4xl space-y-6">
            <header>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Account settings
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#c5a45d]">
                    My Profile
                </h1>
                <p className="mt-2 text-gray-500 dark:text-slate-400">
                    View and manage your account information.
                </p>
            </header>

            <ProfileForm
                email={user.email ?? ""}
                initialName={fullName}
                initialAvatarUrl={avatarUrl}
            />
        </main>
    );
}
