
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createInvoice } from "./actions";
import type { InvoiceProduct } from "./page";

type InvoiceItem = {
  key: number;
  productId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-[#142b4a] focus:ring-2 focus:ring-[#c5a45d]/25 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400";

const labelClass =
  "mb-1.5 block text-sm font-semibold text-[#142b4a] dark:text-slate-200";

const defaultNotes = "";

function todayString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

type InvoiceCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  billing_address: string | null;
};

export default function InvoiceForm({
  products,
  customers,
}: {
  products: InvoiceProduct[];
  customers: InvoiceCustomer[];
}) {
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    customers.length > 0 ? "existing" : "new"
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [issueDate, setIssueDate] = useState(todayString);
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState("4100");
  const [notes, setNotes] = useState(defaultNotes);

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      key: 1,
      productId: "",
      description: "",
      quantity: "1",
      unitPrice: "",
      discount: "0",
      taxRate: "0",
    },
  ]);

  const [nextKey, setNextKey] = useState(2);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      const price = Math.max(0, Number(item.unitPrice) || 0);
      return sum + quantity * price;
    }, 0);

    const itemDiscount = items.reduce((sum, item) => {
      const lineSubtotal =
        Math.max(0, Number(item.quantity) || 0) *
        Math.max(0, Number(item.unitPrice) || 0);
      return sum + Math.min(lineSubtotal, Math.max(0, Number(item.discount) || 0));
    }, 0);

    const tax = items.reduce((sum, item) => {
      const lineSubtotal =
        Math.max(0, Number(item.quantity) || 0) *
        Math.max(0, Number(item.unitPrice) || 0);
      const lineDiscount = Math.min(
        lineSubtotal,
        Math.max(0, Number(item.discount) || 0)
      );
      const rate = Math.max(0, Number(item.taxRate) || 0) / 100;
      return sum + Math.max(0, lineSubtotal - lineDiscount) * rate;
    }, 0);

    return {
      subtotal,
      discountTotal: itemDiscount,
      tax,
      grandTotal: Math.max(0, subtotal - itemDiscount) + tax,
    };
  }, [items]);

  function handleCustomerModeChange(mode: "existing" | "new") {
    setCustomerMode(mode);
    setSelectedCustomerId("");
    setCustomerName("");
    setPhone("");
    setEmail("");
    setBillingAddress("");
    setError("");
  }

  function handleExistingCustomerChange(customerId: string) {
    setSelectedCustomerId(customerId);
    const customer = customers.find((item) => item.id === customerId);
    setCustomerName(customer?.name ?? "");
    setPhone(customer?.phone ?? "");
    setEmail(customer?.email ?? "");
    setBillingAddress(customer?.billing_address ?? "");
    setError("");
  }

  function updateItem(
    key: number,
    field: keyof Omit<InvoiceItem, "key">,
    value: string
  ) {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, [field]: value } : item
      )
    );
  }

  function handleCurrencyChange(nextCurrency: string) {
    if (nextCurrency === currency) return;

    const rate = Number(exchangeRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      setError("Please enter a valid exchange rate greater than zero.");
      return;
    }

    // Convert all monetary values using the same KHR-per-USD rate.
    // Keep extra precision during conversion; totals will recalculate from these values.
    const convertAmount = (value: string) => {
      if (value.trim() === "") return value;

      const amount = Number(value);
      if (!Number.isFinite(amount)) return value;

      const converted =
        currency === "USD" && nextCurrency === "KHR"
          ? amount * rate
          : amount / rate;

      return String(Number(converted.toFixed(6)));
    };

    setItems((current) =>
      current.map((item) => ({
        ...item,
        unitPrice: convertAmount(item.unitPrice),
        discount: convertAmount(item.discount),
      }))
    );
    setCurrency(nextCurrency);
    setError("");
  }

  function selectProduct(key: number, productId: string) {
    const product = products.find((item) => item.id === productId);

    setItems((current) =>
      current.map((item) => {
        if (item.key !== key) return item;

        if (!product) {
          return {
            ...item,
            productId: "",
          };
        }

        return {
          ...item,
          productId: product.id,
          description: product.name,
          unitPrice: String(
            Number(
              (currency === "KHR"
                ? Number(product.selling_price) * Number(exchangeRate || 4100)
                : Number(product.selling_price)).toFixed(2)
            )
          ),
        };
      })
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        key: nextKey,
        productId: "",
        description: "",
        quantity: "1",
        unitPrice: "",
        discount: "0",
        taxRate: "0",
      },
    ]);

    setNextKey((key) => key + 1);
  }

  function removeItem(key: number) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (customerMode === "existing" && !selectedCustomerId) {
      setError("Please select an existing customer, or choose New customer.");
      return;
    }

    if (customerMode === "new" && !customerName.trim()) {
      setError("Please enter the new customer's name.");
      return;
    }

    if (!issueDate) {
      setError("Please select an issue date.");
      return;
    }

    if (dueDate && dueDate < issueDate) {
      setError("The due date cannot be earlier than the issue date.");
      return;
    }

    if (currency === "KHR") {
      const rate = Number(exchangeRate);

      if (!Number.isFinite(rate) || rate <= 0) {
        setError("Please enter a valid exchange rate greater than zero.");
        return;
      }
    }

    if (items.length === 0) {
      setError("Please add at least one invoice item.");
      return;
    }

    for (const item of items) {
      const quantity = Number(item.quantity);
      const price = Number(item.unitPrice);
      const discount = Number(item.discount);
      const taxRate = Number(item.taxRate);

      if (!item.description.trim()) {
        setError("Every invoice item needs a description.");
        return;
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        setError("Each item must have a quantity greater than zero.");
        return;
      }

      if (!Number.isFinite(price) || price < 0) {
        setError("Item prices must be zero or greater.");
        return;
      }

      if (
        !Number.isFinite(discount) ||
        discount < 0 ||
        discount > quantity * price
      ) {
        setError(
          "Each item discount must be between zero and its line subtotal."
        );
        return;
      }

      if (
        !Number.isFinite(taxRate) ||
        taxRate < 0 ||
        taxRate > 100
      ) {
        setError("Tax rates must be between 0 and 100 percent.");
        return;
      }

      if (
        item.productId &&
        !products.some((product) => product.id === item.productId)
      ) {
        setError("One of the selected products is no longer available.");
        return;
      }
    }

    const formData = new FormData();

    formData.set("customerMode", customerMode);
    formData.set("customerId", customerMode === "existing" ? selectedCustomerId : "");
    formData.set("customerName", customerName.trim());
    formData.set("phone", phone.trim());
    formData.set("email", email.trim());
    formData.set("billingAddress", billingAddress.trim());
    formData.set("issueDate", issueDate);
    formData.set("dueDate", dueDate);
    formData.set("currency", currency);
    formData.set(
      "exchangeRate",
      currency === "KHR" ? exchangeRate : "4100"
    );
    formData.set("notes", notes.trim());
    formData.set("invoiceDiscount", "0");

    formData.set(
      "items",
      JSON.stringify(
        items.map((item) => ({
          product_id: item.productId || null,
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unit_price: Number(item.unitPrice),
          discount: Number(item.discount) || 0,
          tax_rate: Number(item.taxRate) || 0,
        }))
      )
    );

    setSaving(true);

    try {
      const result = await createInvoice(formData);

      if (!result.success) {
        setError(result.message);
        return;
      }

      window.location.href = result.invoiceId
        ? `/protected/invoices/${result.invoiceId}`
        : "/protected/invoices";
    } catch (submitError) {
      console.error("Create invoice failed:", submitError);
      setError(
        "Something went wrong while saving the invoice. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/protected/invoices"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to invoices
          </Link>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#c5a45d]">
            Create Invoice
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Select catalog products or enter a custom service, then add
            customer details.
          </p>
        </div>

        <span className="rounded-full bg-gray-100 dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-slate-200">
          Draft invoice
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <section className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm sm:p-6">
          <h2 className="border-l-4 border-[#c5a45d] pl-3 text-lg font-bold text-[#142b4a] dark:text-white">
            1. Invoice information
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="invoiceNumber">
                Invoice number *
              </label>
              <input
                id="invoiceNumber"
                className={`${inputClass} cursor-not-allowed bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300`}
                value=""
                placeholder="Generated automatically (e.g. INV-A-0001)"
                readOnly
                aria-readonly="true"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                Assigned automatically when you save this invoice.
              </p>
            </div>

            <div>
              <label className={labelClass} htmlFor="currency">
                Currency *
              </label>
              <select
                id="currency"
                className={inputClass}
                value={currency}
                onChange={(event) => handleCurrencyChange(event.target.value)}
              >
                <option value="USD">USD — US Dollar</option>
                <option value="KHR">KHR — Cambodian Riel</option>
              </select>
            </div>

            {currency === "KHR" && (
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="exchangeRate">
                  Exchange rate (KHR per 1 USD) *
                </label>
                <input
                  id="exchangeRate"
                  type="number"
                  min="0.000001"
                  step="any"
                  className={inputClass}
                  value={exchangeRate}
                  onChange={(event) =>
                    setExchangeRate(event.target.value)
                  }
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Default: 4,100 KHR = 1 USD. This rate is saved with the
                  invoice.
                </p>
              </div>
            )}

            <div>
              <label className={labelClass} htmlFor="issueDate">
                Issue date *
              </label>
              <input
                id="issueDate"
                type="date"
                className={inputClass}
                value={issueDate}
                onChange={(event) => setIssueDate(event.target.value)}
                required
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="dueDate">
                Due date
              </label>
              <input
                id="dueDate"
                type="date"
                className={inputClass}
                value={dueDate}
                min={issueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm sm:p-6">
          <h2 className="border-l-4 border-[#c5a45d] pl-3 text-lg font-bold text-[#142b4a] dark:text-white">
            2. Customer information
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Choose a saved customer or enter a new customer for this invoice.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className={labelClass}>Customer option *</span>
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                  <input
                    type="radio"
                    name="customerMode"
                    checked={customerMode === "existing"}
                    onChange={() => handleCustomerModeChange("existing")}
                    disabled={customers.length === 0}
                  />
                  Select existing customer
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                  <input
                    type="radio"
                    name="customerMode"
                    checked={customerMode === "new"}
                    onChange={() => handleCustomerModeChange("new")}
                  />
                  Add new customer
                </label>
              </div>
            </div>

            {customerMode === "existing" ? (
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="selectedCustomerId">
                  Customer or company name *
                </label>
                <select
                  id="selectedCustomerId"
                  className={inputClass}
                  value={selectedCustomerId}
                  onChange={(event) => handleExistingCustomerChange(event.target.value)}
                  required
                >
                  <option value="">Choose an existing customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {customers.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    No saved customers yet. Choose Add new customer.
                  </p>
                )}
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="customerName">
                  New customer or company name *
                </label>
                <input
                  id="customerName"
                  className={inputClass}
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Enter customer or company name"
                  required
                />
              </div>
            )}

            <div>
              <label className={labelClass} htmlFor="phone">
                Phone number
              </label>
              <input
                id="phone"
                className={inputClass}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                readOnly={customerMode === "existing"}
                placeholder="+855 ..."
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className={inputClass}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                readOnly={customerMode === "existing"}
                placeholder="customer@example.com"
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="billingAddress">
                Billing address
              </label>
              <textarea
                id="billingAddress"
                className={inputClass}
                rows={2}
                value={billingAddress}
                onChange={(event) => setBillingAddress(event.target.value)}
                readOnly={customerMode === "existing"}
                placeholder="Street, city, country"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="border-l-4 border-[#c5a45d] pl-3 text-lg font-bold text-[#142b4a] dark:text-white">
                3. Invoice items
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Choose a saved product to fill its description and selling
                price automatically, or enter a custom service.
              </p>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="rounded-lg border border-[#c5a45d] bg-[#f7f2e7] px-4 py-2 text-sm font-semibold text-[#142b4a] transition hover:bg-[#eee4cf] dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              + Add item
            </button>
          </div>

          {products.length === 0 && (
            <p className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-800 dark:text-amber-200">
              No active catalog products were found. You can still enter
              custom items, or add products on the Products page.
            </p>
          )}

          <div className="mt-5 space-y-4">
            {items.map((item, index) => {
              const quantity = Math.max(0, Number(item.quantity) || 0);
              const price = Math.max(0, Number(item.unitPrice) || 0);
              const lineSubtotal = quantity * price;

              const discount = Math.min(
                lineSubtotal,
                Math.max(0, Number(item.discount) || 0)
              );

              const taxRate = Math.max(0, Number(item.taxRate) || 0);

              const lineTotal =
                (lineSubtotal - discount) * (1 + taxRate / 100);

              return (
                <div
                  key={item.key}
                  className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                      Item {index + 1}
                    </h3>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div>
                    <label
                      className={labelClass}
                      htmlFor={`product-${item.key}`}
                    >
                      Select catalog product
                    </label>
                    <select
                      id={`product-${item.key}`}
                      className={inputClass}
                      value={item.productId}
                      onChange={(event) =>
                        selectProduct(item.key, event.target.value)
                      }
                    >
                      <option value="">
                        Custom item / service — enter manually
                      </option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                          {product.sku ? ` (${product.sku})` : ""}
                          {" — "}
                          {money(
                            currency === "KHR"
                              ? Number(product.selling_price) * Number(exchangeRate || 4100)
                              : Number(product.selling_price),
                            currency
                          )}
                          {product.unit ? ` / ${product.unit}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4">
                    <label
                      className={labelClass}
                      htmlFor={`description-${item.key}`}
                    >
                      Description *
                    </label>
                    <input
                      id={`description-${item.key}`}
                      className={inputClass}
                      value={item.description}
                      onChange={(event) =>
                        updateItem(
                          item.key,
                          "description",
                          event.target.value
                        )
                      }
                      placeholder="Product or service description"
                      required
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <label
                        className={labelClass}
                        htmlFor={`quantity-${item.key}`}
                      >
                        Quantity *
                      </label>
                      <input
                        id={`quantity-${item.key}`}
                        type="number"
                        min="0.001"
                        step="any"
                        className={inputClass}
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(
                            item.key,
                            "quantity",
                            event.target.value
                          )
                        }
                        required
                      />
                    </div>

                    <div>
                      <label
                        className={labelClass}
                        htmlFor={`price-${item.key}`}
                      >
                        Unit price *
                      </label>
                      <input
                        id={`price-${item.key}`}
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputClass}
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateItem(
                            item.key,
                            "unitPrice",
                            event.target.value
                          )
                        }
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <label
                        className={labelClass}
                        htmlFor={`discount-${item.key}`}
                      >
                        Discount amount
                      </label>
                      <input
                        id={`discount-${item.key}`}
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputClass}
                        value={item.discount}
                        onChange={(event) =>
                          updateItem(
                            item.key,
                            "discount",
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <div>
                      <label
                        className={labelClass}
                        htmlFor={`tax-${item.key}`}
                      >
                        Tax rate (%)
                      </label>
                      <input
                        id={`tax-${item.key}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className={inputClass}
                        value={item.taxRate}
                        onChange={(event) =>
                          updateItem(
                            item.key,
                            "taxRate",
                            event.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end border-t border-gray-200 dark:border-slate-700 pt-3">
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                      Line total:{" "}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {money(lineTotal, currency)}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>


        </section>

        <section className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm sm:p-6">
          <h2 className="border-l-4 border-[#c5a45d] pl-3 text-lg font-bold text-[#142b4a] dark:text-white">
            4. Notes and totals
          </h2>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="notes">
                Additional notes
              </label>
              <textarea
                id="notes"
                rows={5}
                className={inputClass}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Enter any additional invoice notes..."
              />
            </div>

            <div className="rounded-lg bg-gray-50 dark:bg-slate-800 p-4">
              <div className="flex justify-between gap-4 py-2 text-sm">
                <span className="text-gray-600 dark:text-slate-300">Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {money(totals.subtotal, currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4 py-2 text-sm">
                <span className="text-gray-600 dark:text-slate-300">Discounts</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  −{money(totals.discountTotal, currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4 py-2 text-sm">
                <span className="text-gray-600 dark:text-slate-300">Tax</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {money(totals.tax, currency)}
                </span>
              </div>

              <div className="mt-2 flex justify-between gap-4 border-t border-gray-200 dark:border-slate-700 pt-4">
                <span className="font-semibold text-gray-900 dark:text-white">
                  Grand total
                </span>
                <span className="text-xl font-bold text-[#142b4a] dark:text-amber-300">
                  {money(totals.grandTotal, currency)}
                </span>
              </div>

              <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
                Totals are calculated from quantities, prices, discounts,
                and tax rates.
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/protected/invoices"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-slate-600 px-5 py-3 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-800"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg bg-[#142b4a] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b1d33] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving invoice..." : "Save Invoice"}
          </button>
        </div>
      </form>
    </main>
  );
}
