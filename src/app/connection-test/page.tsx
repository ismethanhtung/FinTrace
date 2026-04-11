import { redirect } from "next/navigation";

/** Trang kiểm tra kết nối đã chuyển vào Cài đặt → Kết nối. */
export default function ConnectionTestRedirectPage() {
    redirect("/settings?section=connectionTest");
}
