import { defineConfig } from "vitest/config";
import path from "node:path";
import { existsSync } from "node:fs";

for (const key of ["TMPDIR", "TEMP", "TMP"] as const) {
  if (process.env[key] && !existsSync(process.env[key])) {
    process.env[key] = "/tmp";
  }
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname)
    }
  },
  test: {
    environment: "node",
    globals: true,
    include: ["lib/**/*.test.ts", "components/**/*.test.tsx", "app/**/*.test.ts", "supabase/**/*.test.ts"]
  }
});
