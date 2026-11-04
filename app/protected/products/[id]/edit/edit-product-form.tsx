
"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { updateProduct } from "../../actions";

type Product = {
    id: string;
    name: string;
    sku: string;
    description: string;
    unit: string;
    selling_price: number;
    image_url: string | null;
};

type FormState = {
    success: boolean;
    message: string;
};

const initialState: FormState = {
    success: false,
    message: "",
};

const units = [
    { value: "piece", label: "Piece" },
    { value: "set", label: "Set" },
    { value: "box", label: "Box" },
    { value: "pack", label: "Pack" },
    { value: "kg", label: "Kilogram (kg)" },
    { value: "g", label: "Gram (g)" },
    { value: "liter", label: "Liter (L)" },
    { value: "meter", label: "Meter (m)" },
    { value: "hour", label: "Hour" },
    { value: "service", label: "Service" },
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

export default function EditProductForm({
    product,
}: {
    product: Product;
}) {
    const [state, formAction, isPending] = useActionState(
        async (
            _previousState: FormState,
            formData: FormData
        ): Promise<FormState> => {
            const result = await updateProduct(formData);

            return {
                success: result.success,
                message: result.message,
            };
        },
        initialState,
    );

    const [imagePreview, setImagePreview] = useState<string | null>(
        product.image_url
    );
    const [imageError, setImageError] = useState("");

    useEffect(() => {
        return () => {
            if (imagePreview?.startsWith("blob:")) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    function handleImageChange(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[0];

        setImageError("");

        if (!file) {
            return;
        }

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            event.target.value = "";
            setImageError("Please select a JPG, PNG, or WebP image.");
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            event.target.value = "";
            setImageError("Image size must not exceed 5 MB.");
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);
    }

    return (
        <form
            action={formAction}
            className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
            <input type="hidden" name="productId" value={product.id} />

            {/* Product image */}
            <div>
                <label className="mb-3 block text-sm font-medium text-gray-700">
                    Product Image
                </label>

                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                        {imagePreview ? (
                            <img
                                src={imagePreview}
                                alt={`${product.name} preview`}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="36"
                                height="36"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-gray-400"
                                aria-hidden="true"
                            >
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <path d="m21 15-5-5L5 21" />
                            </svg>
                        )}
                    </div>

                    <div className="flex-1">
                        <input
                            type="file"
                            name="image"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageChange}
                            disabled={isPending || state.success}
                            className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2.5 file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                        />

                        <p className="mt-2 text-xs leading-5 text-gray-500">
                            Select a new image to replace the current one.
                            Supported formats: JPG, PNG, WebP. Maximum size: 5 MB.
                        </p>

                        {imageError && (
                            <p className="mt-2 text-sm text-red-600">
                                {imageError}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Product name */}
            <div>
                <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-gray-700"
                >
                    Product Name *
                </label>

                <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    maxLength={200}
                    defaultValue={product.name}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
            </div>

            {/* SKU */}
            <div>
                <label
                    htmlFor="sku"
                    className="mb-2 block text-sm font-medium text-gray-700"
                >
                    SKU / Product Code
                </label>

                <input
                    id="sku"
                    name="sku"
                    type="text"
                    maxLength={100}
                    defaultValue={product.sku}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
            </div>

            {/* Description */}
            <div>
                <label
                    htmlFor="description"
                    className="mb-2 block text-sm font-medium text-gray-700"
                >
                    Description
                </label>

                <textarea
                    id="description"
                    name="description"
                    rows={3}
                    maxLength={2000}
                    defaultValue={product.description}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
            </div>

            {/* Unit and selling price */}
            <div className="grid gap-6 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="unit"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Unit *
                    </label>

                    <select
                        id="unit"
                        name="unit"
                        required
                        defaultValue={product.unit}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                    >
                        {units.map((unit) => (
                            <option key={unit.value} value={unit.value}>
                                {unit.label}
                            </option>
                        ))}

                        {!units.some((unit) => unit.value === product.unit) && (
                            <option value={product.unit}>
                                {product.unit}
                            </option>
                        )}
                    </select>
                </div>

                <div>
                    <label
                        htmlFor="sellingPrice"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Selling Price (USD) *
                    </label>

                    <div className="relative">
                        <span className="absolute left-4 top-3 text-gray-500">
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
                            defaultValue={product.selling_price.toFixed(2)}
                            className="w-full rounded-lg border border-gray-300 py-3 pl-8 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                </div>
            </div>

            {/* Save feedback */}
            {state.message && (
                <div
                    role="status"
                    className={`rounded-lg p-4 text-sm ${state.success
                            ? "bg-green-50 text-green-800"
                            : "bg-red-50 text-red-700"
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

            {/* Form buttons */}
            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                <Link
                    href="/protected/products"
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </Link>

                <button
                    type="submit"
                    disabled={isPending || state.success || !!imageError}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isPending ? "Saving Changes..." : "Save Changes"}
                </button>
            </div>
        </form>
    );
}
