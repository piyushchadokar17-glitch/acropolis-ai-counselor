// Post-build patch: replace the vite-runtime ssr-renderer with real SSR handler
import { writeFileSync } from "fs";

const patch = `import { a as HTTPError } from "../_libs/h3.mjs";
import "../_libs/rou3.mjs";

// Import the real built SSR bundle
import ssrModule from "../_ssr/index.mjs";

async function ssrRenderer({ req }) {
  try {
    const response = await ssrModule.fetch(req.raw ?? req, {}, {});
    return response;
  } catch (err) {
    console.error("[ssr-renderer] Error:", err);
    throw HTTPError.status(500);
  }
}

export { ssrRenderer as default };
`;

writeFileSync(".output/server/_chunks/ssr-renderer.mjs", patch);
console.log("✓ Patched ssr-renderer.mjs to use real SSR bundle");
