import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const threshold = 100;
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
