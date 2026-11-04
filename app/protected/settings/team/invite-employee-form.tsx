
"use client";

import { useState } from "react";

export default function InviteEmployeeForm() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setLoading(true);
        setMessage("");
        setIsError(false);

        try {
            const response = await fetch("/api/team/invite", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            const result: unknown = await response.json().catch(() => null);

            const resultRecord =
                typeof result === "object" && result !== null
                    ? (result as Record<string, unknown>)
                    : null;

            const errorMessage =
                typeof resultRecord?.error === "string"
                    ? resultRecord.error
                    : "Unable to invite this employee.";

            const successMessage =
                typeof resultRecord?.message === "string"
                    ? resultRecord.message
                    : "Employee added successfully.";

            if (!response.ok) {
                setIsError(true);
                setMessage(errorMessage);
                return;
            }

            setMessage(successMessage);
            setEmail("");
        } catch {
            setIsError(true);
            setMessage("A network error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Invite an employee
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Send an invitation to a new employee or add an existing account
                    to your company.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label
                        htmlFor="employee-email"
                        className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                        Employee email address
                    </label>

                    <input
                        id="employee-email"
                        type="email"
                        required
                        maxLength={254}
                        autoComplete="email"
                        placeholder="employee@example.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#c5a45d] focus:ring-2 focus:ring-[#c5a45d]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="inline-flex items-center justify-center rounded-xl bg-[#142b4a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3b63] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? "Processing..." : "Send invitation"}
                </button>

                {message && (
                    <p
                        role="status"
                        aria-live="polite"
                        className={`rounded-xl border p-3 text-sm ${isError
                                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}
                    >
                        {message}
                    </p>
                )}
            </form>
        </section>
    );
}
