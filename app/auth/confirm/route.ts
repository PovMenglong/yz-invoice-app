
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const tokenHash = formData.get("token_hash");
  const rawType = formData.get("type");
  const requestedNext = formData.get("next");

  const allowedTypes: EmailOtpType[] = [
    "signup",
    "invite",
    "magiclink",
    "recovery",
    "email_change",
    "email",
  ];

  if (
    typeof tokenHash !== "string" ||
    !tokenHash ||
    typeof rawType !== "string" ||
    !allowedTypes.includes(rawType as EmailOtpType)
  ) {
    return NextResponse.redirect(
      new URL(
        "/auth/error?error=Missing%20or%20invalid%20invitation%20token",
        request.url,
      ),
      303,
    );
  }

  const next =
    typeof requestedNext === "string" &&
      requestedNext.startsWith("/") &&
      !requestedNext.startsWith("//")
      ? requestedNext
      : "/protected";

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    type: rawType as EmailOtpType,
    token_hash: tokenHash,
  });

  if (error) {
    console.error(
      "Authentication confirmation failed:",
      error.message,
    );

    return NextResponse.redirect(
      new URL(
        "/auth/error?error=Invalid%20or%20expired%20confirmation%20link",
        request.url,
      ),
      303,
    );
  }

  return NextResponse.redirect(
    new URL(next, request.url),
    303,
  );
}
