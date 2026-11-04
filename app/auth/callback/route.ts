
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);

    const code = searchParams.get("code");
    const next = searchParams.get("next");

    // Only allow safe internal redirects.
    const safeNext =
        next && next.startsWith("/") && !next.startsWith("//")
            ? next
            : "/protected";

    if (code) {
        const supabase = await createClient();

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return NextResponse.redirect(`${origin}${safeNext}`);
        }

        console.error("Authentication callback failed:", error.message);
    }

    return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
