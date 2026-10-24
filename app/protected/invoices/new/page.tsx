
"use client";

import { createInvoice } from "./actions";
import { useState } from "react";
import Link from "next/link";

export default function NewInvoicePage() {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const result = await createInvoice(formData);

    alert(result.message);

    if (result.success) {
      setInvoiceNumber("");
      setCustomerName("");
      setAmount("");
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link
        href="/protected"
        className="text-blue-500 hover:underline"
      >
        ← Back to dashboard
      </Link>

      <h1 className="mt-6 text-3xl font-bold">
        Create Invoice
      </h1>

      <p className="mt-2 text-gray-500">
        Enter your invoice details below.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5 rounded-xl border p-6"
      >
        <div>
          <label className="mb-2 block font-medium">
            Invoice Number
          </label>
          <input
            name="invoiceNumber"
            required
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="INV-0001"
            className="w-full rounded-md border p-3 text-black"
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Customer Name
          </label>
          <input
            name="customerName"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name"
            className="w-full rounded-md border p-3 text-black"
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Amount
          </label>
          <input
            name="amount"
            required
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-md border p-3 text-black"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700"
        >
          Create Invoice
        </button>
      </form>
    </main>
  );
}
