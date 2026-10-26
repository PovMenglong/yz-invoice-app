
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    FileText,
    Settings,
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react";
import { useState } from "react";

const links = [
    {
        label: "Dashboard",
        href: "/protected",
        icon: LayoutDashboard,
    },
    {
        label: "Invoices",
        href: "/protected/invoices",
        icon: FileText,
    },
    {
        label: "Customers",
        href: "/protected/customers",
        icon: Users,
    },
];

export default function DashboardSidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={`flex min-h-screen shrink-0 flex-col bg-slate-950 text-slate-100 transition-all duration-200 ${collapsed ? "w-[76px]" : "w-64"
                }`}
        >
            <div className="flex h-20 items-center justify-between gap-3 border-b border-white/10 px-4">
                {!collapsed && (
                    <Link
                        href="/protected"
                        className="text-lg font-bold tracking-tight"
                    >
                        Invoice Manager
                    </Link>
                )}

                <button
                    type="button"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                    {collapsed ? (
                        <PanelLeftOpen size={21} />
                    ) : (
                        <PanelLeftClose size={21} />
                    )}
                </button>
            </div>

            <nav className="flex-1 space-y-2 p-4 pt-6">
                {links.map(({ label, href, icon: Icon }) => {
                    const active =
                        href === "/protected"
                            ? pathname === href
                            : pathname === href || pathname.startsWith(`${href}/`);

                    return (
                        <Link
                            key={href}
                            href={href}
                            title={collapsed ? label : undefined}
                            className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-medium transition-colors ${active
                                ? "bg-violet-600 text-white shadow-md shadow-violet-950/30"
                                : "text-slate-300 hover:bg-white/10 hover:text-white"
                                }`}
                        >
                            <Icon className="shrink-0" size={21} />
                            {!collapsed && <span>{label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {!collapsed && (
                <div className="border-t border-white/10 p-4 text-sm leading-relaxed text-slate-400">
                    Invoice Management
                    <p className="mt-1">Manage invoices and customers</p>
                </div>
            )}
        </aside>
    );
}
