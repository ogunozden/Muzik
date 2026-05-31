import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {describe, expect, it} from "vitest";

const root = process.cwd();
const nextConfigUrl = pathToFileURL(path.join(root, "next.config.mjs")).href;
const externalReferencePolicy = JSON.parse(
  fs.readFileSync(path.join(root, "src/data/references/external-reference-policy.json"), "utf8"),
);
let importCounter = 0;

async function loadNextConfigForEnv(nodeEnv) {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;

  try {
    importCounter += 1;
    const nextConfigModule = await import(`${nextConfigUrl}?test-env=${nodeEnv}-${importCounter}`);
    return nextConfigModule.default;
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
}

describe("next security headers", () => {
  it("derives frame-src from the centralized external reference policy", async () => {
    const nextConfig = await loadNextConfigForEnv("production");
    const headers = await nextConfig.headers();
    const globalHeaders = headers.find((entry) => entry.source === "/:path*")?.headers ?? [];
    const csp = globalHeaders.find((header) => header.key === "Content-Security-Policy")?.value;

    expect(csp).toContain(`frame-src ${externalReferencePolicy.allowedFrameSources.join(" ")}`);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self' https: ws: wss:");
  });

  it("leaves Next static asset caching to Next.js", async () => {
    const nextConfig = await loadNextConfigForEnv("production");
    const headers = await nextConfig.headers();
    const staticHeaders = headers.find((entry) => entry.source === "/_next/static/:path*");

    expect(staticHeaders).toBeUndefined();
  });
});
