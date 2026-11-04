
"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { createProduct } from "../actions";

type FormState = {
    success: boolean;
    message: string;
};

const initialState: FormState = {
    success: false,
    message: "",
};

export default function NewProductPage() {
    const [state, formAction, isPending] = useActionState(
        async (previousState: FormState, formData: FormData) => {
            const result = await createProduct(formData);

            return {
                success: result.success,
                message: result.message,
            };
        },
        initialState
    );

    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageError, setImageError] = useState("");

    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const inputClass =
        "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-500 dark:focus:ring-blue-500/20";

    const labelClass =
        "mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200";

    return (
        <main className="mx-auto max-w-3xl px-6 py-10">
            <div className="mb-8">
                <Link
                    href="/protected/products"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    ← Back to Products
                </Link>

                <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
                    Add Product
                </h1>

                <p className="mt-2 text-gray-500 dark:text-slate-400">
                    Add a product to your catalog for use on future invoices.
                </p>
            </div>

            <form
                action={formAction}
                className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
                <div>
                    <label htmlFor="name" className={labelClass}>
                        Product Name <span className="text-red-600">*</span>
                    </label>

                    <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        maxLength={200}
                        placeholder="e.g. Office Chair"
                        className={inputClass}
                    />
                </div>

                <div>
                    <label htmlFor="sku" className={labelClass}>
                        SKU / Product Code
                    </label>

                    <input
                        id="sku"
                        name="sku"
                        type="text"
                        maxLength={100}
                        placeholder="e.g. CHAIR-001 (optional)"
                        className={inputClass}
                    />

                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        Leave blank if you do not use product codes. Each non-empty SKU
                        must be unique.
                    </p>
                </div>

                <div>
                    <label htmlFor="description" className={labelClass}>
                        Description
                    </label>

                    <textarea
                        id="description"
                        name="description"
                        rows={3}
                        maxLength={2000}
                        placeholder="Optional product details"
                        className={inputClass}
                    />
                </div>

                {/* Product Image */}
                <div>
                    <label htmlFor="productImage" className={labelClass}>
                        Product Image
                    </label>

                    <input
                        id="productImage"
                        name="image"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={isPending || state.success}
                        onChange={(event) => {
                            const file = event.target.files?.[0];

                            setImageError("");
                            setImagePreview(null);

                            if (!file) return;

                            const allowedTypes = [
                                "image/jpeg",
                                "image/png",
                                "image/webp",
                            ];

                            if (!allowedTypes.includes(file.type)) {
                                setImageError(
                                    "Please select a JPG, PNG, or WebP image."
                                );
                                event.target.value = "";
                                return;
                            }

                            if (file.size > 5 * 1024 * 1024) {
                                setImageError(
                                    "Image size must not exceed 5 MB."
                                );
                                event.target.value = "";
                                return;
                            }

                            setImagePreview(URL.createObjectURL(file));
                        }}
                        className="block w-full cursor-pointer text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-700 hover:file:bg-blue-100 dark:text-slate-300 dark:file:bg-blue-950 dark:file:text-blue-300 dark:hover:file:bg-blue-900"
                    />

                    <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                        JPG, PNG, or WebP. Maximum file size: 5 MB.
                    </p>

                    {imageError && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                            {imageError}
                        </p>
                    )}

                    {imagePreview && (
                        <div className="mt-4">
                            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">
                                Image Preview
                            </p>

                            <img
                                src={imagePreview}
                                alt="Product preview"
                                className="h-40 w-40 rounded-lg border border-gray-200 bg-gray-50 object-cover dark:border-slate-700 dark:bg-slate-800"
                            />
                        </div>
                    )}
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                        <label htmlFor="unit" className={labelClass}>
                            Unit <span className="text-red-600">*</span>
                        </label>

                        <select
                            id="unit"
                            name="unit"
                            required
                            defaultValue="piece"
                            className={inputClass}
                        >
                            <option value="piece">Piece</option>
                            <option value="set">Set</option>
                            <option value="box">Box</option>
                            <option value="pack">Pack</option>
                            <option value="kg">Kilogram (kg)</option>
                            <option value="g">Gram (g)</option>
                            <option value="liter">Liter (L)</option>
                            <option value="meter">Meter (m)</option>
                            <option value="hour">Hour</option>
                            <option value="service">Service</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="sellingPrice" className={labelClass}>
                            Selling Price (USD) <span className="text-red-600">*</span>
                        </label>

                        <div className="relative">
                            <span className="absolute left-4 top-3 text-gray-500 dark:text-slate-400">
                                $
                            </span>

                            <input
                                id="sellingPrice"
                                name="sellingPrice"
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                placeholder="0.00"
                                className={`${inputClass} pl-8`}
                            />
                        </div>

                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                            Enter the catalog price in USD. The invoice exchange rate will
                            be handled separately.
                        </p>
                    </div>
                </div>

                {state.message && (
                    <div
                        role="status"
                        className={`rounded-lg border p-4 text-sm ${state.success
                                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
                                : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                            }`}
                    >
                        {state.message}

                        {state.success && (
                            <div className="mt-3">
                                <Link
                                    href="/protected/products"
                                    className="font-semibold underline"
                                >
                                    Return to Products
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 dark:border-slate-700 sm:flex-row sm:justify-end">
                    <Link
                        href="/protected/products"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        Cancel
                    </Link>

                    <button
                        type="submit"
                        disabled={isPending || state.success || !!imageError}
                        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isPending ? "Saving Product..." : "Save Product"}
                    </button>
                </div>
            </form>
        </main>
    );
}
