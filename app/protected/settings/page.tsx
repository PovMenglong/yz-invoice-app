
import Link from "next/link";
import {
    Building2,
    FileText,
    Palette,
    Users,
    CreditCard,
    UserRound,
    Globe,
    ChevronRight,
} from "lucide-react";

export const instant = false;

const settingsSections = [
    {
        title: "Company Profile",
        description: "Manage your company name, logo, address, and contact information.",
        href: "/protected/settings/company",
        icon: Building2,
    },
    {
        title: "PDF & Print Design",
        description: "Manage invoice templates, company logo, signature, and stamp.",
        href: "/protected/settings/print",
        icon: Palette,
    },
    {
        title: "Team & Permissions",
        description: "Manage employees, roles, invitations, and access permissions.",
        href: "/protected/settings/team",
        icon: Users,
    },
];

export default function SettingsPage() {
    return (
        <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
            <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
                <div className="absolute left-0 top-0 h-full w-1.5 bg-[#c5a45d]" />

                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c5a45d]">
                    Y&Z Home Store Cambodia
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#c5a45d]">
                    Settings
                </h1>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Manage your company, invoices, team, payments, and personal preferences.
                </p>
            </header>

            <section>
                <div className="mb-4">
                    <h2 className="text-lg font-bold text-[#142b4a] dark:text-white">
                        General settings
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Choose a section to manage its settings.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {settingsSections.map((item) => {
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#c5a45d] hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                            >
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f7f2e7] text-[#142b4a] dark:bg-slate-800 dark:text-amber-300">
                                    <Icon size={23} />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-[#142b4a] group-hover:text-[#a88642] dark:text-white">
                                        {item.title}
                                    </h3>

                                    <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                                        {item.description}
                                    </p>
                                </div>

                                <ChevronRight
                                    size={20}
                                    className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#c5a45d]"
                                />
                            </Link>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}
