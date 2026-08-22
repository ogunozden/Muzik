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

  it("uses nonce for script-src and keeps style-src unsafe-inline for UnoCSS", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      importCounter += 1;
      const mod = await import(`${nextConfigUrl}?test-nonce-${importCounter}`);
      const cspWithNonce = mod.contentSecurityPolicy("test-nonce-abc123");
      expect(cspWithNonce).toContain("script-src 'self' 'nonce-test-nonce-abc123'");
      expect(cspWithNonce).not.toMatch(/script-src[^;]*'unsafe-inline'/);
      expect(cspWithNonce).toContain("style-src 'self' 'unsafe-inline'");
      // default without nonce still uses placeholder nonce, not unsafe-inline
      const cspDefault = mod.contentSecurityPolicy();
      expect(cspDefault).toContain("'nonce-");
      expect(cspDefault).toContain("style-src 'self' 'unsafe-inline'");
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it("generates unique nonces via middleware and central policy", async () => {
    const middlewarePath = path.join(root, "middleware.ts");
    expect(fs.existsSync(middlewarePath)).toBe(true);
    const middlewareContent = fs.readFileSync(middlewarePath, "utf8");
    expect(middlewareContent).toContain("generateNonce");
    expect(middlewareContent).toContain("Content-Security-Policy");
    expect(middlewareContent).toContain("nonce-");
    expect(middlewareContent).toContain("style-src 'self' 'unsafe-inline'");
    expect(middlewareContent).toContain("allowedFrameSources");
    // dev still needs unsafe-eval alongside nonce
    const devMod = await loadNextConfigForEnv("development");
    const devHeaders = await devMod.headers();
    const devCsp = devHeaders.find((e) => e.source === "/:path*")?.headers.find((h) => h.key === "Content-Security-Policy")?.value ?? "";
    expect(devCsp).toContain("'nonce-");
    expect(devCsp).toContain("'unsafe-eval'");
  });
});
