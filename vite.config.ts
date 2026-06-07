import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "start" },
  },
  nitro: {
    preset: "node",
  },
});
