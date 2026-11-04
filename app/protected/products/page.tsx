
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import ProductList from "./product-list";

export const instant = false;

export default async function ProductsPage() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/sign-in");
    }

    // Check active company membership
    const { data: membership, error: membershipError } = await supabase
        .from("company_members")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

    if (membershipError || !membership) {
        return (
            <main className="mx-auto max-w-6xl px-6 py-10">
                <h1 className="text-2xl font-bold text-gray-900">
                    Access denied
                </h1>

                <p className="mt-2 text-gray-600">
                    You need an active company membership to manage products.
                </p>
            </main>
        );
    }

    // Load products, including their private image paths
    const { data: products, error } = await supabase
        .from("products")
        .select(
            "id, name, sku, description, unit, selling_price, is_active, created_at, updated_at, image_path"
        )
        .order("name", { ascending: true });

    if (error) {
        return (
            <main className="mx-auto max-w-6xl px-6 py-10">
                <h1 className="text-3xl font-bold text-gray-900">
                    Products
                </h1>

                <p className="mt-4 text-red-600">
                    Could not load products. Please check your database permissions.
                </p>
            </main>
        );
    }

    // Generate temporary signed URLs for private product images
    const productsWithImages = await Promise.all(
        (products ?? []).map(async (product) => {
            if (!product.image_path) {
                return {
                    ...product,
                    image_url: null,
                };
            }

            const { data, error: imageError } = await supabase.storage
                .from("product-images")
                .createSignedUrl(product.image_path, 60 * 60);

            if (imageError) {
                console.error(
                    `Could not generate image URL for product ${product.id}:`,
                    imageError.message
                );
            }

            return {
                ...product,
                image_url: data?.signedUrl ?? null,
            };
        })
    );

    return (
        <main className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#c5a45d]">
                        Products
                    </h1>

                    <p className="mt-2 text-gray-500">
                        Manage your product catalog and selling prices.
                    </p>
                </div>

                <Link
                    href="/protected/products/new"
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
                >
                    + Add Product
                </Link>
            </div>

            <ProductList products={productsWithImages} />

            <div className="mt-6">
                <Link
                    href="/protected"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                    ← Back to Dashboard
                </Link>
            </div>
        </main>
    );
}
