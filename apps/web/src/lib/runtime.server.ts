import "@tanstack/react-start/server-only";
import { WhatTaxApiInProcessClientLive } from "@whattax/http-api/client/server";
import { ManagedRuntime } from "effect";

export const appRuntime = ManagedRuntime.make(WhatTaxApiInProcessClientLive);
