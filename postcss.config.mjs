import path from "node:path";

const unoPostcssAdapter = path.join(process.cwd(), "scripts", "postcss-unocss.cjs");

const config = {
  plugins: {
    [unoPostcssAdapter]: {},
  },
};

export default config;
