"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Employee = {
    id: string;
    name: string;
};

export default function InvoiceAssignmentManager({
    invoiceId,
    employees,
    initialAssignedEmployeeIds,
}: {
    invoiceId: string;
    employees: Employee[];
    initialAssignedEmployeeIds: string[];
}) {
    const router = useRouter();

    const [selectedEmployeeId, setSelectedEmployeeId] = useState(
        employees[0]?.id ?? ""
    );
    const [assignedIds, setAssignedIds] = useState(
        initialAssignedEmployeeIds
    );
    const [loadingId, setLoadingId] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const assignedEmployees = employees.filter((employee) =>
        assignedIds.includes(employee.id)
    );

    const availableEmployees = employees.filter(
        (employee) => !assignedIds.includes(employee.id)
    );

    async function updateAssignment(
        employeeId: string,
        method: "POST" | "DELETE"
    ) {
        setLoadingId(employeeId);
        setMessage("");
        setError("");

        try {
            const response = await fetch("/api/invoice-assignments", {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    invoiceId,
                    userId: employeeId,
                }),
            });

            const result: { error?: string; success?: boolean; message?: string } =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ?? "Unable to update invoice assignment."
                );
            }

            if (method === "POST") {
                setAssignedIds((current) => [
                    ...current,
                    employeeId,
                ]);
                setMessage("Employee assigned successfully.");
            } else {
                setAssignedIds((current) =>
                    current.filter((id) => id !== employeeId)
                );
                setMessage("Employee assignment removed successfully.");
            }

            router.refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "An unexpected error occurred."
            );
        } finally {
            setLoadingId("");
        }
    }

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Invoice Assignments
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Assign employees who are allowed to edit this invoice.
                    Other employees can still view it.
                </p>
            </div>

            {employees.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    No active employees are available for assignment.
                </p>
            ) : (
                <>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <select
                            value={selectedEmployeeId}
                            onChange={(event) =>
                                setSelectedEmployeeId(event.target.value)
                            }
                            className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#142b4a] focus:ring-2 focus:ring-[#c5a45d]/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                            {availableEmployees.length === 0 ? (
                                <option value="">
                                    All employees are assigned
                                </option>
                            ) : (
                                availableEmployees.map((employee) => (
                                    <option
                                        key={employee.id}
                                        value={employee.id}
                                    >
                                        {employee.name}
                                    </option>
                                ))
                            )}
                        </select>

                        <button
                            type="button"
                            disabled={
                                !selectedEmployeeId ||
                                assignedIds.includes(selectedEmployeeId) ||
                                loadingId !== ""
                            }
                            onClick={() =>
                                updateAssignment(selectedEmployeeId, "POST")
                            }
                            className="min-h-11 rounded-xl bg-[#142b4a] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1d3b63] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loadingId === selectedEmployeeId
                                ? "Assigning..."
                                : "Assign Employee"}
                        </button>
                    </div>

                    <div className="mt-6">
                        <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Currently Assigned ({assignedEmployees.length})
                        </h3>

                        {assignedEmployees.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                No employees are assigned to this invoice.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {assignedEmployees.map((employee) => (
                                    <div
                                        key={employee.id}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                                    >
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                            {employee.name}
                                        </span>

                                        <button
                                            type="button"
                                            disabled={loadingId !== ""}
                                            onClick={() =>
                                                updateAssignment(
                                                    employee.id,
                                                    "DELETE"
                                                )
                                            }
                                            className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950"
                                        >
                                            {loadingId === employee.id
                                                ? "Removing..."
                                                : "Remove"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {message && (
                <p className="mt-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {message}
                </p>
            )}

            {error && (
                <p className="mt-4 text-sm font-medium text-rose-600 dark:text-rose-400">
                    {error}
                </p>
            )}
        </section>
    );
}
