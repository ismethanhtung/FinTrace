import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const filesToCheck = [".env.example", "package.json"];
const suspiciousPatterns = [
    /sk-[A-Za-z0-9]{20,}/,
    /AIza[0-9A-Za-z\-_]{20,}/,
    /ghp_[A-Za-z0-9]{20,}/,
    /xox[baprs]-[A-Za-z0-9-]{10,}/,
];

let failed = false;

for (const file of filesToCheck) {
    const content = readFileSync(resolve(process.cwd(), file), "utf8");
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
            failed = true;
            console.error(`[security] Potential secret in ${file}: ${pattern}`);
        }
    }
}

if (failed) {
    process.exit(1);
}

console.log("[security] secret pattern scan passed");
