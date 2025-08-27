import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./testSetup.ts"],
        css: true,
        coverage: {
            provider: "v8", // uses @vitest/coverage-v8
            reporter: ["text", "html", "lcov"],
            reportsDirectory: "coverage",
            include: ["src/**/*.{ts,tsx}"],
            exclude: [
                "**/*.d.ts",
                //"src/main.tsx", // adjust for your entry
                "src/vite-env.d.ts",
            ],
            // Optional thresholds — fail CI if coverage dips:
            // thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 }
        },
    },
});
