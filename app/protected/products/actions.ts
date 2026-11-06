
"use server";

import { createClient } from "@/lib/supabase/server";

const PRODUCT_IMAGE_BUCKET = "product-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getAuthorizedClient() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            supabase,
            authorized: false as const,
            message: "Please sign in before managing products.",
        };
    }

    const { data: membership, error: membershipError } = await supabase
        .from("company_members")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

    if (membershipError || !membership) {
        return {
            supabase,
            authorized: false as const,
            message: "You do not have permission to manage products.",
        };
    }

    return {
        supabase,
        authorized: true as const,
        message: "",
    };
}

function readProduct(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const sku = String(formData.get("sku") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const unit = String(formData.get("unit") ?? "piece").trim();
    const rawPrice = String(formData.get("sellingPrice") ?? "").trim();
    const sellingPrice = Number(rawPrice);

    if (!name) {
        return { error: "Product name is required." };
    }

    if (
        name.length > 200 ||
        sku.length > 100 ||
        description.length > 2000 ||
        unit.length > 50
    ) {
        return { error: "One or more fields are too long." };
    }

    if (!unit) {
        return { error: "Product unit is required." };
    }

    if (
        rawPrice === "" ||
        !Number.isFinite(sellingPrice) ||
        sellingPrice < 0 ||
        !/^\d+(\.\d{1,2})?$/.test(rawPrice)
    ) {
        return {
            error: "Enter a valid selling price with up to two decimal places.",
        };
    }

    return {
        error: "",
        product: {
            name,
            sku: sku || null,
            description: description || null,
            unit,
            selling_price: sellingPrice,
        },
    };
}

function readProductImages(formData: FormData) {
    // "images" supports the new multiple-image form.
    // "image" keeps compatibility with the previous single-image form.
    const values = formData.getAll("images");
    const entries = values.length > 0 ? values : [formData.get("image")];

    const images: File[] = [];

    for (const value of entries) {
        if (value === null || value === "") {
            continue;
        }

        if (!(value instanceof File)) {
            return {
                error: "Invalid product image upload.",
                images: [] as File[],
            };
        }

        if (value.size === 0) {
            continue;
        }

        if (!ALLOWED_IMAGE_TYPES[value.type]) {
            return {
                error: "Please upload only JPG, PNG, or WebP images.",
                images: [] as File[],
            };
        }

        if (value.size > MAX_IMAGE_SIZE) {
            return {
                error: "Each product image must not exceed 5 MB.",
                images: [] as File[],
            };
        }

        images.push(value);
    }

    return {
        error: "",
        images,
    };
}

function isValidProductId(productId: string) {
    return UUID_REGEX.test(productId);
}

async function uploadProductImages(
    supabase: Awaited<ReturnType<typeof createClient>>,
    productId: string,
    images: File[]
) {
    const uploadedPaths: string[] = [];

    for (const image of images) {
        const extension = ALLOWED_IMAGE_TYPES[image.type];

        const imagePath =
            `${productId}/${crypto.randomUUID()}.${extension}`;

        const { error } = await supabase.storage
            .from(PRODUCT_IMAGE_BUCKET)
            .upload(imagePath, image, {
                contentType: image.type,
                cacheControl: "3600",
                upsert: false,
            });

        if (error) {
            if (uploadedPaths.length > 0) {
                await supabase.storage
                    .from(PRODUCT_IMAGE_BUCKET)
                    .remove(uploadedPaths);
            }

            return {
                error: `Product image upload failed: ${error.message}`,
                paths: [] as string[],
            };
        }

        uploadedPaths.push(imagePath);
    }

    return {
        error: "",
        paths: uploadedPaths,
    };
}

async function removeUploadedImages(
    supabase: Awaited<ReturnType<typeof createClient>>,
    paths: string[]
) {
    if (paths.length === 0) return;

    const { error } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove(paths);

    if (error) {
        console.error("Could not clean up product images:", error.message);
    }
}

export async function createProduct(formData: FormData) {
    const auth = await getAuthorizedClient();

    if (!auth.authorized) {
        return { success: false, message: auth.message };
    }

    const result = readProduct(formData);

    if (result.error || !("product" in result)) {
        return {
            success: false,
            message: result.error || "Invalid product information.",
        };
    }

    const imageResult = readProductImages(formData);

    if (imageResult.error) {
        return {
            success: false,
            message: imageResult.error,
        };
    }

    const { data: newProduct, error: insertError } = await auth.supabase
        .from("products")
        .insert({
            ...result.product,
            is_active: true,
        })
        .select("id")
        .single();

    if (insertError || !newProduct) {
        if (insertError?.code === "23505") {
            return {
                success: false,
                message: "That SKU already exists. Please use a different SKU.",
            };
        }

        return {
            success: false,
            message: `Could not add product: ${insertError?.message ?? "Unknown error"}`,
        };
    }

    if (imageResult.images.length === 0) {
        return {
            success: true,
            message: "Product added successfully!",
        };
    }

    const uploadResult = await uploadProductImages(
        auth.supabase,
        newProduct.id,
        imageResult.images
    );

    if (uploadResult.error) {
        await auth.supabase
            .from("products")
            .delete()
            .eq("id", newProduct.id);

        return {
            success: false,
            message: uploadResult.error,
        };
    }

    const imageRows = uploadResult.paths.map((path, index) => ({
        product_id: newProduct.id,
        image_path: path,
        is_primary: index === 0,
    }));

    const { error: galleryError } = await auth.supabase
        .from("product_images")
        .insert(imageRows);

    if (galleryError) {
        await removeUploadedImages(auth.supabase, uploadResult.paths);

        await auth.supabase
            .from("products")
            .delete()
            .eq("id", newProduct.id);

        return {
            success: false,
            message: `Could not save product gallery: ${galleryError.message}`,
        };
    }

    const { error: imageUpdateError } = await auth.supabase
        .from("products")
        .update({
            image_path: uploadResult.paths[0],
        })
        .eq("id", newProduct.id);

    if (imageUpdateError) {
        await auth.supabase
            .from("product_images")
            .delete()
            .eq("product_id", newProduct.id);

        await removeUploadedImages(auth.supabase, uploadResult.paths);

        await auth.supabase
            .from("products")
            .delete()
            .eq("id", newProduct.id);

        return {
            success: false,
            message: `Could not save primary product image: ${imageUpdateError.message}`,
        };
    }

    return {
        success: true,
        message: `Product added successfully with ${uploadResult.paths.length} image(s)!`,
    };
}

export async function updateProduct(formData: FormData) {
    const auth = await getAuthorizedClient();

    if (!auth.authorized) {
        return { success: false, message: auth.message };
    }

    const productId = String(formData.get("productId") ?? "").trim();

    if (!isValidProductId(productId)) {
        return {
            success: false,
            message: "A valid product ID is required.",
        };
    }

    const result = readProduct(formData);

    if (result.error || !("product" in result)) {
        return {
            success: false,
            message: result.error || "Invalid product information.",
        };
    }

    const imageResult = readProductImages(formData);

    if (imageResult.error) {
        return {
            success: false,
            message: imageResult.error,
        };
    }

    const { data: existingProduct, error: lookupError } =
        await auth.supabase
            .from("products")
            .select("id, image_path")
            .eq("id", productId)
            .maybeSingle();

    if (lookupError || !existingProduct) {
        return {
            success: false,
            message: "Product not found or you do not have permission to edit it.",
        };
    }

    // Update product details only when no new images were selected.
    if (imageResult.images.length === 0) {
        const { error } = await auth.supabase
            .from("products")
            .update({
                ...result.product,
                updated_at: new Date().toISOString(),
            })
            .eq("id", productId);

        if (error) {
            if (error.code === "23505") {
                return {
                    success: false,
                    message: "That SKU already exists. Please use a different SKU.",
                };
            }

            return {
                success: false,
                message: `Could not update product: ${error.message}`,
            };
        }

        return {
            success: true,
            message: "Product updated successfully!",
        };
    }

    // Find the current primary gallery image.
    const { data: gallery, error: galleryError } = await auth.supabase
        .from("product_images")
        .select("id, image_path, is_primary")
        .eq("product_id", productId)
        .order("created_at", { ascending: true });

    if (galleryError) {
        return {
            success: false,
            message: `Could not load the existing image gallery: ${galleryError.message}`,
        };
    }

    const hasPrimaryImage = (gallery ?? []).some(
        (image) => image.is_primary
    );

    const uploadResult = await uploadProductImages(
        auth.supabase,
        productId,
        imageResult.images
    );

    if (uploadResult.error) {
        return {
            success: false,
            message: uploadResult.error,
        };
    }

    const imageRows = uploadResult.paths.map((path, index) => ({
        product_id: productId,
        image_path: path,
        is_primary: !hasPrimaryImage && index === 0,
    }));

    const { error: insertImagesError } = await auth.supabase
        .from("product_images")
        .insert(imageRows);

    if (insertImagesError) {
        await removeUploadedImages(auth.supabase, uploadResult.paths);

        return {
            success: false,
            message: `Could not add images to the gallery: ${insertImagesError.message}`,
        };
    }

    const newPrimaryPath = !hasPrimaryImage
        ? uploadResult.paths[0]
        : existingProduct.image_path;

    const { error: updateError } = await auth.supabase
        .from("products")
        .update({
            ...result.product,
            image_path: newPrimaryPath,
            updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

    if (updateError) {
        await auth.supabase
            .from("product_images")
            .delete()
            .eq("product_id", productId)
            .in("image_path", uploadResult.paths);

        await removeUploadedImages(auth.supabase, uploadResult.paths);

        if (updateError.code === "23505") {
            return {
                success: false,
                message: "That SKU already exists. Please use a different SKU.",
            };
        }

        return {
            success: false,
            message: `Could not update product: ${updateError.message}`,
        };
    }

    return {
        success: true,
        message: `${uploadResult.paths.length} image(s) added successfully!`,
    };
}

export async function setPrimaryProductImage(
    productId: string,
    imageId: string
) {
    const auth = await getAuthorizedClient();

    if (!auth.authorized) {
        return { success: false, message: auth.message };
    }

    if (!isValidProductId(productId) || !isValidProductId(imageId)) {
        return {
            success: false,
            message: "Invalid product or image ID.",
        };
    }

    const { data: targetImage, error: targetError } = await auth.supabase
        .from("product_images")
        .select("id, image_path, is_primary")
        .eq("id", imageId)
        .eq("product_id", productId)
        .maybeSingle();

    if (targetError || !targetImage) {
        return {
            success: false,
            message: "Image not found in this product gallery.",
        };
    }

    const { data: previousPrimary } = await auth.supabase
        .from("product_images")
        .select("id, image_path")
        .eq("product_id", productId)
        .eq("is_primary", true)
        .maybeSingle();

    if (targetImage.is_primary) {
        const { error } = await auth.supabase
            .from("products")
            .update({ image_path: targetImage.image_path })
            .eq("id", productId);

        return error
            ? {
                success: false,
                message: `Could not synchronize primary image: ${error.message}`,
            }
            : {
                success: true,
                message: "This is already the primary image.",
            };
    }

    if (previousPrimary) {
        const { error } = await auth.supabase
            .from("product_images")
            .update({ is_primary: false })
            .eq("id", previousPrimary.id);

        if (error) {
            return {
                success: false,
                message: `Could not change primary image: ${error.message}`,
            };
        }
    }

    const { error: promoteError } = await auth.supabase
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", imageId)
        .eq("product_id", productId);

    if (promoteError) {
        if (previousPrimary) {
            await auth.supabase
                .from("product_images")
                .update({ is_primary: true })
                .eq("id", previousPrimary.id);
        }

        return {
            success: false,
            message: `Could not select primary image: ${promoteError.message}`,
        };
    }

    const { error: productUpdateError } = await auth.supabase
        .from("products")
        .update({
            image_path: targetImage.image_path,
            updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

    if (productUpdateError) {
        await auth.supabase
            .from("product_images")
            .update({ is_primary: false })
            .eq("id", imageId);

        if (previousPrimary) {
            await auth.supabase
                .from("product_images")
                .update({ is_primary: true })
                .eq("id", previousPrimary.id);
        }

        return {
            success: false,
            message: `Could not update product image: ${productUpdateError.message}`,
        };
    }

    return {
        success: true,
        message: "Primary product image updated successfully!",
    };
}

export async function deleteProductImage(
    productId: string,
    imageId: string
) {
    const auth = await getAuthorizedClient();

    if (!auth.authorized) {
        return { success: false, message: auth.message };
    }

    if (!isValidProductId(productId) || !isValidProductId(imageId)) {
        return {
            success: false,
            message: "Invalid product or image ID.",
        };
    }

    const { data: targetImage, error: targetError } = await auth.supabase
        .from("product_images")
        .select("id, image_path, is_primary")
        .eq("id", imageId)
        .eq("product_id", productId)
        .maybeSingle();

    if (targetError || !targetImage) {
        return {
            success: false,
            message: "Image not found in this product gallery.",
        };
    }

    let nextPrimary: { id: string; image_path: string } | null = null;

    if (targetImage.is_primary) {
        const { data: remainingImages, error: remainingError } =
            await auth.supabase
                .from("product_images")
                .select("id, image_path")
                .eq("product_id", productId)
                .neq("id", imageId)
                .order("created_at", { ascending: true })
                .limit(1);

        if (remainingError) {
            return {
                success: false,
                message: `Could not load remaining images: ${remainingError.message}`,
            };
        }

        nextPrimary = remainingImages?.[0] ?? null;

        // Release the unique primary-image constraint before promoting another.
        const { error: unsetError } = await auth.supabase
            .from("product_images")
            .update({ is_primary: false })
            .eq("id", imageId);

        if (unsetError) {
            return {
                success: false,
                message: `Could not prepare image deletion: ${unsetError.message}`,
            };
        }

        if (nextPrimary) {
            const { error: promoteError } = await auth.supabase
                .from("product_images")
                .update({ is_primary: true })
                .eq("id", nextPrimary.id);

            if (promoteError) {
                await auth.supabase
                    .from("product_images")
                    .update({ is_primary: true })
                    .eq("id", imageId);

                return {
                    success: false,
                    message: `Could not select another primary image: ${promoteError.message}`,
                };
            }
        }

        const { error: syncError } = await auth.supabase
            .from("products")
            .update({
                image_path: nextPrimary?.image_path ?? null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", productId);

        if (syncError) {
            if (nextPrimary) {
                await auth.supabase
                    .from("product_images")
                    .update({ is_primary: false })
                    .eq("id", nextPrimary.id);
            }

            await auth.supabase
                .from("product_images")
                .update({ is_primary: true })
                .eq("id", imageId);

            return {
                success: false,
                message: `Could not update product primary image: ${syncError.message}`,
            };
        }
    }

    const { error: deleteRowError } = await auth.supabase
        .from("product_images")
        .delete()
        .eq("id", imageId)
        .eq("product_id", productId);

    if (deleteRowError) {
        // Restore the previous primary image if the gallery row cannot be deleted.
        if (targetImage.is_primary) {
            if (nextPrimary) {
                await auth.supabase
                    .from("product_images")
                    .update({ is_primary: false })
                    .eq("id", nextPrimary.id);
            }

            await auth.supabase
                .from("product_images")
                .update({ is_primary: true })
                .eq("id", imageId);

            await auth.supabase
                .from("products")
                .update({ image_path: targetImage.image_path })
                .eq("id", productId);
        }

        return {
            success: false,
            message: `Could not remove image from gallery: ${deleteRowError.message}`,
        };
    }

    const { error: storageError } = await auth.supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove([targetImage.image_path]);

    if (storageError) {
        console.error(
            "Gallery image row deleted, but storage cleanup failed:",
            storageError.message
        );

        return {
            success: true,
            message: "Image removed from gallery, but its storage file could not be cleaned up.",
        };
    }

    return {
        success: true,
        message: targetImage.is_primary
            ? nextPrimary
                ? "Image deleted. Another image is now primary."
                : "Image deleted. This product no longer has a primary image."
            : "Image deleted successfully!",
    };
}

export async function setProductActive(
    productId: string,
    isActive: boolean
) {
    const auth = await getAuthorizedClient();

    if (!auth.authorized) {
        return { success: false, message: auth.message };
    }

    if (
        !isValidProductId(productId) ||
        typeof isActive !== "boolean"
    ) {
        return {
            success: false,
            message: "Invalid product information.",
        };
    }

    const { data: existingProduct, error: lookupError } =
        await auth.supabase
            .from("products")
            .select("id")
            .eq("id", productId)
            .maybeSingle();

    if (lookupError || !existingProduct) {
        return {
            success: false,
            message: "Product not found or you do not have permission to update it.",
        };
    }

    const { error } = await auth.supabase
        .from("products")
        .update({
            is_active: isActive,
            updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

    if (error) {
        return {
            success: false,
            message: `Could not update product status: ${error.message}`,
        };
    }

    return {
        success: true,
        message: isActive
            ? "Product activated successfully!"
            : "Product deactivated successfully!",
    };
}
