"use client";

import { useState } from "react";

type InvoiceLanguage = "en" | "km";
type InvoiceDesign = "premium" | "corporate";

export default function DownloadInvoicePdf({
    invoiceId,
    invoiceNumber,
}: {
    invoiceId: string;
    invoiceNumber: string;
}) {
    const [loading, setLoading] = useState(false);
    const [language, setLanguage] = useState<InvoiceLanguage>("en");
    const [design, setDesign] = useState<InvoiceDesign>("premium");

    async function downloadPdf() {
        setLoading(true);

        try {
            const response = await fetch("/api/invoice-pdf", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    invoiceId,
                    language,
                    design,
                }),
            });

            if (!response.ok) {
                const data: unknown = await response.json().catch(() => null);

                const errorMessage =
                    typeof data === "object" &&
                        data !== null &&
                        "error" in data &&
                        typeof data.error === "string"
                        ? data.error
                        : "Unable to generate PDF.";

                throw new Error(errorMessage);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            const safeNumber = invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_");

            link.href = url;
            link.download = `Invoice-${safeNumber}-${design}-${language}.pdf`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="invoice-pdf-design" className="sr-only">
                PDF design
            </label>

            <select
                id="invoice-pdf-design"
                value={design}
                onChange={(event) =>
                    setDesign(event.target.value as InvoiceDesign)
                }
                disabled={loading}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900"
            >
                <option value="premium">A. Navy & Gold — Premium</option>
                <option value="corporate">B. White & Navy — Corporate</option>
            </select>

            <label htmlFor="invoice-pdf-language" className="sr-only">
                PDF language
            </label>

            <select
                id="invoice-pdf-language"
                value={language}
                onChange={(event) =>
                    setLanguage(event.target.value as InvoiceLanguage)
                }
                disabled={loading}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900"
            >
                <option value="en">English</option>
                <option value="km">ខ្មែរ (Khmer)</option>
            </select>

            <button
                type="button"
                onClick={downloadPdf}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-5 py-2.5 font-medium text-white hover:bg-slate-900 disabled:opacity-60"
            >
                {loading
                    ? "Generating PDF..."
                    : language === "km"
                        ? "ទាញយកវិក្កយបត្រ PDF"
                        : "Download PDF"}
            </button>
        </div>
    );
}