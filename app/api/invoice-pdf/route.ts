
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";

function escapeHtml(value: unknown): string {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };

        return entities[character];
    });
}

export async function POST(request: Request) {
    let browser;

    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return Response.json(
                { error: "Please sign in to download this invoice." },
                { status: 401 }
            );
        }

        const body = await request.json().catch(() => null);
        const invoiceId = body?.invoiceId;

        if (
            typeof invoiceId !== "string" ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoiceId)
        ) {
            return Response.json(
                { error: "A valid invoice ID is required." },
                { status: 400 }
            );
        }

        const { data: membership, error: membershipError } = await supabase
            .from("company_members")
            .select("is_active")
            .eq("user_id", user.id)
            .maybeSingle();

        if (membershipError) {
            console.error("Membership check failed:", membershipError);
            return Response.json(
                { error: "Unable to verify company access." },
                { status: 500 }
            );
        }

        if (!membership?.is_active) {
            return Response.json(
                { error: "You must be an active company member." },
                { status: 403 }
            );
        }

        const { data: invoice, error: invoiceError } = await supabase
            .from("invoices")
            .select(
                "id, invoice_number, customer_id, status, issue_date, due_date, currency, subtotal, discount_total, tax_total, grand_total, notes"
            )
            .eq("id", invoiceId)
            .maybeSingle();

        if (invoiceError) {
            console.error("Invoice query failed:", invoiceError);
            return Response.json(
                { error: "Unable to load the invoice." },
                { status: 500 }
            );
        }

        // RLS may hide invoices the current user cannot read.
        if (!invoice) {
            return Response.json(
                { error: "Invoice not found or you do not have permission to access it." },
                { status: 404 }
            );
        }

        let customerName = "No customer";

        if (invoice.customer_id) {
            const { data: customer, error: customerError } = await supabase
                .from("customers")
                .select("name")
                .eq("id", invoice.customer_id)
                .maybeSingle();

            if (customerError) {
                console.error("Customer query failed:", customerError);
                return Response.json(
                    { error: "Unable to load customer details." },
                    { status: 500 }
                );
            }

            customerName = customer?.name ?? "Unknown customer";
        }

        const fontPath = path.join(
            process.cwd(),
            "public",
            "fonts",
            "NotoSansKhmer-Regular.ttf"
        );

        const fontBytes = await readFile(fontPath);
        const fontBase64 = fontBytes.toString("base64");

        const money = (value: unknown) =>
            new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: invoice.currency || "USD",
            }).format(Number(value) || 0);

        const invoiceNumber = escapeHtml(invoice.invoice_number);
        const safeCustomerName = escapeHtml(customerName);
        const status = escapeHtml(invoice.status.toUpperCase());
        const issueDate = escapeHtml(invoice.issue_date);
        const dueDate = escapeHtml(invoice.due_date || "—");
        const subtotal = escapeHtml(money(invoice.subtotal));
        const discount = escapeHtml(`-${money(invoice.discount_total)}`);
        const tax = escapeHtml(money(invoice.tax_total));
        const total = escapeHtml(money(invoice.grand_total));
        const notes = escapeHtml(invoice.notes || "");

        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        const html = `
      <!DOCTYPE html>
      <html lang="km">
        <head>
          <meta charset="UTF-8" />
          <style>
            @font-face {
              font-family: "NotoKhmer";
              src: url("data:font/ttf;base64,${fontBase64}") format("truetype");
              font-weight: normal;
              font-style: normal;
            }

            * { box-sizing: border-box; }

            body {
              margin: 0;
              color: #1e1e1e;
              font-family: Arial, sans-serif;
              font-size: 11px;
            }

            .khmer {
              font-family: "NotoKhmer", sans-serif;
              font-size: 14px;
              line-height: 1.8;
            }

            .header {
              background: #1e40af;
              color: white;
              padding: 24px 30px;
            }

            .header-row, .customer-row, .item-row, .total {
              display: flex;
              justify-content: space-between;
              gap: 20px;
            }

            h1 { margin: 0 0 8px; font-size: 26px; }
            .status, .dates { text-align: right; }
            .status { padding-top: 8px; }
            .content { padding: 30px; }
            .customer-row { margin-bottom: 30px; }
            .label {
              color: #5a5a5a;
              font-size: 10px;
              font-weight: bold;
              margin-bottom: 10px;
            }

            .dates { line-height: 1.9; }
            .table-header, .item-row {
              display: flex;
              justify-content: space-between;
              padding: 12px;
            }

            .table-header {
              background: #f3f6fa;
              font-weight: bold;
              border-radius: 5px;
            }

            .item-row { border-bottom: 1px solid #e6e6e6; }
            .amount { text-align: right; }

            .total {
              margin-top: 12px;
              padding: 16px 12px;
              border-radius: 5px;
              background: #eff6ff;
              color: #1e40af;
              font-size: 15px;
              font-weight: bold;
            }

            .notes {
              margin-top: 30px;
              white-space: pre-wrap;
              overflow-wrap: anywhere;
              line-height: 1.8;
            }

            .footer {
              margin-top: 65px;
              text-align: center;
              color: #828282;
              font-size: 10px;
            }

            @page { size: A4; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-row">
              <div>
                <h1>INVOICE</h1>
                <div>Invoice #${invoiceNumber}</div>
              </div>
              <div class="status">Status: ${status}</div>
            </div>
          </div>

          <div class="content">
            <div class="customer-row">
              <div>
                <div class="label">BILL TO</div>
                <div class="khmer">${safeCustomerName}</div>
              </div>
              <div class="dates">
                <div>Issue date: ${issueDate}</div>
                <div>Due date: ${dueDate}</div>
              </div>
            </div>

            <div class="table-header">
              <span>Description</span><span>Amount</span>
            </div>
            <div class="item-row">
              <span>Subtotal</span><span class="amount">${subtotal}</span>
            </div>
            <div class="item-row">
              <span>Discount</span><span class="amount">${discount}</span>
            </div>
            <div class="item-row">
              <span>Tax</span><span class="amount">${tax}</span>
            </div>
            <div class="total">
              <span>TOTAL</span><span>${total}</span>
            </div>

            ${notes
                ? `<div class="notes">
                    <strong>Notes</strong>
                    <div class="khmer">${notes}</div>
                  </div>`
                : ""
            }

            <div class="footer">Thank you for your business.</div>
          </div>
        </body>
      </html>
    `;

        await page.setContent(html, { waitUntil: "load" });

        await page.evaluate(async () => {
            await document.fonts.load('14px "NotoKhmer"');
            await document.fonts.ready;
        });

        const pdfBytes = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "15mm",
                right: "15mm",
                bottom: "15mm",
                left: "15mm",
            },
        });

        return new Response(new Uint8Array(pdfBytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": 'attachment; filename="invoice.pdf"',
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("Invoice PDF generation failed:", error);

        return Response.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Could not generate the invoice PDF.",
            },
            { status: 500 }
        );
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
