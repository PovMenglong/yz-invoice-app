
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    FileText,
    Package,
    UserRound,
    ChartNoAxesCombined,
    Settings,
    PanelLeftClose,
    PanelLeftOpen,
    ChevronRight,
} from "lucide-react";
import { useState } from "react";

const links = [
    { label: "Dashboard", href: "/protected", icon: LayoutDashboard },
    { label: "Products", href: "/protected/products", icon: Package },
    { label: "Customers", href: "/protected/customers", icon: Users },
    { label: "Invoices", href: "/protected/invoices", icon: FileText },
    { label: "Reports", href: "/protected/reports", icon: ChartNoAxesCombined },
    { label: "Profile", href: "/protected/profile", icon: UserRound },
    { label: "Settings", href: "/protected/settings", icon: Settings },
];

type DashboardSidebarProps = {
    fullName: string;
    email: string;
    avatarUrl: string | null;
};

export default function DashboardSidebar({
    fullName,
    email,
    avatarUrl,
}: DashboardSidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const displayName = fullName.trim() || "My Account";
    const initial = displayName.charAt(0).toUpperCase() || "U";

    return (
        <aside
            className={`flex h-full min-h-full shrink-0 flex-col text-slate-100 transition-all duration-200 ${collapsed ? "w-[76px]" : "w-64"
                }`}
            style={{ backgroundColor: "#142b4a" }}
        >
            {/* Sidebar header */}
            <div className="flex h-20 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4">
                {!collapsed && (
                    <Link href="/protected" prefetch={false} className="min-w-0">
                        <span className="block truncate text-lg font-bold tracking-tight text-white">
                            Y&Z HOME STORE
                        </span>
                        <span className="block text-xs text-slate-400">
                            Invoice Management
                        </span>
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

            {/* Navigation */}
            <nav className="flex-1 space-y-2 overflow-y-auto p-4 pt-6">
                {links.map(({ label, href, icon: Icon }) => {
                    const active =
                        href === "/protected"
                            ? pathname === href
                            : pathname === href ||
                            pathname.startsWith(`${href}/`);

                    return (
                        <Link
                            key={href}
                            href={href}
                            prefetch={false}
                            title={collapsed ? label : undefined}
                            aria-current={active ? "page" : undefined}
                            className={`relative flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all ${active
                                    ? "bg-[#f7f2e7] text-[#142b4a] shadow-md"
                                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                                }`}
                        >
                            {active && (
                                <span
                                    className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full"
                                    style={{ backgroundColor: "#c5a45d" }}
                                />
                            )}

                            <Icon
                                className="shrink-0"
                                size={21}
                                strokeWidth={active ? 2.5 : 2}
                            />

                            {!collapsed && (
                                <span className="truncate">{label}</span>
                            )}

                            {active && !collapsed && (
                                <span
                                    className="ml-auto h-2 w-2 rounded-full"
                                    style={{ backgroundColor: "#c5a45d" }}
                                />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User profile */}
            <div className="shrink-0 border-t border-white/10 p-3">
                <Link
                    href="/protected/profile"
                    prefetch={false}
                    title={collapsed ? `${displayName} - My Profile` : "My Profile"}
                    className={`flex items-center rounded-xl transition hover:bg-white/10 ${collapsed
                            ? "justify-center p-2"
                            : "gap-3 p-2"
                        }`}
                >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-white/10 text-sm font-bold text-white">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={`${displayName}'s profile`}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            initial
                        )}
                    </div>

                    {!collapsed && (
                        <>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-white">
                                    {displayName}
                                </p>
                                <p className="truncate text-xs text-slate-400">
                                    {email}
                                </p>
                            </div>

                            <ChevronRight
                                size={17}
                                className="shrink-0 text-slate-400"
                            />
                        </>
                    )}
                </Link>
            </div>

            {/* Sidebar footer */}
            {!collapsed && (
                <div className="shrink-0 border-t border-white/10 p-4 text-xs leading-relaxed text-slate-400">
                    <div className="font-semibold text-[#c5a45d]">
                        Y&Z Home Store Cambodia
                    </div>
                    <p className="mt-1">
                        Manage invoices, customers, products, and company settings.
                    </p>
                </div>
            )}
        </aside>
    );
}
