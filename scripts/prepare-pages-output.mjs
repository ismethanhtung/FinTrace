import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const cwd = process.cwd();
const openNextDir = join(cwd, ".open-next");
const assetsDir = join(openNextDir, "assets");

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function copyIfExists(src, dest) {
  if (!existsSync(src)) return;
  cpSync(src, dest, { recursive: true, force: true });
}

ensureDir(assetsDir);

copyIfExists(join(openNextDir, "worker.js"), join(assetsDir, "_worker.js"));
copyIfExists(join(openNextDir, "cloudflare"), join(assetsDir, "cloudflare"));
copyIfExists(join(openNextDir, "middleware"), join(assetsDir, "middleware"));
copyIfExists(
  join(openNextDir, "server-functions"),
  join(assetsDir, "server-functions"),
);
copyIfExists(join(openNextDir, ".build"), join(assetsDir, ".build"));

const routesConfig = {
  version: 1,
  description:
    "Serve static assets directly on Pages, route app/API traffic to OpenNext worker",
  include: ["/*"],
  exclude: [
    "/_next/static/*",
    "/favicon.ico",
    "/favicon.svg",
    "/loading.gif",
    "/logo.gif",
    "/*.css",
    "/*.js",
    "/*.map",
    "/*.png",
    "/*.jpg",
    "/*.jpeg",
    "/*.gif",
    "/*.webp",
    "/*.svg",
    "/*.ico",
    "/BUILD_ID",
  ],
};

writeFileSync(
  join(assetsDir, "_routes.json"),
  JSON.stringify(routesConfig, null, 2),
  "utf8",
);

console.log("Prepared Pages output:", assetsDir);
