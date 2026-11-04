
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import DashboardSidebar from "./dashboard-sidebar";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";

export const instant = false;

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fullName = "";
  let avatarUrl: string | null = null;

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, avatar_path")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Sidebar profile query failed:",
        profileError.message
      );
    } else {
      fullName = profile?.full_name ?? "";

      if (profile?.avatar_path) {
        const { data, error } = await supabase.storage
          .from("profile-photos")
          .createSignedUrl(profile.avatar_path, 60 * 60);

        if (error) {
          console.error(
            "Sidebar avatar URL failed:",
            error.message
          );
        } else {
          avatarUrl = data.signedUrl;
        }
      }
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col">
        {/* Top navigation */}
        <nav className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur">
          <div className="flex min-h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              <Link
                href="/protected"
                className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl"
              >
                Invoice Manager
              </Link>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {!hasEnvVars ? (
                <EnvVarWarning />
              ) : (
                <Suspense>
                  <AuthButton />
                </Suspense>
              )}
            </div>
          </div>
        </nav>

        {/* Sidebar + page content */}
        <div className="flex flex-1 items-stretch">
          <div className="hidden shrink-0 self-stretch md:flex">
            <DashboardSidebar
              fullName={fullName}
              email={user?.email ?? ""}
              avatarUrl={avatarUrl}
            />
          </div>

          <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex w-full flex-wrap items-center justify-center gap-6 border-t py-6 text-center text-sm">
          <p>
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
