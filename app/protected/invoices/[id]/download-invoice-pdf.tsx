
"use client";

import { useState } from "react";

export default function DownloadInvoicePdf({
    invoiceId,
    invoiceNumber,
}: {
    invoiceId: string;
    invoiceNumber: string;
}) {
    const [loading, setLoading] = useState(false);

    async function downloadPdf() {
        setLoading(true);

        try {
            const response = await fetch("/api/invoice-pdf", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ invoiceId }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => null);
                throw new Error(data?.error || "Unable to generate PDF.");
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const safeNumber = invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_");

            link.href = url;
            link.download = `Invoice-${safeNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Invoice PDF download failed:", error);
            alert(
                error instanceof Error
                    ? error.message
                    : "PDF generation failed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            type="button"
            onClick={downloadPdf}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
            {loading ? "Generating PDF..." : "Download PDF"}
        </button>
    );
}
