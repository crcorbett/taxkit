import { ManagedRuntime } from "effect";

import { ApiAppLayer } from "./server.js";

export const makeApiRuntime = () => ManagedRuntime.make(ApiAppLayer);
