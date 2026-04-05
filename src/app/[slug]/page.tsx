import PageLayout from "../../components/PageLayout";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getMessagesByLocale, LOCALE_COOKIE_KEY, normalizeLocale } from "../../i18n/config";
import { translate } from "../../i18n/translate";

export default async function PlaceholderPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const cookieStore = await cookies();
    const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE_KEY)?.value);
    const messages = getMessagesByLocale(locale);
    const t = (
        key: Parameters<typeof translate>[1],
        values?: Parameters<typeof translate>[2],
    ) => translate(messages, key, values);
    const normalizedSlug = slug.trim().toLowerCase();

    // Prevent static asset-like paths from being rendered by the placeholder page.
    if (slug.includes(".")) {
        notFound();
    }

    // Only normalize case for known dedicated routes.
    // Avoid unconditional redirect that can loop in catch-all resolution.
    if (normalizedSlug === "liquidation" && slug !== "liquidation") {
        redirect("/liquidation");
    }

    const title = slug.charAt(0).toUpperCase() + slug.slice(1);
    return (
        <PageLayout title={title}>
            <div className="flex flex-col items-center justify-center w-full min-h-[min(70vh,560px)] py-10 sm:py-14">
                <div className="w-full max-w-[420px]   px-8 py-10 sm:px-10 sm:py-12 text-center space-y-6">
                    <div className="flex justify-center">
                        <Image
                            src="/loading.gif"
                            alt="Loading"
                            width={100}
                            height={100}
                            className="rounded-sm"
                            unoptimized
                            priority
                        />
                    </div>
                    <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                            {t("boardPage.comingSoon")}
                        </p>
                        <h2 className="text-[15px] font-semibold text-main tracking-tight">
                            {title}
                        </h2>
                        <p className="text-[12px] text-muted leading-relaxed">
                            {t("boardPage.boardComingSoon")}
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center px-4 py-1.5 bg-accent text-white rounded-md text-[11px] font-semibold hover:bg-accent/90 transition-colors shadow-sm"
                    >
                        {t("boardPage.backToDashboard")}
                    </Link>
                </div>
            </div>
        </PageLayout>
    );
}
