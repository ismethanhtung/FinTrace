import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
    default: {
        runtime: "edge",
    },
    // Nếu bạn có các hàm đặc biệt cần cấu hình thêm thì thêm ở đây
};

export default config;
