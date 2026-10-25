
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  let browser;

  try {
    const fontPath = path.join(
      process.cwd(),
      "public",
      "fonts",
      "NotoSansKhmer-Regular.ttf"
    );

    const fontBytes = await readFile(fontPath);
    const fontBase64 = fontBytes.toString("base64");

    browser = await chromium.launch({ headless: true });

    const page = await browser.newPage({
      viewport: { width: 794, height: 1123 },
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            @font-face {
              font-family: "NotoKhmer";
              src: url("data:font/ttf;base64,${fontBase64}")
                format("truetype");
              font-weight: normal;
              font-style: normal;
            }

            body {
              font-family: "NotoKhmer", sans-serif;
              font-size: 32px;
            }
          </style>
        </head>
        <body>
          <div>សៅ ការេ។</div>
        </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: "load" });

    await page.evaluate(async () => {
      await document.fonts.load('32px "NotoKhmer"');
      await document.fonts.ready;
    });

    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
    });

    return new Response(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="khmer-font-test.pdf"',
      },
    });
  } catch (error) {
    console.error("Khmer PDF generation failed:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not generate the Khmer PDF test.",
      },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
