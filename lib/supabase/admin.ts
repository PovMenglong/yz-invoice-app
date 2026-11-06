import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !secretKey) {
        const missing = [];

        if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
        if (!secretKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

        throw new Error(
            `Missing Supabase Admin environment variables: ${missing.join(", ")}`,
        );
    }

    return createSupabaseClient(url, secretKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });
}