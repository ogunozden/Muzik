declare module "verovio" {
  const verovio: unknown;
  export = verovio;
}

declare module "verovio/wasm" {
  const createVerovioModule: () => Promise<unknown>;
  export default createVerovioModule;
}

declare module "verovio/esm" {
  export class VerovioToolkit {
    constructor(module: unknown);
    setOptions(options: unknown): void;
    loadData(data: string): boolean;
    renderToSVG(page: number, options?: unknown): string;
    getOptions?(): unknown;
    getDefaultOptions?(): unknown;
    renderData?(data: string, options: unknown): string;
  }
  const createVerovioModule: () => Promise<unknown>;
  export default createVerovioModule;
}
