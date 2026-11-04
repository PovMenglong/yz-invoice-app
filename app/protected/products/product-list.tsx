
"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProductActive } from "./actions";

type Product = {
    id: string;
    name: string;
    sku: string | null;
    description: string | null;
    unit: string;
    selling_price: number | string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    image_path: string | null;
    image_url: string | null;
};

type Filter = "all" | "active" | "inactive";

export default function ProductList({
    products,
}: {
    products: Product[];
}) {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [messageIsError, setMessageIsError] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const filteredProducts = useMemo(() => {
        const query = search.trim().toLowerCase();

        return products.filter((product) => {
            const matchesSearch =
                !query ||
                product.name.toLowerCase().includes(query) ||
                (product.sku ?? "").toLowerCase().includes(query) ||
                (product.description ?? "").toLowerCase().includes(query);

            const matchesStatus =
                filter === "all" ||
                (filter === "active" && product.is_active) ||
                (filter === "inactive" && !product.is_active);

            return matchesSearch && matchesStatus;
        });
    }, [products, search, filter]);

    function toggleProduct(product: Product) {
        const action = product.is_active ? "deactivate" : "activate";

        if (
            !window.confirm(
                `Are you sure you want to ${action} "${product.name}"?`
            )
        ) {
            return;
        }

        setMessage("");
        setMessageIsError(false);
        setPendingId(product.id);

        startTransition(async () => {
            try {
                const result = await setProductActive(
                    product.id,
                    !product.is_active
                );

                setMessage(result.message);
                setMessageIsError(!result.success);

                if (result.success) {
                    router.refresh();
                }
            } catch {
                setMessage("Something went wrong. Please try again.");
                setMessageIsError(true);
            } finally {
                setPendingId(null);
            }
        });
    }

    function money(value: number | string) {
        return Number(value).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    const activeCount = products.filter(
        (product) => product.is_active
    ).length;

    return (
        <section className="mt-8 space-y-5">
            {/* Search and filters */}
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by product name, SKU, or description..."
                    aria-label="Search products"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/10"
                />

                <select
                    value={filter}
                    onChange={(event) =>
                        setFilter(event.target.value as Filter)
                    }
                    aria-label="Filter product status"
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400"
                >
                    <option value="all">All products</option>
                    <option value="active">Active only</option>
                    <option value="inactive">Inactive only</option>
                </select>
            </div>

            {/* Action feedback */}
            {message && (
                <div
                    role="status"
                    className={`rounded-xl border p-4 text-sm ${messageIsError
                            ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                        }`}
                >
                    {message}
                </div>
            )}

            {/* Product count */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500 dark:text-slate-400">
                <span>
                    Showing{" "}
                    <span className="font-semibold text-gray-900 dark:text-slate-100">
                        {filteredProducts.length}
                    </span>{" "}
                    of {products.length} products
                </span>

                <span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {activeCount}
                    </span>{" "}
                    active
                </span>
            </div>

            {/* Empty state */}
            {filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-300">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73Z" />
                            <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
                        </svg>
                    </div>

                    <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                        {products.length === 0
                            ? "No products yet"
                            : "No matching products"}
                    </h2>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-slate-400">
                        {products.length === 0
                            ? "Add your first product to start building your catalog."
                            : "Try another search term or change the status filter."}
                    </p>

                    {products.length === 0 && (
                        <Link
                            href="/protected/products/new"
                            className="mt-5 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                        >
                            + Add your first product
                        </Link>
                    )}
                </div>
            ) : (
                /* Products table */
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-lg dark:divide-slate-700">
                            <thead className="bg-gray-100 dark:bg-slate-800/90">
                                <tr>
                                    <th
                                        scope="col"
                                        className="px-5 py-4 text-left font-semibold text-gray-600 dark:text-slate-300"
                                    >
                                        Product
                                    </th>

                                    <th
                                        scope="col"
                                        className="px-5 py-4 text-left font-semibold text-gray-600 dark:text-slate-300"
                                    >
                                        SKU
                                    </th>

                                    <th
                                        scope="col"
                                        className="px-5 py-4 text-left font-semibold text-gray-600 dark:text-slate-300"
                                    >
                                        Unit
                                    </th>

                                    <th
                                        scope="col"
                                        className="px-5 py-4 text-right font-semibold text-gray-600 dark:text-slate-300"
                                    >
                                        Price (USD)
                                    </th>

                                    <th
                                        scope="col"
                                        className="px-5 py-4 text-center font-semibold text-gray-600 dark:text-slate-300"
                                    >
                                        Status
                                    </th>

                                    <th
                                        scope="col"
                                        className="px-5 py-4 text-right font-semibold text-gray-600 dark:text-slate-300"
                                    >
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {filteredProducts.map((product) => (
                                    <tr
                                        key={product.id}
                                        className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/60"
                                    >
                                        {/* Product image and name */}
                                        <td className="px-5 py-4">
                                            <div className="flex min-w-[220px] items-center gap-3">
                                                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
                                                    {product.image_url ? (
                                                        <img
                                                            src={product.image_url}
                                                            alt={product.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            width="25"
                                                            height="25"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="1.5"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="text-gray-400 dark:text-slate-500"
                                                            aria-label="No product image"
                                                            role="img"
                                                        >
                                                            <rect
                                                                x="3"
                                                                y="3"
                                                                width="18"
                                                                height="18"
                                                                rx="2"
                                                            />
                                                            <circle
                                                                cx="8.5"
                                                                cy="8.5"
                                                                r="1.5"
                                                            />
                                                            <path d="m21 15-5-5L5 21" />
                                                        </svg>
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="font-semibold text-gray-900 dark:text-slate-100">
                                                        {product.name}
                                                    </div>

                                                    {product.description && (
                                                        <p className="mt-1 max-w-xs truncate text-xs text-gray-500 dark:text-slate-400">
                                                            {product.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-slate-300">
                                            {product.sku || "—"}
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-slate-300">
                                            {product.unit}
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-gray-900 dark:text-slate-100">
                                            ${money(product.selling_price)}
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-4 text-center">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${product.is_active
                                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                                                        : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300"
                                                    }`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${product.is_active
                                                            ? "bg-emerald-500"
                                                            : "bg-gray-400 dark:bg-slate-400"
                                                        }`}
                                                />

                                                {product.is_active
                                                    ? "Active"
                                                    : "Inactive"}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <Link
                                                    href={`/protected/products/${product.id}/edit`}
                                                    className="font-semibold text-blue-600 transition hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                                                >
                                                    Edit
                                                </Link>

                                                <button
                                                    type="button"
                                                    disabled={isPending}
                                                    onClick={() =>
                                                        toggleProduct(product)
                                                    }
                                                    className={`font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${product.is_active
                                                            ? "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                            : "text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
                                                        }`}
                                                >
                                                    {isPending &&
                                                        pendingId === product.id
                                                        ? "Saving..."
                                                        : product.is_active
                                                            ? "Deactivate"
                                                            : "Activate"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-gray-200 bg-gray-50 px-5 py-3 text-xs text-gray-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                        Showing {filteredProducts.length} product
                        {filteredProducts.length === 1 ? "" : "s"}
                    </div>
                </div>
            )}
        </section>
    );
}
