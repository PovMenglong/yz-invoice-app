import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Browser } from "@cloudflare/playwright";
import { createClient } from "@/lib/supabase/server";

type Design = "premium" | "corporate";

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

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function amountInWords(value: number, currency: string): string {
  const ones = [
    "zero", "one", "two", "three", "four", "five", "six", "seven",
    "eight", "nine", "ten", "eleven", "twelve", "thirteen",
    "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
    "nineteen",
  ];

  const tens = [
    "", "", "twenty", "thirty", "forty", "fifty",
    "sixty", "seventy", "eighty", "ninety",
  ];

  function belowThousand(number: number): string {
    if (number < 20) return ones[number];

    if (number < 100) {
      return (
        tens[Math.floor(number / 10)] +
        (number % 10 ? `-${ones[number % 10]}` : "")
      );
    }

    return (
      `${ones[Math.floor(number / 100)]} hundred` +
      (number % 100 ? ` ${belowThousand(number % 100)}` : "")
    );
  }

  const absolute = Math.abs(value);
  const whole = Math.floor(absolute);
  const cents = Math.round((absolute - whole) * 100);

  if (whole === 0 && cents === 0) {
    return `Zero ${currency} Only`;
  }

  let remaining = whole;
  const parts: string[] = [];

  const groups: [number, string][] = [
    [1_000_000_000, "billion"],
    [1_000_000, "million"],
    [1000, "thousand"],
    [1, ""],
  ];

  for (const [size, label] of groups) {
    const chunk = Math.floor(remaining / size);

    if (chunk > 0) {
      parts.push(
        belowThousand(chunk) + (label ? ` ${label}` : "")
      );
      remaining %= size;
    }
  }

  let result = parts.join(" ");

  if (cents > 0) {
    result += ` and ${cents}/100`;
  }

  return `${value < 0 ? "Minus " : ""}${result} ${currency} Only`;
}

export async function POST(request: Request) {
  let browser: Browser | undefined;

  try {
    const { env } = await getCloudflareContext({
      async: true,
    });
    const supabase = await createClient();

    // -------------------------------------------------------
    // 1. Authentication
    // -------------------------------------------------------

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

    const body: unknown = await request.json().catch(() => null);

    const bodyRecord =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : null;

    const invoiceId = bodyRecord?.invoiceId;
    const language = bodyRecord?.language === "km" ? "km" : "en";
    const isKhmer = language === "km";

    if (
      typeof invoiceId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        invoiceId
      )
    ) {
      return Response.json(
        { error: "A valid invoice ID is required." },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // 2. Active company membership
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // 3. Company information
    // -------------------------------------------------------

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select(
        "id, name, billing_address, phone, email, website, tax_id, logo_path, khqr_path, authorized_signature_path, company_stamp_path"
      )
      .eq("singleton", true)
      .maybeSingle();

    if (companyError) {
      console.error("Company query failed:", companyError.message);

      return Response.json(
        { error: "Unable to load company settings." },
        { status: 500 }
      );
    }

    if (!company) {
      return Response.json(
        { error: "Please configure your company settings first." },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // 4. Load saved PDF and print settings
    // -------------------------------------------------------

    const { data: savedSettings, error: settingsError } = await supabase
      .from("print_settings")
      .select(
        "template, primary_color, accent_color, page_size, orientation, show_logo, show_tax_id, show_signature, show_stamp"
      )
      .eq("company_id", company.id)
      .maybeSingle();

    if (settingsError) {
      console.error("Print settings query failed:", settingsError.message);

      return Response.json(
        { error: "Unable to load PDF print settings." },
        { status: 500 }
      );
    }

    // Validate saved values before using them in HTML/CSS.
    const validColor = (value: unknown, fallback: string) =>
      typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
        ? value
        : fallback;

    const primaryColor = validColor(
      savedSettings?.primary_color,
      "#142b4a"
    );
    const accentColor = validColor(
      savedSettings?.accent_color,
      "#c5a45d"
    );

    const pageSize =
      savedSettings?.page_size === "Letter" ? "Letter" : "A4";

    const orientation =
      savedSettings?.orientation === "landscape"
        ? "landscape"
        : "portrait";

    const showLogo = savedSettings?.show_logo ?? true;
    const showTaxId = savedSettings?.show_tax_id ?? true;
    const showSignature = savedSettings?.show_signature ?? true;
    const showStamp = savedSettings?.show_stamp ?? true;

    // The settings form uses "professional" and "minimal".
    // Reuse the existing PDF layout classes for those two choices.
    const design: Design =
      savedSettings?.template === "minimal" ? "corporate" : "premium";

    // -------------------------------------------------------
    // 5. Download private company images
    // -------------------------------------------------------

    async function getImageDataUrl(
      storagePath: string | null
    ): Promise<string | null> {
      if (!storagePath) return null;

      const { data, error } = await supabase.storage
        .from("company-assets")
        .download(storagePath);

      if (error || !data) {
        console.error("Company image download failed:", error?.message);
        return null;
      }

      const extension = storagePath.split(".").pop()?.toLowerCase();

      const mimeType =
        extension === "jpg" || extension === "jpeg"
          ? "image/jpeg"
          : extension === "webp"
            ? "image/webp"
            : extension === "svg"
              ? "image/svg+xml"
              : "image/png";

      const base64 = Buffer.from(await data.arrayBuffer()).toString("base64");

      return `data:${mimeType};base64,${base64}`;
    }

    const [
      companyLogo,
      companyKhqr,
      companySignature,
      companyStamp,
    ] = await Promise.all([
      getImageDataUrl(company.logo_path),
      getImageDataUrl(company.khqr_path),
      getImageDataUrl(company.authorized_signature_path),
      getImageDataUrl(company.company_stamp_path),
    ]);

    // -------------------------------------------------------
    // 6. Invoice information
    // -------------------------------------------------------

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        customer_id,
        status,
        issue_date,
        due_date,
        currency,
        subtotal,
        discount_total,
        tax_total,
        grand_total,
        notes,
        billing_address,
        shipping_address
      `)
      .eq("id", invoiceId)
      .maybeSingle();

    if (invoiceError) {
      console.error("Invoice query failed:", invoiceError);

      return Response.json(
        { error: "Unable to load the invoice." },
        { status: 500 }
      );
    }

    // RLS determines whether the current user can read this invoice.
    if (!invoice) {
      return Response.json(
        {
          error:
            "Invoice not found or you do not have permission to access it.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // 7. Invoice items — include ALL items
    // -------------------------------------------------------

    const { data: invoiceItems, error: itemsError } = await supabase
      .from("invoice_items")
      .select(
        "id, description, quantity, unit_price, discount, tax_rate, line_total, sort_order"
      )
      .eq("invoice_id", invoiceId)
      .order("sort_order", { ascending: true });

    if (itemsError) {
      console.error("Invoice items query failed:", itemsError);

      return Response.json(
        { error: "Unable to load invoice items." },
        { status: 500 }
      );
    }

    // -------------------------------------------------------
    // 8. Customer information
    // -------------------------------------------------------

    let customerName = "No customer";
    let customerPhone = "";
    let customerEmail = "";
    let customerAddress = "";

    if (invoice.customer_id) {
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("name, phone, email, billing_address")
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
      customerPhone = customer?.phone ?? "";
      customerEmail = customer?.email ?? "";
      customerAddress = customer?.billing_address ?? "";
    }

    // -------------------------------------------------------
    // 9. Khmer font
    // -------------------------------------------------------

    // -------------------------------------------------------
    // 9. Khmer font - Cloudflare Assets
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // 10. Formatting
    // -------------------------------------------------------

    const currency = invoice.currency || "USD";

    const money = (value: unknown) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(Number(value) || 0);

    const labels = isKhmer
      ? {
        documentTitle: "វិក្កយបត្រ",
        billTo: "អតិថិជន",
        customerName: "ឈ្មោះអតិថិជន",
        address: "អាសយដ្ឋាន",
        phone: "ទូរស័ព្ទ",
        email: "អ៊ីមែល",
        invoiceNumber: "លេខវិក្កយបត្រ",
        issueDate: "កាលបរិច្ឆេទចេញ",
        dueDate: "ថ្ងៃផុតកំណត់",
        description: "បរិយាយ",
        quantity: "ចំនួន",
        unitPrice: "តម្លៃឯកតា",
        amount: "ចំនួនទឹកប្រាក់",
        paymentInformation: "ព័ត៌មានការទូទាត់",
        accountName: "ឈ្មោះគណនី",
        paymentPhone: "លេខទូរស័ព្ទទូទាត់",
        subtotal: "សរុបរង",
        discount: "បញ្ចុះតម្លៃ",
        tax: "ពន្ធ",
        grandTotal: "សរុបចុងក្រោយ",
        notes: "កំណត់ចំណាំ",
        amountDue: "ចំនួនត្រូវបង់",
        amountInWords: "ចំនួនទឹកប្រាក់ជាអក្សរ",
        customerSignature: "ហត្ថលេខាអតិថិជន/អ្នកទទួល",
        authorizedSignature: "ហត្ថលេខា និងត្រាក្រុមហ៊ុន",
        thankYou: "សូមអរគុណចំពោះការគាំទ្ររបស់អ្នក",
        noItems: "មិនទាន់មានមុខទំនិញក្នុងវិក្កយបត្រនេះទេ។",
        paymentTerms: "លក្ខខណ្ឌទូទាត់",
        paymentTermOne:
          "ការទូទាត់អាចធ្វើឡើងនៅពេលបញ្ជាទិញ ឬនៅពេលទទួលបានទំនិញ។",
        paymentTermTwo:
          "អាចទូទាត់តាមរយៈការផ្ទេរប្រាក់ធនាគារ ABA ឬសាច់ប្រាក់។",
      }
      : {
        documentTitle: "INVOICE",
        billTo: "BILL TO",
        customerName: "Customer name",
        address: "Address",
        phone: "Phone",
        email: "Email",
        invoiceNumber: "Invoice No.",
        issueDate: "Invoice date",
        dueDate: "Due date",
        description: "Description",
        quantity: "Quantity",
        unitPrice: "Unit Price",
        amount: "Amount",
        paymentInformation: "PAYMENT INFORMATION",
        accountName: "Account name",
        paymentPhone: "Payment via phone number",
        subtotal: "Subtotal",
        discount: "Discount",
        tax: "Tax",
        grandTotal: "GRAND TOTAL",
        notes: "NOTES & PAYMENT TERMS",
        amountDue: "AMOUNT DUE",
        amountInWords: "AMOUNT IN WORDS",
        customerSignature: "Customer / Receiver",
        authorizedSignature: "Authorized Signature & Stamp",
        thankYou: "Thank You for Shopping with Us",
        noItems: "No invoice items recorded.",
        paymentTerms: "Payment terms",
        paymentTermOne:
          "Payment can be made when placing the order or upon receipt of the goods.",
        paymentTermTwo:
          "Payment can be made by Bank Transfer / ABA / Cash.",
      };

    const safeCompanyName = escapeHtml(company.name);
    const safeCompanyAddress = escapeHtml(company.billing_address || "");
    const safeCompanyPhone = escapeHtml(company.phone || "");
    const safeCompanyEmail = escapeHtml(company.email || "");
    const safeCompanyWebsite = escapeHtml(company.website || "");
    const safeCompanyTaxId = escapeHtml(company.tax_id || "");

    const safeInvoiceNumber = escapeHtml(invoice.invoice_number);
    const safeStatus = escapeHtml(String(invoice.status || "").toUpperCase());
    const safeIssueDate = escapeHtml(formatDate(invoice.issue_date));
    const safeDueDate = escapeHtml(formatDate(invoice.due_date));

    const safeCustomerName = escapeHtml(customerName);
    const safeCustomerPhone = escapeHtml(customerPhone);
    const safeCustomerEmail = escapeHtml(customerEmail);

    const safeCustomerAddress = escapeHtml(
      invoice.billing_address || customerAddress || ""
    );

    const safeShippingAddress = escapeHtml(invoice.shipping_address || "");
    const safeNotes = escapeHtml(invoice.notes || "");

    const safeSubtotal = escapeHtml(money(invoice.subtotal));
    const safeDiscount = escapeHtml(`−${money(invoice.discount_total)}`);
    const safeTax = escapeHtml(money(invoice.tax_total));
    const safeTotal = escapeHtml(money(invoice.grand_total));

    const wordsTotal = escapeHtml(
      amountInWords(Number(invoice.grand_total) || 0, currency)
    );

    const itemList = invoiceItems ?? [];

    const itemRows = itemList.length
      ? itemList
        .map((item, index) => {
          const description = escapeHtml(item.description);

          const quantity = escapeHtml(
            Number(item.quantity).toLocaleString("en-US", {
              maximumFractionDigits: 3,
            })
          );

          const unitPrice = escapeHtml(money(item.unit_price));
          const lineTotal = escapeHtml(money(item.line_total));

          return `
              <tr>
                <td class="center">${index + 1}</td>
                <td class="description">${description}</td>
                <td class="center">${quantity}</td>
                <td class="right">${unitPrice}</td>
                <td class="right">${lineTotal}</td>
              </tr>
            `;
        })
        .join("")
      : `
          <tr>
            <td colspan="5" class="empty-items">${escapeHtml(labels.noItems)}</td>
          </tr>
        `;

    const blankRows = "";

    const customerAddressHtml = safeCustomerAddress || safeShippingAddress;

    // -------------------------------------------------------
    // 11. Launch browser and create PDF
    // -------------------------------------------------------

    const { launch } = await import("@cloudflare/playwright");

    browser = await launch(env.BROWSER);

    const page = await browser.newPage({
      viewport: { width: 794, height: 1123 },
      deviceScaleFactor: 1,
    });

    const html = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <style>
    @font-face {
      font-family: "NotoKhmer";
      src: url("data:font/ttf;base64,${fontBase64}")
        format("truetype");
      font-weight: normal;
      font-style: normal;
    }

    * {
      box-sizing: border-box;
    }

    @page {
      size: ${pageSize} ${orientation};
      margin: 5mm;
    }

    html {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      margin: 0;
      color: #253247;
      background: #fff;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      line-height: 1.45;
    }

    body.khmer,
    body.khmer * {
      font-family: "NotoKhmer", Arial, sans-serif;
      line-height: 1.7;
    }

    .invoice {
      --navy: ${primaryColor};
      --navy-deep: ${primaryColor};
      --gold: ${accentColor};
      --gold-light: ${accentColor}20;
      width: 100%;
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 18px;
      padding: 18px;
      border-bottom: 4px solid var(--gold);
      background: var(--navy-deep);
      color: white;
    }

    .corporate .invoice-header {
      background: white;
      color: var(--navy-deep);
      border: 1px solid #dce5ef;
      border-bottom: 4px solid var(--navy);
    }

    .company-heading {
      display: flex;
      align-items: flex-start;
      gap: 13px;
      min-width: 0;
    }

    .company-logo {
      width: 76px;
      height: 76px;
      padding: 4px;
      flex-shrink: 0;
      object-fit: contain;
      background: white;
      border-radius: 5px;
    }

    .company-name {
      margin: 0 0 5px;
      font-size: 21px;
      line-height: 1.3;
      font-weight: 800;
    }

    .company-heading p {
      margin: 3px 0;
      font-size: 9px;
      overflow-wrap: anywhere;
    }

    .tagline {
      margin: 0 0 7px !important;
      color: #e4c77f;
      font-weight: 700;
    }

    .corporate .tagline {
      color: var(--navy);
    }

    .invoice-heading {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      color: #e4c77f;
      white-space: nowrap;
    }

    .corporate .invoice-heading {
      color: var(--navy);
    }

    .invoice-heading span {
      font-size: 32px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: 2px;
    }

    .invoice-heading small {
      padding: 5px 9px;
      border: 1px solid currentColor;
      border-radius: 3px;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1.15fr .85fr;
      gap: 15px;
      margin: 18px 0;
    }

    .info-card {
      min-width: 0;
      padding: 13px;
      border: 1px solid #e0e5eb;
      border-top: 3px solid var(--gold);
      border-radius: 5px;
    }

    .info-card h2,
    .payment h2,
    .note-box h2 {
      margin: 0 0 10px;
      color: var(--navy);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .8px;
    }

    .customer-name {
      margin-bottom: 7px;
      color: #172033;
      font-size: 13px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }

    .customer-line {
      margin: 5px 0;
      font-size: 9px;
      overflow-wrap: anywhere;
    }

    .meta-row {
      display: grid;
      grid-template-columns: 1fr 8px 1fr;
      gap: 5px;
      padding: 6px 0;
      border-bottom: 1px solid #e8edf2;
      font-size: 9px;
      font-weight: 700;
    }

    .meta-row:last-child {
      border-bottom: 0;
    }

    .meta-value {
      overflow-wrap: anywhere;
    }

    .items-heading {
      margin: 20px 0 8px;
      color: var(--navy);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .7px;
    }

    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 9px;
    }

    .invoice-table th {
      padding: 9px 7px;
      background: var(--navy);
      color: white;
      border: 1px solid var(--navy);
      text-align: left;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .corporate .invoice-table th {
      background: #eaf1f8;
      color: var(--navy);
      border-color: #cbd8e6;
    }

    .invoice-table td {
      min-height: 30px;
      padding: 8px 7px;
      border: 1px solid #e1e7ef;
      vertical-align: middle;
      overflow-wrap: anywhere;
    }

    .invoice-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    .invoice-table th:nth-child(1) {
      width: 7%;
    }

    .invoice-table th:nth-child(2) {
      width: 40%;
    }

    .invoice-table th:nth-child(3) {
      width: 14%;
    }

    .invoice-table th:nth-child(4) {
      width: 19%;
    }

    .invoice-table th:nth-child(5) {
      width: 20%;
    }

    .center {
      text-align: center;
    }

    .right {
      text-align: right;
    }

    .empty-items {
      text-align: center;
      padding: 15px !important;
    }

    .blank-row td {
      height: 27px;
    }

    .bottom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 18px;
      align-items: stretch;
    }

    .payment {
      min-width: 0;
      padding: 13px;
      border: 1px solid #e0e5eb;
      border-top: 3px solid var(--gold);
      border-radius: 5px;
    }

    .payment-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .khqr,
    .qr-placeholder {
      display: grid;
      place-items: center;
      width: 112px;
      height: 112px;
      padding: 4px;
      flex-shrink: 0;
      border: 1px solid #dbe2ea;
      border-radius: 4px;
      background: white;
      object-fit: contain;
    }

    .qr-placeholder {
      color: var(--navy);
      font-weight: 800;
    }

    .payment-details {
      display: flex;
      flex-direction: column;
      gap: 9px;
      min-width: 0;
    }

    .aba-label {
      color: var(--navy);
      font-size: 11px;
      font-weight: 800;
    }

    .payment-field {
      display: flex;
      flex-direction: column;
      gap: 3px;
      overflow-wrap: anywhere;
    }

    .payment-field small {
      color: #64748b;
      font-size: 8px;
    }

    .payment-field strong {
      font-size: 10px;
    }

    .totals {
      overflow: hidden;
      border: 1px solid #dce3eb;
      border-radius: 5px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid #e8edf2;
      font-size: 10px;
    }

    .total-row:last-child {
      border-bottom: 0;
    }

    .total-row strong {
      text-align: right;
      overflow-wrap: anywhere;
    }

    .grand {
      padding: 13px 12px;
      background: var(--navy);
      color: white;
      font-size: 13px;
      font-weight: 900;
    }

    .corporate .grand {
      background: #eaf1f8;
      color: var(--navy);
    }

    .notes-grid {
      display: grid;
      grid-template-columns: 1.2fr .8fr;
      gap: 13px;
      margin-top: 17px;
    }

    .note-box {
      min-width: 0;
      padding: 12px;
      border: 1px solid #e0e5eb;
      border-radius: 5px;
    }

    .note-box h2 {
      margin-bottom: 8px;
    }

    .note-box p {
      margin: 5px 0;
      font-size: 9px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .amount-box {
      border-top: 3px solid var(--gold);
      background: var(--gold-light);
    }

    .amount-box strong {
      display: block;
      margin-top: 10px;
      color: var(--navy);
      font-size: 19px;
      overflow-wrap: anywhere;
    }

    .words-box {
      margin-top: 5px;
      padding: 5px 9px;
      border: 1px solid #e0e5eb;
      border-radius: 4px;
    }

    .words-box h2 {
      margin: 0;
      font-size: 8px;
    }

    .words-box strong {
      display: block;
      margin-top: 2px;
      font-size: 8px;
      font-weight: 600;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }

    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 35px;
      margin: 27px 0 20px;
      text-align: center;
      break-inside: avoid;
    }

    .sign-line {
      display: flex;
      height: 70px;
      align-items: flex-end;
      justify-content: center;
      gap: 7px;
      border-bottom: 1px solid #94a3b8;
    }

    .sign-line img {
      max-width: 110px;
      max-height: 65px;
      object-fit: contain;
    }

    .sign-line img.stamp {
      max-width: 62px;
      max-height: 62px;
    }

    .signatures p {
      margin: 7px 0 0;
      font-size: 9px;
      font-weight: 700;
    }

    .invoice-footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      margin-top: 15px;
      padding: 13px 16px;
      border-top: 3px solid var(--gold);
      background: var(--navy-deep);
      color: white;
      text-align: center;
      font-size: 8px;
      overflow-wrap: anywhere;
    }

    .corporate .invoice-footer {
      background: #edf3fa;
      color: var(--navy);
      border-top-color: var(--navy);
    }

    .invoice-footer strong {
      font-size: 10px;
    }

    .footer-contact {
      line-height: 1.6;
    }

    .khmer-text {
      font-family: "NotoKhmer", Arial, sans-serif;
    }

    @media print {
      .invoice-header,
      .invoice-table th,
      .grand,
      .invoice-footer,
      .amount-box {
        print-color-adjust: exact !important;
        -webkit-print-color-adjust: exact !important;
      }

      .invoice-table thead {
        display: table-header-group;
      }

      .invoice-table tr,
      .info-card,
      .payment,
      .totals,
      .note-box,
      .signatures {
        break-inside: avoid;
      }
    }
  </style>
</head>

<body class="${isKhmer ? "khmer" : ""}">
<main class="invoice ${design}">

  <header class="invoice-header">
    <div class="company-heading">
      ${showLogo && companyLogo
        ? `<img class="company-logo" src="${companyLogo}" alt="Company logo" />`
        : ""
      }

      <div>
        <h1 class="company-name">${safeCompanyName}</h1>

        <p class="tagline">
          ${isKhmer
        ? "ខ្នើយ · ភួយ · ខ្នើយសាឡុង · សម្ភារៈតុបតែងផ្ទះ"
        : "Pillows · Blankets · Sofa Cushions · Home Décor"}
        </p>

        ${safeCompanyAddress ? `<p>${safeCompanyAddress}</p>` : ""}
        ${safeCompanyPhone ? `<p>${isKhmer ? "ទូរស័ព្ទ" : "Phone"}: ${safeCompanyPhone}</p>` : ""}
        ${safeCompanyEmail ? `<p>${safeCompanyEmail}</p>` : ""}
        ${safeCompanyWebsite ? `<p>${safeCompanyWebsite}</p>` : ""}
        ${showTaxId && safeCompanyTaxId ? `<p>Tax ID: ${safeCompanyTaxId}</p>` : ""}
      </div>
    </div>

    <div class="invoice-heading">
      <span>${labels.documentTitle}</span>
      <small>${safeStatus}</small>
    </div>
  </header>

  <section class="info-grid">
    <div class="info-card">
      <h2>${labels.billTo}</h2>

      <div class="customer-name">${safeCustomerName}</div>

      ${customerAddressHtml
        ? `<p class="customer-line">${labels.address}: ${customerAddressHtml}</p>`
        : ""
      }

      ${safeCustomerPhone
        ? `<p class="customer-line">${labels.phone}: ${safeCustomerPhone}</p>`
        : ""
      }

      ${safeCustomerEmail
        ? `<p class="customer-line">${labels.email}: ${safeCustomerEmail}</p>`
        : ""
      }
    </div>

    <div class="info-card">
      <h2>${isKhmer ? "ព័ត៌មានវិក្កយបត្រ" : "INVOICE DETAILS"}</h2>

      <div class="meta-row">
        <span>${labels.invoiceNumber}</span>
        <span>:</span>
        <span class="meta-value">${safeInvoiceNumber}</span>
      </div>

      <div class="meta-row">
        <span>${labels.issueDate}</span>
        <span>:</span>
        <span class="meta-value">${safeIssueDate}</span>
      </div>

      <div class="meta-row">
        <span>${labels.dueDate}</span>
        <span>:</span>
        <span class="meta-value">${safeDueDate}</span>
      </div>
    </div>
  </section>

  <h2 class="items-heading">
    ${isKhmer ? "បញ្ជីមុខទំនិញ" : "INVOICE ITEMS"}
  </h2>

  <table class="invoice-table">
    <thead>
      <tr>
        <th class="center">${isKhmer ? "ល.រ" : "No."}</th>
        <th>${labels.description}</th>
        <th class="center">${labels.quantity}</th>
        <th class="right">${labels.unitPrice}</th>
        <th class="right">${labels.amount}</th>
      </tr>
    </thead>

    <tbody>
      ${itemRows}
      ${blankRows}
    </tbody>
  </table>

  <section class="bottom-grid">
    <div class="payment">
      <h2>${labels.paymentInformation}</h2>

      <div class="payment-content">
        ${companyKhqr
        ? `<img class="khqr" src="${companyKhqr}" alt="Company KHQR payment code" />`
        : `<div class="qr-placeholder">KHQR</div>`
      }

        <div class="payment-details">
          <strong class="aba-label">ABA PAY / KHQR</strong>

          <div class="payment-field">
            <small>${labels.accountName}</small>
            <strong>KHAM PICHCHANTHANY</strong>
          </div>

          <div class="payment-field">
            <small>${labels.paymentPhone}</small>
            <strong>089-985-679</strong>
          </div>

          <small>
            ${isKhmer
        ? "សូមស្កេនដើម្បីទូទាត់តាមកម្មវិធីធនាគាររបស់អ្នក។"
        : "Scan to pay with your banking app."}
          </small>
        </div>
      </div>
    </div>

    <div class="totals">
      <div class="total-row">
        <span>${labels.subtotal}</span>
        <strong>${safeSubtotal}</strong>
      </div>

      <div class="total-row">
        <span>${labels.discount}</span>
        <strong>${safeDiscount}</strong>
      </div>

      <div class="total-row">
        <span>${labels.tax}</span>
        <strong>${safeTax}</strong>
      </div>

      <div class="total-row grand">
        <span>${labels.grandTotal}</span>
        <strong>${safeTotal}</strong>
      </div>
    </div>
  </section>

  <section class="notes-grid">
    <div class="note-box">
      <h2>${labels.notes}</h2>

      <p>1. ${labels.paymentTermOne}</p>
      <p>2. ${labels.paymentTermTwo}</p>

      ${safeNotes
        ? `<p>${safeNotes.replace(/\r?\n/g, "<br />")}</p>`
        : ""
      }
    </div>

    <div class="note-box amount-box">
      <h2>${labels.amountDue}</h2>
      <strong>${safeTotal}</strong>
    </div>
  </section>

  <div class="words-box">
    <h2 class="small-title">${labels.amountInWords}</h2>
    <strong>${wordsTotal}</strong>
  </div>

  <section class="signatures">
    <div>
      <div class="sign-line"></div>
      <p>${labels.customerSignature}</p>
    </div>

    <div>
      <div class="sign-line">
        ${showSignature && companySignature
        ? `<img src="${companySignature}" alt="Authorized signature" />`
        : ""
      }

        ${showStamp && companyStamp
        ? `<img class="stamp" src="${companyStamp}" alt="Company stamp" />`
        : ""
      }
      </div>

      <p>${labels.authorizedSignature}</p>
    </div>
  </section>

  <footer class="invoice-footer">
    <strong>${safeCompanyName}</strong>

    <div class="footer-contact">
      (855) 92-666-863 / 31-9999-836
      ${safeCompanyWebsite ? ` · ${safeCompanyWebsite}` : ""}
      ${safeCompanyEmail || "yzhomestore.kh@gmail.com"}
    </div>

    <div>
      Borey Penghout Boeng Snor, #433 Street Claster,
      Phnom Penh, Cambodia.
    </div>

    <strong>${labels.thankYou}</strong>
  </footer>

</main>
</body>
</html>`;

    await page.setContent(html, { waitUntil: "load" });

    await page.evaluate(async () => {
      await document.fonts.ready;
      await document.fonts.load('12px "NotoKhmer"');

      const images = Array.from(document.images);

      await Promise.all(
        images.map((image) => {
          if (image.complete) return Promise.resolve();

          return new Promise<void>((resolve) => {
            image.onload = () => resolve();
            image.onerror = () => resolve();
          });
        })
      );
    });

    const pdfBytes = await page.pdf({
      format: pageSize,
      landscape: orientation === "landscape",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: {
        top: "5mm",
        right: "5mm",
        bottom: "5mm",
        left: "5mm",
      },
    });

    const safeFileNumber = String(invoice.invoice_number).replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    );

    return new Response(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Invoice-${safeFileNumber}-${language}-${design}.pdf"`,
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
