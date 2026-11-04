
"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Building2,
    ImagePlus,
    Loader2,
    Save,
    Upload,
    MapPin,
    Phone,
    Mail,
    Globe,
    ReceiptText,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";

type Company = {
    id: string;
    name: string;
    billing_address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    tax_id: string | null;
    logo_path: string | null;
    khqr_path: string | null;
    authorized_signature_path: string | null;
    company_stamp_path: string | null;
};

type AssetKey =
    | "logo_path"
    | "khqr_path"
    | "authorized_signature_path"
    | "company_stamp_path";

const ASSETS: {
    key: AssetKey;
    label: string;
    path: string;
    description: string;
}[] = [
        {
            key: "logo_path",
            label: "Company logo",
            path: "company/logo",
            description: "Displayed on your invoices.",
        },
        {
            key: "khqr_path",
            label: "KHQR payment image",
            path: "company/khqr",
            description: "Your customer payment QR code.",
        },
        {
            key: "authorized_signature_path",
            label: "Authorized signature",
            path: "company/signature",
            description: "Signature displayed on invoices.",
        },
        {
            key: "company_stamp_path",
            label: "Company stamp",
            path: "company/stamp",
            description: "Official company stamp.",
        },
    ];

const BUCKET = "company-assets";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

const EMPTY_ASSETS: Record<AssetKey, string | null> = {
    logo_path: null,
    khqr_path: null,
    authorized_signature_path: null,
    company_stamp_path: null,
};

const INPUT_CLASS =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500";

const LABEL_CLASS =
    "text-sm font-medium text-slate-700 dark:text-slate-300";

export default function CompanySettingsForm({
    company,
}: {
    company: Company;
}) {
    const supabase = createClient();

    const [name, setName] = useState(company.name ?? "");
    const [billingAddress, setBillingAddress] = useState(
        company.billing_address ?? ""
    );
    const [phone, setPhone] = useState(company.phone ?? "");
    const [email, setEmail] = useState(company.email ?? "");
    const [website, setWebsite] = useState(company.website ?? "");
    const [taxId, setTaxId] = useState(company.tax_id ?? "");

    const [paths, setPaths] = useState<Record<AssetKey, string | null>>({
        logo_path: company.logo_path,
        khqr_path: company.khqr_path,
        authorized_signature_path: company.authorized_signature_path,
        company_stamp_path: company.company_stamp_path,
    });

    const [previews, setPreviews] =
        useState<Record<AssetKey, string | null>>(EMPTY_ASSETS);

    const [files, setFiles] =
        useState<Record<AssetKey, File | null>>({
            logo_path: null,
            khqr_path: null,
            authorized_signature_path: null,
            company_stamp_path: null,
        });

    const [loadingPreviews, setLoadingPreviews] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Load signed previews for existing private company images.
    useEffect(() => {
        let cancelled = false;

        async function loadPreviews() {
            const nextPreviews: Record<AssetKey, string | null> = {
                ...EMPTY_ASSETS,
            };

            for (const asset of ASSETS) {
                const path = paths[asset.key];

                if (!path) continue;

                const { data, error } = await supabase.storage
                    .from(BUCKET)
                    .createSignedUrl(path, 60 * 60);

                if (!error && data?.signedUrl) {
                    nextPreviews[asset.key] = data.signedUrl;
                }
            }

            if (!cancelled) {
                setPreviews((current) => ({
                    ...current,
                    ...nextPreviews,
                }));

                setLoadingPreviews(false);
            }
        }

        void loadPreviews();

        return () => {
            cancelled = true;
        };

        // Load existing images when this form is mounted.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Clean up temporary image previews when the component unmounts.
    useEffect(() => {
        return () => {
            Object.values(previews).forEach((preview) => {
                if (preview?.startsWith("blob:")) {
                    URL.revokeObjectURL(preview);
                }
            });
        };
    }, [previews]);

    function handleFileChange(
        key: AssetKey,
        file: File | undefined
    ) {
        setMessage("");
        setErrorMessage("");

        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            setErrorMessage(
                "Choose a PNG, JPG, or WebP image."
            );
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setErrorMessage(
                "Each image must be 5 MB or smaller."
            );
            return;
        }

        const localPreview = URL.createObjectURL(file);

        setFiles((current) => ({
            ...current,
            [key]: file,
        }));

        setPreviews((current) => {
            const oldPreview = current[key];

            if (oldPreview?.startsWith("blob:")) {
                URL.revokeObjectURL(oldPreview);
            }

            return {
                ...current,
                [key]: localPreview,
            };
        });
    }

    async function handleSave(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setSaving(true);
        setMessage("");
        setErrorMessage("");

        try {
            if (!name.trim()) {
                throw new Error("Company name is required.");
            }

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error(
                    "Your session has expired. Please log in again."
                );
            }

            // Keep the existing active-admin authorization check.
            const { data: membership, error: membershipError } =
                await supabase
                    .from("company_members")
                    .select("role, is_active")
                    .eq("user_id", user.id)
                    .maybeSingle();

            if (
                membershipError ||
                !membership ||
                !membership.is_active ||
                membership.role !== "admin"
            ) {
                throw new Error(
                    "Only an active company admin can save these settings."
                );
            }

            const nextPaths = { ...paths };

            // Upload selected images to the existing private bucket.
            for (const asset of ASSETS) {
                const file = files[asset.key];

                if (!file) continue;

                const extension =
                    file.type === "image/jpeg"
                        ? "jpg"
                        : file.type === "image/webp"
                            ? "webp"
                            : "png";

                const objectPath = `${asset.path}.${extension}`;

                const { error: uploadError } = await supabase.storage
                    .from(BUCKET)
                    .upload(objectPath, file, {
                        upsert: true,
                        contentType: file.type,
                        cacheControl: "3600",
                    });

                if (uploadError) {
                    throw new Error(
                        `${asset.label} upload failed: ${uploadError.message}`
                    );
                }

                nextPaths[asset.key] = objectPath;
            }

            // Save company details and image paths.
            const { error: updateError } = await supabase
                .from("companies")
                .update({
                    name: name.trim(),
                    billing_address: billingAddress.trim() || null,
                    phone: phone.trim() || null,
                    email: email.trim() || null,
                    website: website.trim() || null,
                    tax_id: taxId.trim() || null,
                    logo_path: nextPaths.logo_path,
                    khqr_path: nextPaths.khqr_path,
                    authorized_signature_path:
                        nextPaths.authorized_signature_path,
                    company_stamp_path: nextPaths.company_stamp_path,
                })
                .eq("id", company.id);

            if (updateError) {
                throw new Error(
                    `Could not save company settings: ${updateError.message}`
                );
            }

            setPaths(nextPaths);

            setFiles({
                logo_path: null,
                khqr_path: null,
                authorized_signature_path: null,
                company_stamp_path: null,
            });

            // Refresh signed URLs after saving.
            const refreshedPreviews: Record<AssetKey, string | null> = {
                ...EMPTY_ASSETS,
            };

            for (const asset of ASSETS) {
                const path = nextPaths[asset.key];

                if (!path) continue;

                const { data } = await supabase.storage
                    .from(BUCKET)
                    .createSignedUrl(path, 60 * 60);

                refreshedPreviews[asset.key] =
                    data?.signedUrl ?? null;
            }

            setPreviews(refreshedPreviews);

            setMessage("Company settings saved successfully.");
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "An unexpected error occurred."
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="mx-auto w-full max-w-5xl space-y-6">

            {/* Page heading */}
            <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                    <Building2 size={18} />
                    Company workspace
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-[#c5a45d]">
                    Company Settings
                </h1>

                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Manage the company details and images used on your invoices.
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">

                {/* Company information */}
                <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">

                    <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            <Building2 size={21} />
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Company information
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Your official business details.
                            </p>
                        </div>
                    </div>

                    {/* Company name */}
                    <div className="space-y-2">
                        <label htmlFor="company-name" className={LABEL_CLASS}>
                            Company name *
                        </label>

                        <input
                            id="company-name"
                            required
                            maxLength={200}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter company name"
                            className={INPUT_CLASS}
                        />
                    </div>

                    {/* Billing address */}
                    <div className="space-y-2">
                        <label htmlFor="company-address" className={LABEL_CLASS}>
                            Billing address
                        </label>

                        <div className="relative">
                            <MapPin
                                size={17}
                                className="absolute left-3 top-3 text-slate-400"
                            />

                            <textarea
                                id="company-address"
                                rows={3}
                                value={billingAddress}
                                onChange={(e) =>
                                    setBillingAddress(e.target.value)
                                }
                                placeholder="Enter billing address"
                                className={`${INPUT_CLASS} pl-10`}
                            />
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">

                        {/* Phone */}
                        <div className="space-y-2">
                            <label htmlFor="company-phone" className={LABEL_CLASS}>
                                Phone
                            </label>

                            <div className="relative">
                                <Phone
                                    size={17}
                                    className="absolute left-3 top-3 text-slate-400"
                                />

                                <input
                                    id="company-phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Enter phone number"
                                    className={`${INPUT_CLASS} pl-10`}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="company-email" className={LABEL_CLASS}>
                                Email
                            </label>

                            <div className="relative">
                                <Mail
                                    size={17}
                                    className="absolute left-3 top-3 text-slate-400"
                                />

                                <input
                                    id="company-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="company@example.com"
                                    className={`${INPUT_CLASS} pl-10`}
                                />
                            </div>
                        </div>

                        {/* Website */}
                        <div className="space-y-2">
                            <label htmlFor="company-website" className={LABEL_CLASS}>
                                Website
                            </label>

                            <div className="relative">
                                <Globe
                                    size={17}
                                    className="absolute left-3 top-3 text-slate-400"
                                />

                                <input
                                    id="company-website"
                                    type="text"
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    placeholder="https://example.com"
                                    className={`${INPUT_CLASS} pl-10`}
                                />
                            </div>
                        </div>

                        {/* Tax ID */}
                        <div className="space-y-2">
                            <label htmlFor="company-tax-id" className={LABEL_CLASS}>
                                Tax ID
                            </label>

                            <div className="relative">
                                <ReceiptText
                                    size={17}
                                    className="absolute left-3 top-3 text-slate-400"
                                />

                                <input
                                    id="company-tax-id"
                                    value={taxId}
                                    onChange={(e) => setTaxId(e.target.value)}
                                    placeholder="Enter tax ID"
                                    className={`${INPUT_CLASS} pl-10`}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Company images */}
                <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">

                    <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            <ImagePlus size={21} />
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Company images
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                PNG, JPG, or WebP. Maximum 5 MB per image.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        {ASSETS.map((asset) => (
                            <div
                                key={asset.key}
                                className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
                            >
                                <div>
                                    <label className="block text-sm font-semibold text-slate-800 dark:text-white">
                                        {asset.label}
                                    </label>

                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        {asset.description}
                                    </p>
                                </div>

                                {/* Image preview */}
                                <div className="flex min-h-36 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                                    {previews[asset.key] ? (
                                        <img
                                            src={previews[asset.key]!}
                                            alt={`${asset.label} preview`}
                                            className="max-h-40 max-w-full object-contain"
                                        />
                                    ) : loadingPreviews && paths[asset.key] ? (
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                            <Loader2
                                                size={16}
                                                className="animate-spin"
                                            />
                                            Loading preview...
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                                            <ImagePlus size={30} />
                                            <p className="text-sm">
                                                No image uploaded
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Upload input */}
                                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50">
                                    <Upload size={16} />
                                    {files[asset.key] ? "Change image" : "Upload image"}

                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="sr-only"
                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                            handleFileChange(
                                                asset.key,
                                                e.target.files?.[0]
                                            )
                                        }
                                    />
                                </label>

                                {files[asset.key] && (
                                    <p className="break-all text-xs text-emerald-600 dark:text-emerald-400">
                                        Selected: {files[asset.key]?.name}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Success message */}
                {message && (
                    <div
                        role="status"
                        className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400"
                    >
                        <CheckCircle2 size={18} className="shrink-0" />
                        {message}
                    </div>
                )}

                {/* Error message */}
                {errorMessage && (
                    <div
                        role="alert"
                        className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400"
                    >
                        <AlertCircle size={18} className="shrink-0" />
                        {errorMessage}
                    </div>
                )}

                {/* Save button */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            Save company changes
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Your updated information will be used on invoices.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={17} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={17} />
                                Save company settings
                            </>
                        )}
                    </button>
                </div>
            </form>
        </main>
    );
}
