import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import type { RequestHandler } from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";
import { apiHandler } from "#/lib/server/api-handler.server";
import { appRuntime } from "#/lib/runtime.server";
import type { WhatTaxServerContext } from "#/lib/route-runtime";

type WhatTaxServerRequestContext = WhatTaxServerContext & {
  readonly serverContext?: WhatTaxServerContext;
};

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

type ServerEntry = { fetch: RequestHandler<Register> };

function createServerEntry(entry: ServerEntry): ServerEntry {
  return {
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
  };
}

export default createServerEntry({ fetch });
