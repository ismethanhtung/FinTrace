import type { Metadata } from "next";
import { NewsPageClient } from "../../components/news/NewsPageClient";

export const metadata: Metadata = {
    title: "News | FinTrace",
    description:
        "Theo dõi tin thị trường crypto với AI sentiment và luồng bài viết theo coin trong một trang chuyên biệt.",
};

export default function NewsPage() {
    return <NewsPageClient />;
}
