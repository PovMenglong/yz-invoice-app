
import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
    const env = getCloudflareContext().env as {
        NEXT_PUBLIC_SUPABASE_URL?: string;
        SUPABASE_SERVICE_ROLE_KEY?: string;
    };

    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !secretKey) {
        throw new Error("Missing Supabase Admin environment variables.");
    }

    return createSupabaseClient(url, secretKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });
}
