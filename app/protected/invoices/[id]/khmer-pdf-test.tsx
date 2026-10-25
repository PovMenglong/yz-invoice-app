"use client";

export default function KhmerPdfTest() {
    async function downloadTestPdf() {
        const response = await fetch("/api/khmer-pdf-test");

        if (!response.ok) {
            alert("PDF generation failed. Check your VS Code terminal.");
            return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "khmer-font-test.pdf";
        link.click();

        URL.revokeObjectURL(url);
    }

    return (
        <button
            type="button"
            onClick={downloadTestPdf}
            className="rounded-lg bg-blue-600 px-5 py-3 text-white"
        >
            Download Khmer Test PDF
        </button>
    );
}