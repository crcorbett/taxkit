// Raw text imports. Alchemy's Worker build, Vite, Vitest and Bun load each
// file's text at build time.

// Authored documentation pages in `@content/docs`.
declare module "*.mdx?raw" {
  const text: string;
  export default text;
}

// The base64 share-image font in `@taxkit/og-image`.
declare module "*.txt?raw" {
  const base64: string;
  export default base64;
}
