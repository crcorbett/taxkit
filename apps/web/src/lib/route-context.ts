import type {
  loadWebsiteDocsSearch,
  loadWebsiteDocsPage,
  loadWebsiteSettings,
} from "./loaders";

export interface RouterContext {
  readonly loadDocsSearch: typeof loadWebsiteDocsSearch;
  readonly loadDocsPage: typeof loadWebsiteDocsPage;
  readonly loadSettings: typeof loadWebsiteSettings;
}
