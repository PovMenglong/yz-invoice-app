
"use client";

import { useMemo, useState } from "react";

type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  notes: string;
  created_at: string;
};

type Company = {
  name: string;
  billing_address: string;
  phone: string;
  email: string;
  website: string;
  tax_id: string;
  logo_url: string | null;
  khqr_url: string | null;
  signature_url: string | null;
  stamp_url: string | null;
};

type Customer = {
  name: string;
  phone: string;
  email: string;
  billing_address: string;
};

type Item = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  line_total: number;
};

type Design = "premium" | "corporate";

type PrintSettings = {
  template: "professional" | "minimal";
  primary_color: string;
  accent_color: string;
  page_size: "A4" | "Letter";
  orientation: "portrait" | "landscape";
  show_logo: boolean;
  show_tax_id: boolean;
  show_signature: boolean;
  show_stamp: boolean;
};

export default function InvoicePrintView({
  invoice,
  company,
  customer,
  items,
  printSettings,
}: {
  invoice: Invoice;
  company: Company;
  customer: Customer;
  items: Item[];
  printSettings: PrintSettings;
}) {
  const [design, setDesign] = useState<Design>("premium");

  const [number, setNumber] = useState(invoice.invoice_number);
  const [date, setDate] = useState(invoice.issue_date);
  const [due, setDue] = useState(invoice.due_date ?? "");

  const [name, setName] = useState(customer.name);
  const [address, setAddress] = useState(customer.billing_address);
  const [phone, setPhone] = useState(customer.phone);
  const [email, setEmail] = useState(customer.email);
  const [notes, setNotes] = useState(invoice.notes ?? "");

  const [rows, setRows] = useState(
    items.map((item) => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
    }))
  );

  const totals = useMemo(() => {
    const subtotal = rows.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );

    const discount = rows.reduce(
      (sum, item) => sum + (Number(item.discount) || 0),
      0
    );

    const tax = rows.reduce(
      (sum, item) =>
        sum +
        Math.max(
          0,
          item.quantity * item.unit_price -
          (Number(item.discount) || 0)
        ) *
        ((Number(item.tax_rate) || 0) / 100),
      0
    );

    return {
      subtotal,
      discount,
      tax,
      total: subtotal - discount + tax,
    };
  }, [rows]);

  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: invoice.currency || "USD",
    }).format(Number(value) || 0);

  function updateItem(
    id: string,
    key: "description" | "quantity" | "unit_price",
    value: string
  ) {
    setRows((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
            ...item,
            [key]:
              key === "description"
                ? value
                : Math.max(0, Number(value) || 0),
          }
          : item
      )
    );
  }

  function numberToWords(amount: number, currency: string) {
    const absoluteAmount = Math.abs(Number(amount) || 0);
    const isKHR = currency === "KHR";

    const whole = isKHR
      ? Math.round(absoluteAmount)
      : Math.floor(absoluteAmount + 0.000001);

    const cents = isKHR
      ? 0
      : Math.round((absoluteAmount - whole) * 100);

    const ones = [
      "Zero", "One", "Two", "Three", "Four", "Five",
      "Six", "Seven", "Eight", "Nine", "Ten", "Eleven",
      "Twelve", "Thirteen", "Fourteen", "Fifteen",
      "Sixteen", "Seventeen", "Eighteen", "Nineteen",
    ];

    const tens = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty",
      "Sixty", "Seventy", "Eighty", "Ninety",
    ];

    function convert(value: number): string {
      if (value < 20) return ones[value];

      if (value < 100) {
        return (
          tens[Math.floor(value / 10)] +
          (value % 10 ? ` ${ones[value % 10]}` : "")
        );
      }

      if (value < 1000) {
        return (
          `${ones[Math.floor(value / 100)]} Hundred` +
          (value % 100 ? ` ${convert(value % 100)}` : "")
        );
      }

      if (value < 1_000_000) {
        return (
          `${convert(Math.floor(value / 1000))} Thousand` +
          (value % 1000 ? ` ${convert(value % 1000)}` : "")
        );
      }

      if (value < 1_000_000_000) {
        return (
          `${convert(Math.floor(value / 1_000_000))} Million` +
          (value % 1_000_000
            ? ` ${convert(value % 1_000_000)}`
            : "")
        );
      }

      return value.toLocaleString("en-US");
    }

    const currencyName =
      currency === "USD"
        ? "US Dollars"
        : currency === "KHR"
          ? "Riel"
          : currency;

    const words = convert(whole);

    return (
      `${amount < 0 ? "Minus " : ""}${words} ${currencyName}` +
      (cents ? ` and ${convert(cents)} Cents` : " Only")
    );
  }

  return (
    <>
      <div className="print-help">
        <div>
          <strong>Invoice design preview</strong>
          <span>
            {" "}Choose a design and edit highlighted fields before printing.
            Changes here are temporary.
          </span>
        </div>

        <div className="toolbar-actions">
          <select
            aria-label="Invoice design"
            value={design}
            onChange={(event) =>
              setDesign(event.target.value as Design)
            }
          >
            <option value="premium">A. Navy & Gold — Premium</option>
            <option value="corporate">B. White & Navy — Corporate</option>
          </select>

          <button type="button" onClick={() => window.print()}>
            Print A4
          </button>
        </div>
      </div>

      <article
        className={`invoice-paper ${design} ${printSettings.template === "minimal" ? "minimal" : ""
          }`}
        style={
          {
            ["--navy" as string]: printSettings.primary_color,
            ["--navy-deep" as string]: printSettings.primary_color,
            ["--gold" as string]: printSettings.accent_color,
            ["--gold-light" as string]: `${printSettings.accent_color}20`,
          } as React.CSSProperties
        }
      >
        <header className="invoice-header">
          <div className="company-heading">
            {printSettings.show_logo && company.logo_url && (
              <img
                className="company-logo"
                src={company.logo_url}
                alt="Company logo"
              />
            )}

            <div>
              <h1>{company.name}</h1>
              <p className="tagline">
                Pillows · Blankets · Sofa Cushions · Home Décor
              </p>

              {company.billing_address && (
                <p>{company.billing_address}</p>
              )}
              {company.phone && <p>Phone: {company.phone}</p>}
              {company.email && <p>{company.email}</p>}
              {company.website && <p>{company.website}</p>}

              {printSettings.show_tax_id && company.tax_id && (
                <p>Tax ID: {company.tax_id}</p>
              )}
            </div>
          </div>

          <div className="invoice-heading">
            <span>INVOICE</span>
            <small>{invoice.status.toUpperCase()}</small>
          </div>
        </header>

        <section className="info-grid">
          <div className="info-card">
            <h3>BILL TO</h3>

            <label>
              Customer name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>

            <label>
              Address
              <textarea
                rows={2}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            </label>

            <div className="contact-grid">
              <label>
                Phone
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>

              <label>
                Email
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="info-card">
            <h3>INVOICE DETAILS</h3>

            <label>
              Invoice No.
              <input
                value={number}
                onChange={(event) => setNumber(event.target.value)}
              />
            </label>

            <label>
              Invoice date
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>

            <label>
              Due date
              <input
                type="date"
                value={due}
                onChange={(event) => setDue(event.target.value)}
              />
            </label>
          </div>
        </section>

        <div className="table-wrapper">
          <table className="invoice-table">
            <thead>
              <tr>
                <th className="no">No.</th>
                <th>Description</th>
                <th className="qty">Quantity</th>
                <th className="price">Unit Price</th>
                <th className="amount">Amount</th>
              </tr>
            </thead>

            <tbody>
              {Array.from({
                length: Math.max(6, rows.length),
              }).map((_, index) => {
                const item = rows[index];

                return (
                  <tr key={item?.id ?? `blank-${index}`}>
                    <td className="center">{index + 1}</td>

                    <td>
                      {item && (
                        <input
                          aria-label={`Description ${index + 1}`}
                          className="table-input"
                          value={item.description}
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              "description",
                              event.target.value
                            )
                          }
                        />
                      )}
                    </td>

                    <td>
                      {item && (
                        <input
                          aria-label={`Quantity ${index + 1}`}
                          className="table-input center"
                          type="number"
                          min="0"
                          step="any"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              "quantity",
                              event.target.value
                            )
                          }
                        />
                      )}
                    </td>

                    <td>
                      {item && (
                        <input
                          aria-label={`Unit price ${index + 1}`}
                          className="table-input right"
                          type="number"
                          min="0"
                          step="any"
                          value={item.unit_price}
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              "unit_price",
                              event.target.value
                            )
                          }
                        />
                      )}
                    </td>

                    <td className="right">
                      {item
                        ? money(item.quantity * item.unit_price)
                        : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <section className="bottom-grid">
          <div className="payment">
            <h3>PAYMENT INFORMATION</h3>

            <div className="payment-content">
              {company.khqr_url ? (
                <img
                  className="khqr"
                  src={company.khqr_url}
                  alt="Company KHQR payment code"
                />
              ) : (
                <div className="qr-placeholder">KHQR</div>
              )}

              <div className="payment-details">
                <strong className="aba-label">ABA PAY / KHQR</strong>

                <div>
                  <small>Account name</small>
                  <strong>KHAM PICHCHANTHANY</strong>
                </div>

                <div>
                  <small>Payment via phone number</small>
                  <strong>089-985-679</strong>
                </div>

                <small>Scan to pay with your banking app.</small>
              </div>
            </div>
          </div>

          <div className="totals">
            <div>
              <span>Subtotal</span>
              <strong>{money(totals.subtotal)}</strong>
            </div>

            <div>
              <span>Discount</span>
              <strong>−{money(totals.discount)}</strong>
            </div>

            <div>
              <span>Tax</span>
              <strong>{money(totals.tax)}</strong>
            </div>

            <div className="grand">
              <span>GRAND TOTAL</span>
              <strong>{money(totals.total)}</strong>
            </div>
          </div>
        </section>

        <section className="notes-grid">
          <div className="note-box">
            <h3>NOTES & PAYMENT TERMS</h3>

            <p>
              1. Payment can be made when placing the order or upon receipt
              of the goods.
            </p>

            <p>
              2. Payment can be made by Bank Transfer / ABA / Cash.
            </p>

            <textarea
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Additional invoice notes..."
            />
          </div>

          <div className="amount-summary">
            <div className="note-box amount-box">
              <h3>AMOUNT DUE</h3>
              <p>{money(totals.total)}</p>
            </div>

            <div className="amount-words">
              <strong>AMOUNT IN WORDS</strong>
              <span>
                {numberToWords(totals.total, invoice.currency)}
              </span>
            </div>
          </div>
        </section>

        <section className="signatures">
          <div>
            <div className="sign-line" />
            <p>Customer / Receiver</p>
          </div>

          <div>
            <div className="sign-line">
              {printSettings.show_signature && company.signature_url && (
                <img
                  src={company.signature_url}
                  alt="Authorized signature"
                />
              )}

              {printSettings.show_stamp && company.stamp_url && (
                <img
                  className="stamp"
                  src={company.stamp_url}
                  alt="Company stamp"
                />
              )}
            </div>
            <p>Authorized Signature &amp; Stamp</p>
          </div>
        </section>

        <footer className="invoice-footer">
          <strong>{company.name}</strong>
          <span>
            {[
              company.phone,
              company.email,
              company.website,
            ]
              .filter(Boolean)
              .join("  •  ")}
          </span>
          <span>{company.billing_address}</span>
        </footer>
      </article>

      <style jsx global>{`
        .invoice-paper {
          --navy: #142b4a;
          --navy-deep: #0b1d33;
          --gold: #c5a45d;
          --gold-light: #f7f2e7;
          box-sizing: border-box;
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          padding: 30px;
          background: #fff;
          color: #253247;
          border: 1px solid #e2e8f0;
          box-shadow: 0 12px 35px rgba(15, 35, 60, 0.09);
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          line-height: 1.5;
        }

        .invoice-paper.corporate {
          --gold: #cbd9e8;
          --gold-light: #edf3fa;
          --navy: #173b65;
          --navy-deep: #102b49;
        }

        .invoice-paper.minimal {
          box-shadow: none;
          border: 1px solid #e2e8f0;
        }

        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          padding: 22px;
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
          gap: 16px;
          min-width: 0;
        }

        .company-logo {
          width: 82px;
          height: 82px;
          padding: 5px;
          flex-shrink: 0;
          object-fit: contain;
          background: white;
          border-radius: 6px;
        }

        .company-heading h1 {
          margin: 0 0 7px;
          font-size: 23px;
          line-height: 1.25;
          font-weight: 800;
          letter-spacing: 0.2px;
        }

        .company-heading p {
          margin: 3px 0;
          font-size: 10px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .tagline {
          margin-bottom: 8px !important;
          color: #e4c77f;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .corporate .tagline {
          color: var(--navy);
        }

        .invoice-heading {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 9px;
          color: #e4c77f;
          white-space: nowrap;
        }

        .corporate .invoice-heading {
          color: var(--navy);
        }

        .invoice-heading span {
          font-size: 36px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .invoice-heading small {
          padding: 5px 11px;
          border: 1px solid currentColor;
          border-radius: 3px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 16px;
          margin: 22px 0;
        }

        .info-card {
          min-width: 0;
          padding: 16px;
          border: 1px solid #e0e5eb;
          border-top: 3px solid var(--gold);
          border-radius: 5px;
          background: #fff;
        }

        .info-card h3,
        .payment h3,
        .note-box h3 {
          margin: 0 0 13px;
          color: var(--navy);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.1px;
        }

        .info-card label {
          display: block;
          margin: 9px 0;
          color: #64748b;
          font-size: 10px;
          font-weight: 600;
        }

        .info-card input,
        .info-card textarea,
        .note-box textarea {
          display: block;
          width: 100%;
          box-sizing: border-box;
          margin-top: 4px;
          padding: 7px 8px;
          border: 1px solid #e2e8f0;
          border-radius: 3px;
          background: #f8fafc;
          color: #172033;
          font: inherit;
          font-size: 11px;
          outline-color: var(--navy);
        }

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 11px;
        }

        .invoice-table th {
          padding: 11px 8px;
          background: var(--navy);
          color: white;
          border: 1px solid var(--navy);
          text-align: left;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }

        .corporate .invoice-table th {
          background: #eaf1f8;
          color: var(--navy);
          border-color: #cbd8e6;
        }

        .invoice-table td {
          height: 32px;
          padding: 8px;
          border: 1px solid #e1e7ef;
          overflow-wrap: anywhere;
        }

        .invoice-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        .invoice-table .no {
          width: 7%;
        }

        .invoice-table .qty {
          width: 15%;
        }

        .invoice-table .price,
        .invoice-table .amount {
          width: 19%;
        }

        .center {
          text-align: center;
        }

        .right {
          text-align: right;
        }

        .table-input {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 4px;
          border: 0;
          border-radius: 2px;
          background: transparent;
          color: #202938;
          font: inherit;
          outline-color: var(--navy);
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 22px;
          align-items: stretch;
        }

        .payment {
          min-width: 0;
          padding: 16px;
          border: 1px solid #e0e5eb;
          border-top: 3px solid var(--gold);
          border-radius: 5px;
        }

        .payment-content {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .khqr,
        .qr-placeholder {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 125px;
          height: 125px;
          padding: 5px;
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
          gap: 10px;
          min-width: 0;
          font-size: 11px;
          overflow-wrap: anywhere;
        }

        .payment-details div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .payment-details small {
          color: #64748b;
          font-size: 9px;
        }

        .aba-label {
          color: var(--navy);
          font-size: 12px;
          letter-spacing: 0.4px;
        }

        .totals {
          border: 1px solid #dce3eb;
          border-radius: 5px;
          overflow: hidden;
        }

        .totals > div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border-bottom: 1px solid #e8edf2;
          font-size: 11px;
        }

        .totals > div:last-child {
          border-bottom: 0;
        }

        .totals .grand {
          padding: 15px 14px;
          background: var(--navy);
          color: white;
          font-size: 14px;
          font-weight: 900;
        }

        .corporate .totals .grand {
          background: #eaf1f8;
          color: var(--navy);
        }

        .notes-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-top: 20px;
        }

        .note-box {
          min-width: 0;
          min-height: 90px;
          padding: 14px;
          border: 1px solid #e0e5eb;
          border-radius: 5px;
          background: #fff;
        }

        .note-box p {
          margin: 6px 0;
          font-size: 10px;
          line-height: 1.5;
        }

        .note-box textarea {
          margin-top: 9px;
        }

        .amount-box {
          border-top: 3px solid var(--gold);
          background: var(--gold-light);
        }

        .amount-box p {
          margin-top: 12px;
          color: var(--navy);
          font-size: 23px;
          font-weight: 900;
        }

        /* Amount in words */
        .amount-summary {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .amount-words {
          padding: 7px 9px;
          border: 1px solid #e0e5eb;
          border-left: 3px solid var(--gold);
          border-radius: 4px;
          background: #fafafa;
          font-size: 9px;
          line-height: 1.3;
        }

        .amount-words strong {
          display: block;
          margin-bottom: 3px;
          color: var(--navy);
          font-size: 8px;
          letter-spacing: 0.6px;
        }

        .amount-words span {
          display: block;
          color: #334155;
          overflow-wrap: anywhere;
        }

        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 35px;
          margin: 30px 0 22px;
          text-align: center;
          font-size: 10px;
          font-weight: 600;
        }

        .sign-line {
          display: flex;
          height: 75px;
          align-items: flex-end;
          justify-content: center;
          gap: 8px;
          border-bottom: 1px solid #94a3b8;
        }

        .sign-line img {
          max-width: 120px;
          max-height: 70px;
          object-fit: contain;
        }

        .sign-line img.stamp {
          max-width: 65px;
          max-height: 65px;
        }

        .signatures p {
          margin: 8px 0 0;
        }

        .invoice-footer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          margin: 0 -30px -30px;
          padding: 15px 20px;
          border-top: 3px solid var(--gold);
          background: var(--navy-deep);
          color: white;
          text-align: center;
          font-size: 9px;
          overflow-wrap: anywhere;
        }

        .corporate .invoice-footer {
          background: #edf3fa;
          color: var(--navy);
          border-top-color: var(--navy);
        }

        .invoice-footer strong {
          font-size: 11px;
        }

        .print-help {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          max-width: 900px;
          margin: 0 auto 14px;
          padding: 13px 15px;
          border: 1px solid #cbd5e1;
          border-radius: 7px;
          background: #f8fafc;
          color: #334155;
          font-size: 13px;
        }

        .print-help span {
          display: block;
          margin-top: 3px;
        }

        .toolbar-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .toolbar-actions select,
        .toolbar-actions button {
          min-height: 40px;
          padding: 9px 14px;
          border-radius: 5px;
          font-size: 12px;
          font-weight: 700;
        }

        .toolbar-actions select {
          border: 1px solid #cbd5e1;
          background: white;
          color: #172033;
        }

        .toolbar-actions button {
          border: 1px solid var(--navy);
          background: var(--navy);
          color: white;
          cursor: pointer;
        }

        .toolbar-actions button:hover {
          background: var(--navy-deep);
        }

        @media (max-width: 640px) {
          .invoice-paper {
            padding: 12px;
          }

          .invoice-header {
            padding: 12px;
            gap: 10px;
          }

          .company-heading {
            gap: 9px;
          }

          .company-logo {
            width: 48px;
            height: 48px;
          }

          .company-heading h1 {
            font-size: 16px;
          }

          .company-heading p {
            font-size: 8px;
          }

          .invoice-heading span {
            font-size: 22px;
          }

          .info-grid,
          .bottom-grid,
          .notes-grid {
            grid-template-columns: 1fr;
          }

          .table-wrapper {
            overflow-x: auto;
          }

          .invoice-table {
            min-width: 580px;
          }

          .invoice-footer {
            margin: 0 -12px -12px;
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          .invoice-paper,
          .invoice-paper * {
            visibility: visible !important;
          }

          .invoice-paper {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            max-width: none !important;
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 5mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            border: 0 !important;
            box-shadow: none !important;
            font-size: 12px !important;
            line-height: 1.25 !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .company-heading h1 {
            font-size: 22px !important;
          }

          .company-heading p {
            font-size: 10px !important;
          }

          .invoice-heading span {
            font-size: 30px !important;
          }

          .info-grid {
            margin: 8px 0 !important;
            gap: 8px !important;
          }

          .info-card {
            padding: 8px !important;
          }

          .info-card h3,
          .payment h3,
          .note-box h3 {
            margin-bottom: 7px !important;
            font-size: 11px !important;
          }

          .info-card label {
            margin: 5px 0 !important;
            font-size: 10px !important;
          }

          .info-card input,
          .info-card textarea,
          .note-box textarea,
          .table-input {
            padding: 2px !important;
            border: 0 !important;
            background: transparent !important;
            color: #000 !important;
            font-size: 11px !important;
            appearance: none;
            resize: none;
          }

          .invoice-table {
            font-size: 11px !important;
          }

          .invoice-table th {
            padding: 6px !important;
            font-size: 10px !important;
          }

          .invoice-table td {
            height: 23px !important;
            padding: 4px 6px !important;
          }

          .bottom-grid {
            margin-top: 8px !important;
            gap: 8px !important;
          }

          .payment {
            padding: 8px !important;
          }

          .payment-content {
            gap: 8px !important;
          }

          .khqr,
          .qr-placeholder {
            width: 85px !important;
            height: 85px !important;
          }

          .payment-details {
            gap: 6px !important;
            font-size: 10px !important;
          }

          .totals > div {
            padding: 7px 9px !important;
            font-size: 11px !important;
          }

          .totals .grand {
            padding: 9px !important;
            font-size: 13px !important;
          }

          .notes-grid {
            margin-top: 8px !important;
            gap: 8px !important;
          }

          .note-box {
            min-height: 0 !important;
            padding: 8px !important;
          }

          .note-box p {
            margin: 4px 0 !important;
            font-size: 10px !important;
          }

          .amount-box p {
            margin-top: 6px !important;
            font-size: 19px !important;
          }

          .amount-summary {
            gap: 3px !important;
          }

          .amount-words {
            padding: 4px 6px !important;
            font-size: 8px !important;
            line-height: 1.2 !important;
          }

          .amount-words strong {
            margin-bottom: 2px !important;
            font-size: 7px !important;
          }

          .signatures {
            margin: 10px 0 !important;
            gap: 15px !important;
            font-size: 10px !important;
          }

          .sign-line {
            height: 42px !important;
          }

          .sign-line img {
            max-height: 40px !important;
          }

          .sign-line img.stamp {
            max-height: 38px !important;
          }

          .invoice-footer {
            margin: 0 !important;
            padding: 8px !important;
            font-size: 9px !important;
          }

          .print-help,
          .invoice-toolbar,
          .toolbar-actions,
          button,
          select {
            display: none !important;
          }

          .invoice-header,
          .invoice-table th,
          .totals .grand,
          .invoice-footer,
          .amount-box {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}
