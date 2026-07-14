import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ["server.js"],
    languageOptions: {
      sourceType: "commonjs",
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "gereksiz/**",
      "next-env.d.ts",
      // GitNexus indeksleyicisinin urettigi arac dosyalari (git-ignored);
      // .cjs icinde mesru require() kullanir, bizim lint kapsamimiz disi.
      ".gitnexus/**",
    ],
  },
];

export default eslintConfig;
