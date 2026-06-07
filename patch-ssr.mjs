// Post-build patch: replace the vite-runtime ssr-renderer with real SSR handler
import { writeFileSync, readdirSync } from "fs";
import { resolve } from "path";

// Find the _ssr/index.mjs — it's always named index.mjs (the entry point)
const ssrDir = resolve(".output/server/_ssr");
const files = readdirSync(ssrDir);
console.log("SSR files found:", files);

// The main entry is index.mjs
const ssrEntry = files.find(f => f === "index.mjs");
if (!ssrEntry) {
  console.error("Could not find _ssr/index.mjs! Files:", files);
  process.exit(1);
}

// Read the index.mjs to find what it actually exports
import { readFileSync } from "fs";
const indexContent = readFileSync(resolve(ssrDir, "index.mjs"), "utf8");
console.log("SSR index.mjs exports snippet:", indexContent.slice(-300));

const patch = `import { a as HTTPError } from "../_libs/h3.mjs";
import "../_libs/rou3.mjs";

// Dynamically import the real built SSR index
const ssrModulePromise = import("../_ssr/index.mjs");

async function ssrRenderer({ req }) {
  try {
    const mod = await ssrModulePromise;
    // Try .default.fetch, .fetch, or .default directly
    const handler = mod.default?.fetch ?? mod.fetch ?? mod.default;
    if (typeof handler !== "function") {
      console.error("[ssr-renderer] Available exports:", Object.keys(mod));
      throw new Error("No fetch handler found in SSR module");
    }
    const request = req.raw ?? req;
    return await handler(request, {}, {});
  } catch (err) {
    console.error("[ssr-renderer] Error:", err);
    throw HTTPError.status(500);
  }
}

export { ssrRenderer as default };
`;

writeFileSync(".output/server/_chunks/ssr-renderer.mjs", patch);
console.log("✓ Patched ssr-renderer.mjs to use real SSR bundle");
