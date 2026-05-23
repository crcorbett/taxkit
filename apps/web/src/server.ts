import type { Register } from "@tanstack/react-router";
import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import type { RequestHandler } from "@tanstack/react-start/server";

import type { WhatTaxServerContext } from "#/lib/route-runtime";
import { appRuntime } from "#/lib/runtime.server";
import { apiHandler } from "#/lib/server/api-handler.server";

interface WhatTaxServerRequestContext extends WhatTaxServerContext {
  readonly serverContext?: WhatTaxServerContext;
}

declare module "@tanstack/react-router" {
  interface Register {
    server: {
      requestContext: WhatTaxServerRequestContext;
    };
  }
}

const whatTaxServerContext: WhatTaxServerContext = {
  api: appRuntime,
  handleApiRequest: apiHandler,
};

const fetch = createStartHandler(defaultStreamHandler);

interface ServerEntry {
  fetch: RequestHandler<Register>;
}

const createServerEntry = (entry: ServerEntry): ServerEntry => ({
  async fetch(request, opts) {
    return await entry.fetch(request, {
      ...opts,
      context: {
        ...opts?.context,
        ...whatTaxServerContext,
        serverContext: whatTaxServerContext,
      },
    });
  },
});

export default createServerEntry({ fetch });
