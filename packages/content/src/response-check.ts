import type { DocsPagePath, DocsPublicPage } from "./schemas.js";

// The generated transport already checked the page. Content owns only the
// relationship between that checked reply and its requested identity.
export const isRequestedDocsPage = (
  path: DocsPagePath,
  page: DocsPublicPage
): boolean => page.path === path;
