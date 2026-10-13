import { FumadocsSourceTest } from "@taxkit/docs-fumadocs/test";
import { Layer } from "effect";

import { DocsContentServiceLive } from "./live.layer.js";

export const DocsContentServiceTest = DocsContentServiceLive.pipe(
  Layer.provide(FumadocsSourceTest)
);
