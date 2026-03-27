import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Tạm thời "tắt" enforcement theo yêu cầu:
// - Mặc định lấy threshold từ env nếu có, nếu không sẽ là 0 (không fail).
// - Dùng trong CI như là biến cấu hình tuỳ thời điểm.
const threshold = Number(process.env.COVERAGE_THRESHOLD ?? 0);
const summaryPath = resolve(process.cwd(), "coverage/coverage-summary.json");
const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const total = summary.total;

const metrics = [
    ["lines", total.lines?.pct ?? 0],
    ["statements", total.statements?.pct ?? 0],
    ["functions", total.functions?.pct ?? 0],
    ["branches", total.branches?.pct ?? 0],
];

const failed = metrics.filter(([, pct]) => pct < threshold);

if (failed.length > 0) {
    for (const [name, pct] of failed) {
        console.error(
            `[coverage] ${name}=${pct}% < required ${threshold}%`,
        );
    }
    process.exit(1);
}

console.log(
    `[coverage] all metrics passed at ${threshold}%: ` +
        metrics.map(([name, pct]) => `${name}=${pct}%`).join(", "),
);
