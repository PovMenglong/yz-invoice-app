
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import EditProductForm from "./edit-product-form";

export const instant = false;

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function EditProductPage({
    params,
}: PageProps) {
    await connection();

    const { id } = await params;

    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id
        )
    ) {
        notFound();
    }

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/sign-in");
    }

    // Verify active company membership
    const { data: membership, error: membershipError } =
        await supabase
            .from("company_members")
            .select("user_id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();

    if (membershipError || !membership) {
        return (
            <main className="mx-auto max-w-3xl px-6 py-10">
                <h1 className="text-2xl font-bold text-red-700">
                    Company access required
                </h1>

                <p className="mt-2 text-gray-600">
                    Your account must be an active company member to edit products.
                </p>
            </main>
        );
    }

    // Load product
    const { data: product, error } = await supabase
        .from("products")
        .select(
            "id, name, sku, description, unit, selling_price, is_active, image_path"
        )
        .eq("id", id)
        .maybeSingle();

    if (error) {
        return (
            <main className="mx-auto max-w-3xl px-6 py-10">
                <h1 className="text-2xl font-bold text-red-700">
                    Could not load product
                </h1>

                <p className="mt-2 text-gray-600">
                    {error.message}
                </p>

                <Link
                    href="/protected/products"
                    className="mt-4 inline-block text-blue-600 underline"
                >
                    Back to Products
                </Link>
            </main>
        );
    }

    if (!product) {
        notFound();
    }

    // Load all gallery images
    const { data: galleryImages, error: galleryError } =
        await supabase
            .from("product_images")
            .select("id, image_path, is_primary, created_at")
            .eq("product_id", product.id)
            .order("is_primary", { ascending: false })
            .order("created_at", { ascending: true });

    if (galleryError) {
        console.error(
            "Could not load product image gallery:",
            galleryError.message
        );

        return (
            <main className="mx-auto max-w-3xl px-6 py-10">
                <h1 className="text-2xl font-bold text-red-700">
                    Could not load product image gallery
                </h1>

                <p className="mt-2 text-gray-600">
                    {galleryError.message}
                </p>

                <Link
                    href="/protected/products"
                    className="mt-4 inline-block text-blue-600 underline"
                >
                    Back to Products
                </Link>
            </main>
        );
    }

    // Generate a signed URL for each private image
    const images = await Promise.all(
        (galleryImages ?? []).map(async (image) => {
            const { data, error: signedUrlError } =
                await supabase.storage
                    .from("product-images")
                    .createSignedUrl(image.image_path, 60 * 60);

            if (signedUrlError || !data?.signedUrl) {
                console.error(
                    "Could not generate product image URL:",
                    image.image_path,
                    signedUrlError?.message
                );

                return null;
            }

            return {
                id: image.id,
                image_path: image.image_path,
                image_url: data.signedUrl,
                is_primary: image.is_primary,
            };
        })
    );

    const validImages = images.filter(
        (image): image is NonNullable<typeof image> => image !== null
    );

    return (
        <main className="mx-auto max-w-3xl px-6 py-10">
            <div className="mb-8">
                <Link
                    href="/protected/products"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                    ← Back to Products
                </Link>

                <h1 className="mt-4 text-3xl font-bold text-gray-900">
                    Edit Product
                </h1>

                <p className="mt-2 text-gray-500">
                    Update product details and manage its image gallery below.
                </p>

                {!product.is_active && (
                    <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                        This product is inactive. Editing it will not automatically
                        activate it.
                    </p>
                )}
            </div>

            <EditProductForm
                product={{
                    id: product.id,
                    name: product.name,
                    sku: product.sku ?? "",
                    description: product.description ?? "",
                    unit: product.unit,
                    selling_price: Number(product.selling_price),
                    images: validImages,
                }}
            />
        </main>
    );
}
