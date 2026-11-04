
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const requestedNext = searchParams.get("next") ?? "/protected";

  // Allow only internal application paths.
  const safeNext =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/protected";

  if (!tokenHash || !type) {
    redirect("/auth/error?error=Missing%20invitation%20token");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    console.error("Authentication confirmation failed:", error.message);

    redirect("/auth/error?error=Invalid%20or%20expired%20confirmation%20link");
  }

  redirect(new URL(safeNext, origin).toString());
}
