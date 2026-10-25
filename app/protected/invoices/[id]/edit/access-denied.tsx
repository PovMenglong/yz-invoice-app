
import Link from "next/link";

export default function AccessDenied() {
    return (
        <main className="mx-auto max-w-2xl px-6 py-16">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-8">
                <h1 className="text-2xl font-bold text-amber-900">
                    Editing Not Allowed
                </h1>

                <p className="mt-3 text-amber-800">
                    You can view this invoice, but you are not authorized
                    to edit it. Only an administrator, the invoice creator,
                    or an assigned editor can make changes.
                </p>

                <Link
                    href="/protected"
                    className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3
                     font-medium text-white hover:bg-blue-700"
                >
                    Back to Dashboard
                </Link>
            </div>
        </main>
    );
}
