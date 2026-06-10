import { createIsomorphicFn } from "@tanstack/react-start";

import { docsRuntime as docsRuntimeClient } from "./runtime.client";
import { docsRuntime as docsRuntimeServer } from "./runtime.server";

export const getDocsRuntime = createIsomorphicFn()
  .server(() => docsRuntimeServer)
  .client(() => docsRuntimeClient);
