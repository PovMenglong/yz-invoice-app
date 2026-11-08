
export const instant = false;

import { Button } from "@/components/ui/button";

export default async function AcceptInvitationPage({
    searchParams,
}: {
    searchParams: Promise<{
        token_hash?: string;
        type?: string;
        next?: string;
    }>;
}) {
    const params = await searchParams;

    const tokenHash = params.token_hash;
    const type = params.type;
    const next =
        params.next &&
            params.next.startsWith("/") &&
            !params.next.startsWith("//")
            ? params.next
            : "/auth/update-password?next=%2Fprotected";

    const allowedTypes = [
        "invite",
        "signup",
        "magiclink",
        "recovery",
        "email_change",
        "email",
    ];

    const valid =
        typeof tokenHash === "string" &&
        tokenHash.length > 0 &&
        typeof type === "string" &&
        allowedTypes.includes(type);

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <h1 className="text-2xl font-semibold">
                        Accept Your Invitation
                    </h1>

                    <p className="mt-3 text-sm text-muted-foreground">
                        You've been invited to join Y&Z Home Store Cambodia
                        Invoice Management System.
                    </p>

                    {valid ? (
                        <form
                            action="/auth/confirm"
                            method="POST"
                            className="mt-6"
                        >
                            <input
                                type="hidden"
                                name="token_hash"
                                value={tokenHash}
                            />
                            <input
                                type="hidden"
                                name="type"
                                value={type}
                            />
                            <input
                                type="hidden"
                                name="next"
                                value={next}
                            />

                            <Button type="submit" className="w-full">
                                Accept Invitation
                            </Button>
                        </form>
                    ) : (
                        <div className="mt-6 space-y-3">
                            <p className="text-sm text-destructive">
                                This invitation link is incomplete or invalid.
                                Please contact your company administrator
                                for a new invitation.
                            </p>

                            <Button asChild className="w-full">
                                <a href="/auth/login">Go to Login</a>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
