
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const AVATAR_BUCKET = "profile-photos";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
} as const;

export type ProfileFormState = {
    error: string;
    success: string;
};

export async function updateProfile(
    _previousState: ProfileFormState,
    formData: FormData
): Promise<ProfileFormState> {
    const fullName = String(formData.get("full_name") ?? "").trim();
    const image = formData.get("avatar");

    if (!fullName) {
        return { error: "Please enter your full name.", success: "" };
    }

    if (fullName.length > 100) {
        return {
            error: "Your name must be 100 characters or fewer.",
            success: "",
        };
    }

    if (
        image !== null &&
        (!(image instanceof File) || image.size > 0) &&
        (!(image instanceof File) ||
            !Object.keys(ALLOWED_AVATAR_TYPES).includes(image.type) ||
            image.size > MAX_AVATAR_SIZE)
    ) {
        return {
            error: "Please select a JPG, PNG, or WebP image smaller than 5 MB.",
            success: "",
        };
    }

    const avatarFile =
        image instanceof File && image.size > 0 ? image : null;

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            error: "Your session has expired. Please log in again.",
            success: "",
        };
    }

    const { data: membership, error: membershipError } = await supabase
        .from("company_members")
        .select("is_active")
        .eq("user_id", user.id)
        .maybeSingle();

    if (
        membershipError ||
        !membership ||
        membership.is_active !== true
    ) {
        return {
            error: "Active company membership is required to update your profile.",
            success: "",
        };
    }

    const { data: existingProfile, error: lookupError } = await supabase
        .from("profiles")
        .select("id, avatar_path")
        .eq("id", user.id)
        .maybeSingle();

    if (lookupError) {
        console.error("Profile lookup failed:", lookupError.message);
        return {
            error: "Unable to load your profile. Please try again.",
            success: "",
        };
    }

    let newAvatarPath: string | null = null;

    if (avatarFile) {
        const extension =
            ALLOWED_AVATAR_TYPES[
            avatarFile.type as keyof typeof ALLOWED_AVATAR_TYPES
            ];

        newAvatarPath = `${user.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .upload(newAvatarPath, avatarFile, {
                contentType: avatarFile.type,
                cacheControl: "3600",
                upsert: false,
            });

        if (uploadError) {
            console.error("Avatar upload failed:", uploadError.message);
            return {
                error: "Unable to upload your profile photo. Please try again.",
                success: "",
            };
        }
    }

    const profileValues = {
        full_name: fullName,
        ...(newAvatarPath ? { avatar_path: newAvatarPath } : {}),
    };

    const { error: saveError } = existingProfile
        ? await supabase
            .from("profiles")
            .update(profileValues)
            .eq("id", user.id)
        : await supabase.from("profiles").insert({
            id: user.id,
            ...profileValues,
        });

    if (saveError) {
        console.error("Profile save failed:", saveError.message);

        if (newAvatarPath) {
            await supabase.storage
                .from(AVATAR_BUCKET)
                .remove([newAvatarPath]);
        }

        return {
            error: "Unable to save your profile. Please try again.",
            success: "",
        };
    }

    // Remove the previous photo only after the new path is saved.
    if (
        newAvatarPath &&
        existingProfile?.avatar_path &&
        existingProfile.avatar_path !== newAvatarPath
    ) {
        const { error: deleteError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .remove([existingProfile.avatar_path]);

        if (deleteError) {
            console.error(
                "Previous avatar cleanup failed:",
                deleteError.message
            );
        }
    }

    revalidatePath("/protected/profile");

    return {
        error: "",
        success: avatarFile
            ? "Your profile and photo have been saved."
            : "Your profile has been saved.",
    };
}
