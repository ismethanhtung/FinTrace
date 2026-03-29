import { NextResponse } from "next/server";
import Parser from "rss-parser";
import { normalizeUniverse } from "../../../lib/marketUniverse";

const parser = new Parser();

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get("symbol");
        const universe = normalizeUniverse(searchParams.get("universe"));

        if (!symbol) {
            return NextResponse.json(
                { error: "Missing symbol parameter" },
                { status: 400 },
            );
        }

        const baseSymbol = symbol.replace(/USDT$/, "").replace(/USD$/, "");

        const query =
            universe === "stock"
                ? `Chứng khoán ${baseSymbol}`
                : `${baseSymbol} crypto`;
        const rssUrl =
            universe === "stock"
                ? `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=vi&gl=VN&ceid=VN:vi`
                : `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

        const feed = await parser.parseURL(rssUrl);

        const items = feed.items.slice(0, 15).map((item, index) => {
            let rawDesc =
                item.contentSnippet || item.content || item.summary || "";
            // Clean up description: strip basic HTML tags and trim
            const cleanDesc = rawDesc
                .replace(/(<([^>]+)>)/gi, "")
                .substring(0, 500);

            return {
                id: item.guid || String(index),
                title: item.title?.replace(/ - .*$/, "") || "Crypto News", // Remove site name from title
                url: item.link || "",
                source:
                    item.creator || item.source || feed.title || "Crypto News",
                publishedAt:
                    item.isoDate || item.pubDate || new Date().toISOString(),
                description: cleanDesc,
            };
        });

        return NextResponse.json({ items });
    } catch (error) {
        console.error("[API News] Error fetching RSS:", error);
        return NextResponse.json(
            { error: "Failed to fetch news" },
            { status: 500 },
        );
    }
}
