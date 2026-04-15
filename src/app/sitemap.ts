import type { MetadataRoute } from "next";

const BASE_URL = "https://thanhtung.xyz";

const routes = [
    "/",
    "/chart",
    "/market",
    "/board",
    "/data-stream",
    "/transactions",
    "/news",
];

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();
    return routes.map((route) => ({
        url: `${BASE_URL}${route}`,
        lastModified,
        changeFrequency: "hourly",
        priority: route === "/" ? 1 : 0.8,
    }));
}
