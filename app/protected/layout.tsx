
import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import DashboardSidebar from "./dashboard-sidebar";
import Link from "next/link";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col">
        {/* Existing top navigation */}
        <nav className="flex h-16 w-full items-center justify-center border-b border-foreground/10">
          <div className="flex w-full items-center justify-between px-5 py-3">
            <div className="flex items-center gap-5 font-semibold">
              <Link href="/" className="text-base">
                Invoice Manager
              </Link>
              <div className="hidden items-center gap-2 md:flex">
                <DeployButton />
              </div>
            </div>

            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>

        {/* Sidebar + page content */}
        <div className="flex flex-1">
          <div className="hidden shrink-0 md:block">
            <DashboardSidebar />
          </div>

          <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>

        {/* Existing footer controls */}
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
