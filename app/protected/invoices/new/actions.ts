
"use server";

import { createClient } from "@/lib/supabase/server";

type SubmittedItem = {
  product_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
};

type SavedItem = {
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  line_total: number;
  sort_order: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(message: string) {
  return { success: false as const, message };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function createInvoice(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return fail("Please sign in before creating an invoice.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("company_members")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return fail("You do not have permission to create invoices.");
  }

  const customerMode = String(formData.get("customerMode") ?? "new").trim();
  const customerId = String(formData.get("customerId") ?? "").trim();
  const customerName = String(formData.get("customerName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const billingAddress = String(
    formData.get("billingAddress") ?? ""
  ).trim();

  const issueDate = String(formData.get("issueDate") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const rawInvoiceDiscount = String(
    formData.get("invoiceDiscount") ?? "0"
  ).trim();

  const rawExchangeRate = String(
    formData.get("exchangeRate") ?? "4100"
  ).trim();

  const invoiceDiscount = Number(rawInvoiceDiscount);
  const exchangeRate = Number(rawExchangeRate);

  if (!["existing", "new"].includes(customerMode)) {
    return fail("Please choose an existing customer or add a new customer.");
  }

  if (customerMode === "existing" && !UUID_PATTERN.test(customerId)) {
    return fail("Please select an existing customer.");
  }

  if (customerMode === "new" && (!customerName || customerName.length > 200)) {
    return fail("Please enter a valid new customer name.");
  }

  if (!["USD", "KHR"].includes(currency)) {
    return fail("Please select USD or KHR as the invoice currency.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) {
    return fail("Please enter a valid issue date.");
  }

  const validDate = (value: string) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  };

  if (!validDate(issueDate)) {
    return fail("Please enter a valid issue date.");
  }

  if (dueDate && (!validDate(dueDate) || dueDate < issueDate)) {
    return fail("The due date must be valid and cannot precede the issue date.");
  }

  if (
    !Number.isFinite(invoiceDiscount) ||
    invoiceDiscount < 0 ||
    !Number.isFinite(exchangeRate) ||
    exchangeRate <= 0 ||
    exchangeRate > 1_000_000
  ) {
    return fail("Please enter a valid discount and exchange rate.");
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail("Please enter a valid email address.");
  }

  let submittedItems: SubmittedItem[];

  try {
    const rawItems = formData.get("items");

    if (typeof rawItems !== "string") {
      return fail("Invoice items are missing.");
    }

    const parsed: unknown = JSON.parse(rawItems);

    if (
      !Array.isArray(parsed) ||
      parsed.length < 1 ||
      parsed.length > 100
    ) {
      return fail("An invoice must contain between 1 and 100 items.");
    }

    submittedItems = parsed.map((raw: unknown) => {
      if (!raw || typeof raw !== "object") {
        throw new Error("Invalid invoice item.");
      }

      const item = raw as Record<string, unknown>;

      const productId =
        item.product_id == null || item.product_id === ""
          ? null
          : String(item.product_id);

      const description = String(item.description ?? "").trim();
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);
      const discount = Number(item.discount ?? 0);
      const taxRate = Number(item.tax_rate ?? 0);

      if (
        productId !== null &&
        !UUID_PATTERN.test(productId)
      ) {
        throw new Error("A selected product ID is invalid.");
      }

      if (!description || description.length > 2000) {
        throw new Error("Every item needs a valid description.");
      }

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        quantity > 1_000_000
      ) {
        throw new Error("Item quantities must be greater than zero.");
      }

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0 ||
        unitPrice > 1_000_000_000
      ) {
        throw new Error("Item prices must be valid and non-negative.");
      }

      if (
        !Number.isFinite(discount) ||
        discount < 0 ||
        discount > quantity * unitPrice
      ) {
        throw new Error("An item discount cannot exceed its line subtotal.");
      }

      if (
        !Number.isFinite(taxRate) ||
        taxRate < 0 ||
        taxRate > 100
      ) {
        throw new Error("Tax rates must be between 0 and 100 percent.");
      }

      return {
        product_id: productId,
        description,
        quantity,
        unit_price: unitPrice,
        discount,
        tax_rate: taxRate,
      };
    });
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : "Invoice items contain invalid data."
    );
  }

  // Confirm that referenced products exist and are active.
  const productIds = [
    ...new Set(
      submittedItems
        .map((item) => item.product_id)
        .filter((id): id is string => id !== null)
    ),
  ];

  if (productIds.length > 0) {
    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id, is_active")
      .in("id", productIds);

    if (productError) {
      return fail(`Could not validate products: ${productError.message}`);
    }

    const productMap = new Map(
      (products ?? []).map((product) => [product.id, product])
    );

    for (const productId of productIds) {
      const product = productMap.get(productId);

      if (!product) {
        return fail("A selected product does not exist or is inaccessible.");
      }

      if (!product.is_active) {
        return fail("One of the selected products is inactive. Please choose an active product.");
      }
    }
  }

  // Recalculate all totals on the server.
  const savedItems: SavedItem[] = submittedItems.map((item, index) => {
    const lineSubtotal = item.quantity * item.unit_price;
    const lineAfterDiscount = lineSubtotal - item.discount;

    return {
      product_id: item.product_id ?? null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: roundMoney(item.discount),
      tax_rate: item.tax_rate,
      line_total: roundMoney(
        lineAfterDiscount * (1 + item.tax_rate / 100)
      ),
      sort_order: index,
    };
  });

  const subtotal = roundMoney(
    submittedItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    )
  );

  const itemDiscount = roundMoney(
    submittedItems.reduce((sum, item) => sum + item.discount, 0)
  );

  const availableForInvoiceDiscount = Math.max(
    0,
    subtotal - itemDiscount
  );

  if (invoiceDiscount > availableForInvoiceDiscount) {
    return fail(
      "The invoice discount cannot exceed the subtotal after item discounts."
    );
  }

  const effectiveInvoiceDiscount = roundMoney(invoiceDiscount);
  const discountTotal = roundMoney(
    itemDiscount + effectiveInvoiceDiscount
  );

  const taxableBase = Math.max(
    0,
    subtotal - discountTotal
  );

  const taxBeforeInvoiceDiscount = submittedItems.reduce(
    (sum, item) => {
      const lineSubtotal = item.quantity * item.unit_price;
      const lineAfterDiscount = lineSubtotal - item.discount;

      return sum + lineAfterDiscount * (item.tax_rate / 100);
    },
    0
  );

  const preInvoiceDiscountBase = Math.max(
    0,
    subtotal - itemDiscount
  );

  const invoiceDiscountRatio =
    preInvoiceDiscountBase > 0
      ? effectiveInvoiceDiscount / preInvoiceDiscountBase
      : 0;

  const taxTotal = roundMoney(
    taxBeforeInvoiceDiscount * (1 - invoiceDiscountRatio)
  );

  const grandTotal = roundMoney(taxableBase + taxTotal);

  // Existing customers are selected by ID. New customers are created explicitly.
  let customer: { id: string } | null = null;

  if (customerMode === "existing") {
    const { data: existingCustomer, error: existingCustomerError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .maybeSingle();

    if (existingCustomerError || !existingCustomer) {
      return fail("The selected customer could not be found. Please select again.");
    }

    customer = existingCustomer;
  } else {
    const { data: newCustomer, error: newCustomerError } = await supabase
      .from("customers")
      .insert({
        name: customerName,
        phone: phone || null,
        email: email || null,
        billing_address: billingAddress || null,
      })
      .select("id")
      .single();

    if (newCustomerError || !newCustomer) {
      return fail(
        `Could not create customer: ${newCustomerError?.message ?? "Unknown error"}`
      );
    }

    customer = newCustomer;
  }

  // Generate the invoice number in PostgreSQL so concurrent users cannot
  // receive the same sequence number. The database function is created by
  // the SQL migration supplied with this change.
  const { data: invoiceNumber, error: numberError } = await supabase.rpc(
    "next_invoice_number"
  );

  if (numberError || typeof invoiceNumber !== "string" || !invoiceNumber) {
    console.error("Invoice number generation failed:", numberError);
    return fail(
      "Could not generate an invoice number. Please run the invoice-number SQL setup and try again."
    );
  }

  // Create the invoice header with the database-generated number.
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      customer_id: customer.id,
      status: "draft",
      issue_date: issueDate,
      due_date: dueDate || null,
      currency,
      exchange_rate: exchangeRate,
      subtotal,
      discount_total: discountTotal,
      tax_total: taxTotal,
      grand_total: grandTotal,
      notes: notes || null,
      billing_address: billingAddress || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (invoiceError || !invoice) {
    return fail(
      `Could not save invoice: ${invoiceError?.message ?? "Invoice ID was not returned."
      }`
    );
  }

  // Insert every item. If insertion fails, attempt to remove the
  // invoice header to avoid leaving an empty draft invoice.
  const itemsWithInvoiceId = savedItems.map((item) => ({
    ...item,
    invoice_id: invoice.id,
  }));

  const { error: itemsError } = await supabase
    .from("invoice_items")
    .insert(itemsWithInvoiceId);

  if (itemsError) {
    console.error("Invoice items insert failed:", itemsError);

    const { error: cleanupError } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoice.id);

    if (cleanupError) {
      console.error("Invoice cleanup failed:", cleanupError);
    }

    return fail(
      "Could not save invoice items. No invoice should be left behind; if the cleanup failed, please check the draft invoice before retrying."
    );
  }

  return {
    success: true as const,
    message: "Invoice and items created successfully!",
    invoiceId: invoice.id,
  };
}
