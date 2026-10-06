import type { loadWebsiteDocsPage, loadWebsiteSettings } from "./loaders";

export interface RouterContext {
  readonly loadDocsPage: typeof loadWebsiteDocsPage;
  readonly loadSettings: typeof loadWebsiteSettings;
}
