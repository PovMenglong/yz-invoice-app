
"use client";

import {
    useActionState,
    useEffect,
    useState,
    type ChangeEvent,
} from "react";
import {
    updateProfile,
    type ProfileFormState,
} from "./actions";

const initialState: ProfileFormState = {
    error: "",
    success: "",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

export default function ProfileForm({
    email,
    initialName,
    initialAvatarUrl,
}: {
    email: string;
    initialName: string;
    initialAvatarUrl: string | null;
}) {
    const [state, formAction, pending] = useActionState(
        updateProfile,
        initialState
    );

    const [preview, setPreview] = useState<string | null>(
        initialAvatarUrl
    );

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imageError, setImageError] = useState("");

    useEffect(() => {
        if (!selectedFile) {
            setPreview(initialAvatarUrl);
            return;
        }

        const objectUrl = URL.createObjectURL(selectedFile);
        setPreview(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [selectedFile, initialAvatarUrl]);

    const inputClass =
        "h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-400 dark:focus:ring-blue-400/10";

    const avatarLetter =
        initialName.trim().charAt(0).toUpperCase() || "U";

    function handleImageChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[0];

        setImageError("");
        setSelectedFile(null);

        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            setImageError("Please select a JPG, PNG, or WebP image.");
            event.target.value = "";
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setImageError("Your image must be smaller than 5 MB.");
            event.target.value = "";
            return;
        }

        setSelectedFile(file);
    }

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <form action={formAction} className="space-y-6 p-6 sm:p-8">

                    {/* Profile photo */}
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 text-3xl font-bold text-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-400">
                            {preview ? (
                                <img
                                    src={preview}
                                    alt="Profile photo preview"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                avatarLetter
                            )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-2">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {initialName || "Your profile"}
                            </h2>

                            <p className="break-all text-sm text-gray-500 dark:text-slate-400">
                                {email}
                            </p>

                            <label
                                htmlFor="avatar"
                                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus-within:ring-4 focus-within:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                                {selectedFile ? "Change photo" : "Upload photo"}
                            </label>

                            <input
                                id="avatar"
                                name="avatar"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleImageChange}
                                className="sr-only"
                            />

                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                JPG, PNG, or WebP. Maximum size: 5 MB.
                            </p>

                            {imageError && (
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    {imageError}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-slate-700" />

                    {/* Full name */}
                    <div className="space-y-2">
                        <label
                            htmlFor="full_name"
                            className="block text-sm font-semibold text-gray-700 dark:text-slate-200"
                        >
                            Full name
                        </label>

                        <input
                            id="full_name"
                            name="full_name"
                            type="text"
                            defaultValue={initialName}
                            maxLength={100}
                            required
                            autoComplete="name"
                            placeholder="Enter your full name"
                            className={inputClass}
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label
                            htmlFor="email"
                            className="block text-sm font-semibold text-gray-700 dark:text-slate-200"
                        >
                            Email address
                        </label>

                        <input
                            id="email"
                            type="email"
                            value={email}
                            readOnly
                            className="h-12 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 px-4 text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400"
                        />

                        <p className="text-xs leading-5 text-gray-500 dark:text-slate-400">
                            This address comes from your signed-in account.
                            It cannot be changed on this page.
                        </p>
                    </div>

                    {/* Feedback */}
                    {state.error && (
                        <p
                            role="alert"
                            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                        >
                            {state.error}
                        </p>
                    )}

                    {state.success && (
                        <p
                            role="status"
                            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                        >
                            {state.success}
                        </p>
                    )}

                    {/* Save */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            disabled={pending || Boolean(imageError)}
                            className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {pending ? "Saving..." : "Save changes"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
