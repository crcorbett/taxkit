import type { loadWebsiteSettings } from "./loaders";

export interface RouterContext {
  readonly loadSettings: typeof loadWebsiteSettings;
}
