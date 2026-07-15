import "@tanstack/react-start/server-only";
import { DocsContentServiceLive } from "@taxkit/docs-content/live";
import { ManagedRuntime } from "effect";

export const docsRuntime = ManagedRuntime.make(DocsContentServiceLive);
