import {presetWind4} from "@unocss/preset-wind4";

const unoConfig = {
  content: {
    filesystem: [
      "src/**/*.{js,jsx,ts,tsx,mdx}",
      "scripts/**/*.{js,mjs,ts}",
    ],
  },
  presets: [
    presetWind4({
      preflights: {
        reset: true,
      },
    }),
  ],
  theme: {
    colors: {
      primary: "var(--color-primary)",
      secondary: "var(--color-secondary)",
      accent: "var(--color-accent)",
    },
  },
};

export default unoConfig;
