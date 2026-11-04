
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
    try {
        // 1. Verify the signed-in user.
        const supabase = await createClient();

        const {
            data: claimsData,
            error: claimsError,
        } = await supabase.auth.getClaims();

        const userId = claimsData?.claims?.sub;

        if (claimsError || typeof userId !== "string") {
            return NextResponse.json(
                { error: "You must sign in before inviting an employee." },
                { status: 401 },
            );
        }

        // 2. Verify active company membership and Admin role.
        const { data: membership, error: membershipError } = await supabase
            .from("company_members")
            .select("role, is_active")
            .eq("user_id", userId)
            .maybeSingle();

        if (membershipError) {
            console.error("Membership check failed:", membershipError.message);

            return NextResponse.json(
                { error: "Unable to verify your company permissions." },
                { status: 500 },
            );
        }

        if (!membership || !membership.is_active) {
            return NextResponse.json(
                { error: "You must be an active company member." },
                { status: 403 },
            );
        }

        if (membership.role !== "admin") {
            return NextResponse.json(
                { error: "Only company administrators can invite employees." },
                { status: 403 },
            );
        }

        // 3. Validate the submitted email.
        // 3. Validate the submitted email.
        const body: unknown = await request.json().catch(() => null);

        const bodyRecord =
            typeof body === "object" && body !== null
                ? (body as Record<string, unknown>)
                : null;

        const email =
            typeof bodyRecord?.email === "string"
                ? bodyRecord.email.trim().toLowerCase()
                : "";

        if (
            !email ||
            email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            return NextResponse.json(
                { error: "Please enter a valid email address." },
                { status: 400 },
            );
        }

        // 4. Create the privileged client only after authorization.
        const admin = createAdminClient();

        // 5. Find an existing Auth account, if one exists.
        // Supabase's invite endpoint rejects confirmed existing accounts.
        let existingUserId: string | null = null;

        let page = 1;
        const perPage = 1000;

        while (page <= 100) {
            const { data, error } = await admin.auth.admin.listUsers({
                page,
                perPage,
            });

            if (error) {
                console.error("Auth user lookup failed:", error.message);

                return NextResponse.json(
                    {
                        error: "Unable to check whether this email already has an account.",
                    },
                    { status: 500 },
                );
            }

            const found = data.users.find(
                (user) => user.email?.toLowerCase() === email,
            );

            if (found) {
                existingUserId = found.id;
                break;
            }

            if (data.users.length < perPage) {
                break;
            }

            page++;
        }

        if (page > 100 && !existingUserId) {
            return NextResponse.json(
                {
                    error: "Unable to complete the account lookup. Please contact support.",
                },
                { status: 500 },
            );
        }

        // 6. Existing accounts can be added to the company.
        if (existingUserId) {
            const {
                data: existingMembership,
                error: existingMembershipError,
            } = await admin
                .from("company_members")
                .select("is_active")
                .eq("user_id", existingUserId)
                .maybeSingle();

            if (existingMembershipError) {
                console.error(
                    "Existing membership lookup failed:",
                    existingMembershipError.message,
                );

                return NextResponse.json(
                    {
                        error: "Unable to check the employee's company access.",
                    },
                    { status: 500 },
                );
            }

            if (existingMembership) {
                return NextResponse.json(
                    {
                        error: existingMembership.is_active
                            ? "This person is already a company member."
                            : "This account already has an inactive company membership. Reactivate it through team management instead.",
                    },
                    { status: 409 },
                );
            }

            const { error: insertError } = await admin
                .from("company_members")
                .insert({
                    user_id: existingUserId,
                    role: "employee",
                    is_active: true,
                });

            if (insertError) {
                console.error(
                    "Existing employee membership insert failed:",
                    insertError.message,
                );

                return NextResponse.json(
                    {
                        error: "The existing account could not be added to your company.",
                    },
                    { status: 500 },
                );
            }

            return NextResponse.json({
                success: true,
                message:
                    "This existing account has been added as an employee. They can sign in using their existing credentials. No new invitation email was sent.",
                accountType: "existing",
            });
        }

        // 7. Invite a new account.
        const siteUrl =
            process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

        // Build the confirmation URL and safely encode the next destination.
        const redirectUrl = new URL("/auth/confirm", siteUrl);

        redirectUrl.searchParams.set(
            "next",
            "/auth/update-password?next=%2Fprotected",
        );

        const redirectTo = redirectUrl.toString();

        const { data: inviteData, error: inviteError } =
            await admin.auth.admin.inviteUserByEmail(email, {
                redirectTo,
                data: {
                    company_name: "Y&Z Home Store Cambodia",
                    invited_role: "employee",
                },
            });

        if (inviteError || !inviteData.user) {
            console.error(
                "Employee invitation failed:",
                inviteError?.message,
            );

            return NextResponse.json(
                {
                    error:
                        inviteError?.message ||
                        "Supabase could not create the employee invitation.",
                },
                { status: 400 },
            );
        }

        // 8. Add the invited Auth user to company_members.
        const invitedUserId = inviteData.user.id;

        const { error: membershipInsertError } = await admin
            .from("company_members")
            .insert({
                user_id: invitedUserId,
                role: "employee",
                is_active: true,
            });

        if (membershipInsertError) {
            console.error(
                "Invited employee membership insert failed:",
                membershipInsertError.message,
            );

            // Roll back the newly created Auth user if company membership
            // could not be created.
            const { error: rollbackError } =
                await admin.auth.admin.deleteUser(invitedUserId);

            if (rollbackError) {
                console.error(
                    "Invitation rollback failed:",
                    rollbackError.message,
                );
            }

            return NextResponse.json(
                {
                    error:
                        "The invitation could not be completed because company access could not be created. Please check the server logs before trying again.",
                },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            message: `An invitation email has been sent to ${email}.`,
            accountType: "new",
        });

    } catch (error) {
        console.error("Unexpected employee invitation error:", error);

        return NextResponse.json(
            {
                error: "An unexpected error occurred while inviting the employee.",
            },
            { status: 500 },
        );
    }
}
