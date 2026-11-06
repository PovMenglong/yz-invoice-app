
"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
    updateProduct,
    setPrimaryProductImage,
    deleteProductImage,
} from "../../actions";

type ProductImage = {
    id: string;
    image_path: string;
    image_url: string;
    is_primary: boolean;
};

type Product = {
    id: string;
    name: string;
    sku: string;
    description: string;
    unit: string;
    selling_price: number;
    images: ProductImage[];
};

type FormState = {
    success: boolean;
    message: string;
};

type ImagePreview = {
    file: File;
    url: string;
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
        initialState
    );

    const [images, setImages] = useState(product.images);
    const [newImages, setNewImages] = useState<ImagePreview[]>([]);
    const [imageError, setImageError] = useState("");
    const [galleryMessage, setGalleryMessage] = useState("");
    const [galleryError, setGalleryError] = useState("");
    const [isGalleryPending, startGalleryTransition] = useTransition();

    useEffect(() => {
        return () => {
            newImages.forEach((image) => {
                URL.revokeObjectURL(image.url);
            });
        };
    }, [newImages]);

    function handleImagesChange(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        const files = Array.from(event.target.files ?? []);

        setImageError("");

        if (files.length === 0) {
            setNewImages([]);
            return;
        }

        const invalidFile = files.find(
            (file) => !ALLOWED_IMAGE_TYPES.includes(file.type)
        );

        if (invalidFile) {
            event.target.value = "";
            setNewImages([]);
            setImageError(
                "Please select only JPG, PNG, or WebP images."
            );
            return;
        }

        const oversizedFile = files.find(
            (file) => file.size > MAX_IMAGE_SIZE
        );

        if (oversizedFile) {
            event.target.value = "";
            setNewImages([]);
            setImageError(
                `"${oversizedFile.name}" exceeds the 5 MB image limit.`
            );
            return;
        }

        setNewImages(
            files.map((file) => ({
                file,
                url: URL.createObjectURL(file),
            }))
        );
    }

    function handleSetPrimary(imageId: string) {
        if (isGalleryPending || isPending) return;

        const confirmed = window.confirm(
            "Set this image as the primary product image?"
        );

        if (!confirmed) return;

        setGalleryMessage("");
        setGalleryError("");

        startGalleryTransition(async () => {
            const result = await setPrimaryProductImage(
                product.id,
                imageId
            );

            if (!result.success) {
                setGalleryError(result.message);
                return;
            }

            setImages((current) =>
                current.map((image) => ({
                    ...image,
                    is_primary: image.id === imageId,
                }))
            );

            setGalleryMessage(result.message);
        });
    }

    function handleDeleteImage(image: ProductImage) {
        if (isGalleryPending || isPending) return;

        const confirmed = window.confirm(
            image.is_primary
                ? "Delete this primary image? Another image will become primary if one remains."
                : "Delete this image permanently?"
        );

        if (!confirmed) return;

        setGalleryMessage("");
        setGalleryError("");

        startGalleryTransition(async () => {
            const result = await deleteProductImage(
                product.id,
                image.id
            );

            if (!result.success) {
                setGalleryError(result.message);
                return;
            }

            setImages((current) => {
                const remaining = current.filter(
                    (item) => item.id !== image.id
                );

                if (image.is_primary && remaining.length > 0) {
                    return remaining.map((item, index) => ({
                        ...item,
                        is_primary: index === 0,
                    }));
                }

                return remaining;
            });

            setGalleryMessage(result.message);
        });
    }

    const inputClass =
        "w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

    const labelClass =
        "mb-2 block text-sm font-medium text-gray-700";

    return (
        <form
            action={formAction}
            className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
            <input
                type="hidden"
                name="productId"
                value={product.id}
            />

            {/* Existing product image gallery */}
            <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Product Image Gallery
                    </label>

                    <span className="text-xs text-gray-500">
                        {images.length} existing image(s)
                    </span>
                </div>

                {images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                        {images.map((image) => (
                            <div
                                key={image.id}
                                className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                            >
                                <div className="relative">
                                    <img
                                        src={image.image_url}
                                        alt={`${product.name} product image`}
                                        className="h-36 w-full object-cover"
                                    />

                                    {image.is_primary && (
                                        <span className="absolute left-2 top-2 rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                                            Primary
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-2 p-2">
                                    {!image.is_primary && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleSetPrimary(image.id)
                                            }
                                            disabled={
                                                isPending ||
                                                isGalleryPending
                                            }
                                            className="w-full rounded-md border border-blue-200 px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                                        >
                                            Set as Primary
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDeleteImage(image)
                                        }
                                        disabled={
                                            isPending ||
                                            isGalleryPending
                                        }
                                        className="w-full rounded-md border border-red-200 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    >
                                        Delete Image
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                        <p className="text-sm text-gray-500">
                            No product images yet.
                        </p>
                    </div>
                )}

                {/* Gallery feedback */}
                {galleryMessage && (
                    <p
                        role="status"
                        className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700"
                    >
                        {galleryMessage}
                    </p>
                )}

                {galleryError && (
                    <p
                        role="alert"
                        className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                    >
                        {galleryError}
                    </p>
                )}
            </div>

            {/* Add new images */}
            <div className="border-t border-gray-200 pt-5">
                <label
                    htmlFor="productImages"
                    className={labelClass}
                >
                    Add More Images
                </label>

                <input
                    id="productImages"
                    type="file"
                    name="images"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImagesChange}
                    disabled={isPending || isGalleryPending}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2.5 file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                />

                <p className="mt-2 text-xs leading-5 text-gray-500">
                    Select multiple JPG, PNG, or WebP images.
                    Maximum 5 MB per image. Existing images will
                    not be replaced.
                </p>

                {imageError && (
                    <p className="mt-2 text-sm text-red-600">
                        {imageError}
                    </p>
                )}

                {newImages.length > 0 && (
                    <div className="mt-5">
                        <p className="mb-3 text-sm font-medium text-gray-700">
                            New image preview ({newImages.length})
                        </p>

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                            {newImages.map((image, index) => (
                                <div
                                    key={`${image.file.name}-${index}`}
                                    className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                                >
                                    <img
                                        src={image.url}
                                        alt={`New image ${index + 1}`}
                                        className="h-36 w-full object-cover"
                                    />

                                    <div className="p-2">
                                        <p
                                            className="truncate text-xs font-medium text-gray-700"
                                            title={image.file.name}
                                        >
                                            {image.file.name}
                                        </p>

                                        <p className="mt-1 text-xs text-gray-500">
                                            {(
                                                image.file.size /
                                                (1024 * 1024)
                                            ).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Product name */}
            <div>
                <label htmlFor="name" className={labelClass}>
                    Product Name *
                </label>

                <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    maxLength={200}
                    defaultValue={product.name}
                    className={inputClass}
                    disabled={isPending || state.success}
                />
            </div>

            {/* SKU */}
            <div>
                <label htmlFor="sku" className={labelClass}>
                    SKU / Product Code
                </label>

                <input
                    id="sku"
                    name="sku"
                    type="text"
                    maxLength={100}
                    defaultValue={product.sku}
                    placeholder="Optional"
                    className={inputClass}
                    disabled={isPending || state.success}
                />
            </div>

            {/* Description */}
            <div>
                <label htmlFor="description" className={labelClass}>
                    Description
                </label>

                <textarea
                    id="description"
                    name="description"
                    rows={3}
                    maxLength={2000}
                    defaultValue={product.description}
                    className={inputClass}
                    disabled={isPending || state.success}
                />
            </div>

            {/* Unit and selling price */}
            <div className="grid gap-6 sm:grid-cols-2">
                <div>
                    <label htmlFor="unit" className={labelClass}>
                        Unit *
                    </label>

                    <select
                        id="unit"
                        name="unit"
                        required
                        defaultValue={product.unit}
                        className={`${inputClass} bg-white`}
                        disabled={isPending || state.success}
                    >
                        {units.map((unit) => (
                            <option
                                key={unit.value}
                                value={unit.value}
                            >
                                {unit.label}
                            </option>
                        ))}

                        {!units.some(
                            (unit) => unit.value === product.unit
                        ) && (
                                <option value={product.unit}>
                                    {product.unit}
                                </option>
                            )}
                    </select>
                </div>

                <div>
                    <label
                        htmlFor="sellingPrice"
                        className={labelClass}
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
                            className={`${inputClass} pl-8`}
                            disabled={isPending || state.success}
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
                    disabled={
                        isPending ||
                        isGalleryPending ||
                        state.success ||
                        !!imageError
                    }
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isPending
                        ? "Saving Changes..."
                        : "Save Changes"}
                </button>
            </div>
        </form>
    );
}
