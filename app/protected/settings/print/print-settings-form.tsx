
"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type PrintSettings = {
    template: string;
    primary_color: string;
    accent_color: string;
    page_size: string;
    orientation: string;
    show_logo: boolean;
    show_tax_id: boolean;
    show_signature: boolean;
    show_stamp: boolean;
};

const defaults: PrintSettings = {
    template: "professional",
    primary_color: "#142b4a",
    accent_color: "#c5a45d",
    page_size: "A4",
    orientation: "portrait",
    show_logo: true,
    show_tax_id: true,
    show_signature: true,
    show_stamp: true,
};

const inputClass =
    "mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const sectionClass =
    "rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-sm sm:p-6";

export default function PrintSettingsForm({
    companyId,
    initialSettings,
}: {
    companyId: string;
    initialSettings: (PrintSettings & { id: string }) | null;
}) {
    const supabase = createClient();

    const [settings, setSettings] = useState<PrintSettings>({
        ...defaults,
        ...(initialSettings ?? {}),
    });

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error" | "">("");

    function update<K extends keyof PrintSettings>(
        key: K,
        value: PrintSettings[K]
    ) {
        setSettings((current) => ({ ...current, [key]: value }));
    }

    async function saveSettings() {
        setSaving(true);
        setMessage("");
        setMessageType("");

        try {
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError || !user) {
                throw new Error("Please log in again.");
            }

            const { data: membership, error: memberError } = await supabase
                .from("company_members")
                .select("role, is_active")
                .eq("user_id", user.id)
                .maybeSingle();

            if (
                memberError ||
                !membership?.is_active ||
                membership.role !== "admin"
            ) {
                throw new Error(
                    "Only active company admins can change print settings."
                );
            }

            const payload = {
                company_id: companyId,
                ...settings,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from("print_settings")
                .upsert(payload, { onConflict: "company_id" });

            if (error) throw error;

            setMessage("Print settings saved successfully.");
            setMessageType("success");
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to save settings."
            );
            setMessageType("error");
        } finally {
            setSaving(false);
        }
    }

    const displayOptions = [
        ["show_logo", "Show company logo"],
        ["show_tax_id", "Show company tax ID"],
        ["show_signature", "Show authorized signature"],
        ["show_stamp", "Show company stamp"],
    ] as const;

    return (
        <main className="mx-auto min-h-screen max-w-5xl space-y-6 text-slate-100">
            {/* Page heading */}
            <div>
                <Link
                    href="/protected/settings"
                    className="inline-flex items-center text-sm font-medium text-blue-400 transition hover:text-blue-300"
                >
                    ← Back to General Settings
                </Link>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
                    PDF & Print Design
                </h1>

                <p className="mt-2 text-sm text-slate-400">
                    Customize the appearance and print options of your invoices.
                </p>
            </div>

            {/* Invoice template */}
            <section className={sectionClass}>
                <h2 className="text-lg font-semibold text-white">
                    Invoice template
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                    Choose the design used for your company invoices.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => update("template", "professional")}
                        aria-pressed={settings.template === "professional"}
                        className={`rounded-xl border p-5 text-left transition ${settings.template === "professional"
                                ? "border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/30"
                                : "border-slate-700 bg-slate-800 hover:border-slate-500"
                            }`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-white">
                                Professional
                            </span>
                            {settings.template === "professional" && (
                                <span className="text-xs font-semibold text-amber-400">
                                    Selected
                                </span>
                            )}
                        </div>
                        <p className="mt-2 text-sm text-slate-400">
                            Navy and gold business invoice.
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => update("template", "minimal")}
                        aria-pressed={settings.template === "minimal"}
                        className={`rounded-xl border p-5 text-left transition ${settings.template === "minimal"
                                ? "border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/30"
                                : "border-slate-700 bg-slate-800 hover:border-slate-500"
                            }`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-white">
                                Minimal
                            </span>
                            {settings.template === "minimal" && (
                                <span className="text-xs font-semibold text-amber-400">
                                    Selected
                                </span>
                            )}
                        </div>
                        <p className="mt-2 text-sm text-slate-400">
                            Clean and simple invoice layout.
                        </p>
                    </button>
                </div>
            </section>

            {/* Brand colors */}
            <section className={sectionClass}>
                <h2 className="text-lg font-semibold text-white">
                    Brand colors
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                    Choose the primary and accent colors for your invoice design.
                </p>

                <div className="mt-5 grid gap-6 sm:grid-cols-2">
                    <label className="block">
                        <span className="text-sm font-medium text-slate-200">
                            Primary color
                        </span>

                        <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-3">
                            <input
                                type="color"
                                value={settings.primary_color}
                                onChange={(e) =>
                                    update("primary_color", e.target.value)
                                }
                                aria-label="Choose primary color"
                                className="h-11 w-16 cursor-pointer rounded-lg border-0 bg-transparent"
                            />
                            <span className="text-sm font-medium text-slate-200">
                                {settings.primary_color.toUpperCase()}
                            </span>
                        </div>
                    </label>

                    <label className="block">
                        <span className="text-sm font-medium text-slate-200">
                            Accent color
                        </span>

                        <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-3">
                            <input
                                type="color"
                                value={settings.accent_color}
                                onChange={(e) =>
                                    update("accent_color", e.target.value)
                                }
                                aria-label="Choose accent color"
                                className="h-11 w-16 cursor-pointer rounded-lg border-0 bg-transparent"
                            />
                            <span className="text-sm font-medium text-slate-200">
                                {settings.accent_color.toUpperCase()}
                            </span>
                        </div>
                    </label>
                </div>
            </section>

            {/* Page setup */}
            <section className={sectionClass}>
                <h2 className="text-lg font-semibold text-white">
                    Page setup
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                    Configure the paper size and page orientation.
                </p>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <label className="block">
                        <span className="text-sm font-medium text-slate-200">
                            Paper size
                        </span>
                        <select
                            value={settings.page_size}
                            onChange={(e) => update("page_size", e.target.value)}
                            className={inputClass}
                        >
                            <option value="A4">A4</option>
                            <option value="Letter">Letter</option>
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-sm font-medium text-slate-200">
                            Orientation
                        </span>
                        <select
                            value={settings.orientation}
                            onChange={(e) =>
                                update("orientation", e.target.value)
                            }
                            className={inputClass}
                        >
                            <option value="portrait">Portrait</option>
                            <option value="landscape">Landscape</option>
                        </select>
                    </label>
                </div>
            </section>

            {/* Display options */}
            <section className={sectionClass}>
                <h2 className="text-lg font-semibold text-white">
                    Display options
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                    Choose which company assets and details appear on invoices.
                </p>

                <div className="mt-5 divide-y divide-slate-700">
                    {displayOptions.map(([key, label]) => (
                        <label
                            key={key}
                            className="flex cursor-pointer items-center justify-between gap-4 py-4"
                        >
                            <span className="text-sm font-medium text-slate-200">
                                {label}
                            </span>

                            <input
                                type="checkbox"
                                checked={settings[key]}
                                onChange={(e) =>
                                    update(key, e.target.checked)
                                }
                                className="h-5 w-5 cursor-pointer rounded border-slate-600 bg-slate-800 accent-amber-400"
                            />
                        </label>
                    ))}
                </div>
            </section>

            {/* Invoice preview */}
            <section className={sectionClass}>
                <h2 className="text-lg font-semibold text-white">
                    Preview
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                    Preview how your selected brand colors will look on an invoice.
                </p>

                <div
                    className="mt-5 overflow-hidden rounded-xl border border-slate-300 bg-white p-5 text-slate-900 shadow-sm sm:p-7"
                    style={{
                        borderTop: `8px solid ${settings.primary_color}`,
                    }}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div
                                className="text-xl font-bold"
                                style={{ color: settings.primary_color }}
                            >
                                Y&Z Home Store Cambodia
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                COMPANY INVOICE
                            </p>
                        </div>

                        <div
                            className="rounded px-3 py-2 text-xs font-bold"
                            style={{
                                backgroundColor: settings.accent_color,
                                color: "#ffffff",
                            }}
                        >
                            INVOICE
                        </div>
                    </div>

                    <div className="my-5 border-t border-gray-200" />

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="font-semibold">Bill To</p>
                            <p className="mt-2 text-gray-500">Customer name</p>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold">Invoice No.</p>
                            <p className="mt-2 text-gray-500">INV-0001</p>
                        </div>
                    </div>

                    <div className="mt-5 rounded bg-gray-50 p-3 text-sm">
                        <div className="flex justify-between font-semibold">
                            <span>Description</span>
                            <span>Amount</span>
                        </div>
                        <div className="mt-3 flex justify-between text-gray-500">
                            <span>Example product</span>
                            <span>$100.00</span>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <div
                            className="min-w-40 border-t-2 pt-3 text-right font-bold"
                            style={{
                                borderColor: settings.accent_color,
                                color: settings.primary_color,
                            }}
                        >
                            TOTAL: $100.00
                        </div>
                    </div>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                    Sample preview only. Your actual PDF layout will be connected
                    in the next step.
                </p>
            </section>

            {/* Save feedback */}
            {message && (
                <p
                    role={messageType === "error" ? "alert" : "status"}
                    className={`rounded-xl border p-4 text-sm ${messageType === "success"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-red-500/30 bg-red-500/10 text-red-300"
                        }`}
                >
                    {message}
                </p>
            )}

            {/* Save button */}
            <div className="flex justify-end pb-6">
                <button
                    type="button"
                    onClick={saveSettings}
                    disabled={saving}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? "Saving..." : "Save Print Settings"}
                </button>
            </div>
        </main>
    );
}
