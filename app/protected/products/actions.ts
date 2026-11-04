
"use server";

import { createClient } from "@/lib/supabase/server";

const PRODUCT_IMAGE_BUCKET = "product-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

async function getAuthorizedClient() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            supabase,
            authorized: false,
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
            authorized: false,
            message: "You do not have permission to manage products.",
        };
    }

    return {
        supabase,
        authorized: true,
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

function readProductImage(formData: FormData) {
    const value = formData.get("image");

    if (!(value instanceof File) || value.size === 0) {
        return {
            error: "",
            image: null as File | null,
            extension: "",
        };
    }

    const extension = ALLOWED_IMAGE_TYPES[value.type];

    if (!extension) {
        return {
            error: "Please upload a JPG, PNG, or WebP image.",
            image: null,
            extension: "",
        };
    }

    if (value.size > MAX_IMAGE_SIZE) {
        return {
            error: "Product image must not exceed 5 MB.",
            image: null,
            extension: "",
        };
    }

    return {
        error: "",
        image: value,
        extension,
    };
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

    const imageResult = readProductImage(formData);

    if (imageResult.error) {
        return {
            success: false,
            message: imageResult.error,
        };
    }

    // Create the product first so we have its database ID.
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

    // No image selected: product creation is already complete.
    if (!imageResult.image) {
        return {
            success: true,
            message: "Product added successfully!",
        };
    }

    const imagePath = `${newProduct.id}/${crypto.randomUUID()}.${imageResult.extension}`;

    // Upload the image to the private Supabase Storage bucket.
    const { error: uploadError } = await auth.supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(imagePath, imageResult.image, {
            contentType: imageResult.image.type,
            cacheControl: "3600",
            upsert: false,
        });

    if (uploadError) {
        // Remove the product if its selected image could not be uploaded.
        await auth.supabase
            .from("products")
            .delete()
            .eq("id", newProduct.id);

        return {
            success: false,
            message: `Product image upload failed: ${uploadError.message}`,
        };
    }

    // Save the private Storage object path in the products table.
    const { error: imageUpdateError } = await auth.supabase
        .from("products")
        .update({
            image_path: imagePath,
        })
        .eq("id", newProduct.id);

    if (imageUpdateError) {
        // Clean up the uploaded image and product if saving its path fails.
        await auth.supabase.storage
            .from(PRODUCT_IMAGE_BUCKET)
            .remove([imagePath]);

        await auth.supabase
            .from("products")
            .delete()
            .eq("id", newProduct.id);

        return {
            success: false,
            message: `Could not save product image: ${imageUpdateError.message}`,
        };
    }

    return {
        success: true,
        message: "Product and image added successfully!",
    };
}

export async function updateProduct(formData: FormData) {
    const auth = await getAuthorizedClient();

    if (!auth.authorized) {
        return { success: false, message: auth.message };
    }

    const productId = String(formData.get("productId") ?? "").trim();

    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            productId
        )
    ) {
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

    const imageResult = readProductImage(formData);

    if (imageResult.error) {
        return {
            success: false,
            message: imageResult.error,
        };
    }

    // Find the existing product and remember its current image path.
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

    // No replacement image: update only the product details.
    if (!imageResult.image) {
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

    // Create a unique path for the replacement image.
    const newImagePath = `${productId}/${crypto.randomUUID()}.${imageResult.extension}`;

    // Upload the replacement without overwriting the existing image.
    const { error: uploadError } = await auth.supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(newImagePath, imageResult.image, {
            contentType: imageResult.image.type,
            cacheControl: "3600",
            upsert: false,
        });

    if (uploadError) {
        return {
            success: false,
            message: `Product image upload failed: ${uploadError.message}`,
        };
    }

    // Update product details and point to the replacement image.
    const { error: updateError } = await auth.supabase
        .from("products")
        .update({
            ...result.product,
            image_path: newImagePath,
            updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

    if (updateError) {
        // Keep the original image and remove the unused replacement.
        await auth.supabase.storage
            .from(PRODUCT_IMAGE_BUCKET)
            .remove([newImagePath]);

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

    // The database now points to the new image.
    // Remove the old image only after the update succeeds.
    if (existingProduct.image_path) {
        const { error: deleteOldImageError } = await auth.supabase.storage
            .from(PRODUCT_IMAGE_BUCKET)
            .remove([existingProduct.image_path]);

        if (deleteOldImageError) {
            console.error(
                "Product was updated, but the old image could not be deleted:",
                deleteOldImageError.message
            );
        }
    }

    return {
        success: true,
        message: "Product and image updated successfully!",
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
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            productId
        ) ||
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
