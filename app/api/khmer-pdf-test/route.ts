
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Browser } from "@cloudflare/playwright";

export async function GET(request: Request) {
  let browser: Browser | undefined;

  try {
    const { env } = await getCloudflareContext({ async: true });

    if (!env.ASSETS) {
      throw new Error("Cloudflare ASSETS binding is unavailable.");
    }

    const fontResponse = await env.ASSETS.fetch(
      new Request(
        new URL("/fonts/NotoSansKhmer-Regular.ttf", request.url)
      )
    );

    if (!fontResponse.ok) {
      throw new Error(
        `Could not load Khmer font. Asset response: ${fontResponse.status}`
      );
    }

    const fontBytes = new Uint8Array(
      await fontResponse.arrayBuffer()
    );

    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < fontBytes.length; i += chunkSize) {
      binary += String.fromCharCode(
        ...fontBytes.subarray(i, i + chunkSize)
      );
    }

    const fontBase64 = btoa(binary);

    const { launch } = await import("@cloudflare/playwright");
    browser = await launch(env.BROWSER);

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
          <h2>Khmer Font Test</h2>
          <div>សួស្តី កម្ពុជា</div>
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
