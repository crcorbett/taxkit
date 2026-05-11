import { createIsomorphicFn } from "@tanstack/react-start";

import { appRuntime as appRuntimeClient } from "./runtime.client";
import { appRuntime as appRuntimeServer } from "./runtime.server";

export const getAppRuntime = createIsomorphicFn()
  .server(() => appRuntimeServer)
  .client(() => appRuntimeClient);
