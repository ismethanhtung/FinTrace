import { redirect } from "next/navigation";

export default function DataPage() {
    // Back-compat for menu link while Data Streams page lives at /data-stream.
    redirect("/data-stream");
}

