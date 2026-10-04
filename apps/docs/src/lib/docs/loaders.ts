import { createServerFn } from "@tanstack/react-start";

import { loadDocsHomeServer, loadDocsPageServer } from "./loaders.server";

// The installed Start compiler extracts these handlers and removes their
// unused server imports from browser callers. Actual bundle/Worker proof is separate.
const loadDocsHomeData = createServerFn({ method: "GET" }).handler(() =>
  loadDocsHomeServer()
);
const loadDocsPageData = createServerFn({ method: "GET" })
  .inputValidator((input) => input)
  .handler(({ data }) => loadDocsPageServer(data));

export const loadDocsHome = () => loadDocsHomeData();
export const loadDocsPage = (loaderContext: {
  readonly params: { readonly _splat: string };
}) => loadDocsPageData({ data: { splat: loaderContext.params._splat } });
