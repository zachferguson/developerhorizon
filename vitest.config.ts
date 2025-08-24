import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./testSetup.ts"],
        css: true,
        coverage: { provider: "v8", reporter: ["text", "html", "lcov"] },
    },
});
