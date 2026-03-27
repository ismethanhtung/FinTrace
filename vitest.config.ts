import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: [
            "src/**/*.test.ts",
            "src/**/*.test.tsx",
            "tests/**/*.test.ts",
        ],
        setupFiles: ["./vitest.setup.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "lcov", "json-summary"],
            reportsDirectory: "./coverage",
            include: ["src/**/*.ts", "src/**/*.tsx"],
            exclude: [
                "src/**/*.d.ts",
                "src/**/*.test.ts",
                "src/**/*.test.tsx",
                "src/**/__tests__/**",
                "src/app/layout.tsx",
                "src/app/**/loading.tsx",
            ],
            thresholds: {
                lines: 0,
                functions: 0,
                branches: 0,
                statements: 0,
            },
        },
        projects: [
            {
                test: {
                    name: "unit",
                    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
                    exclude: [
                        "src/**/*.integration.test.ts",
                        "src/**/*.contract.test.ts",
                        "src/**/*.perf.test.ts",
                        "src/**/*.e2e.test.ts",
                    ],
                    environment: "node",
                },
            },
            {
                test: {
                    name: "integration",
                    include: ["src/**/*.integration.test.ts"],
                    environment: "node",
                },
            },
            {
                test: {
                    name: "contract",
                    include: ["src/**/*.contract.test.ts"],
                    environment: "node",
                },
            },
            {
                test: {
                    name: "perf",
                    include: ["src/**/*.perf.test.ts"],
                    environment: "node",
                    testTimeout: 30_000,
                },
            },
            {
                test: {
                    name: "e2e",
                    include: ["tests/e2e/**/*.e2e.test.ts"],
                    environment: "node",
                    testTimeout: 60_000,
                },
            },
        ],
    },
});
