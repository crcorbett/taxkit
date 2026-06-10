import "@tanstack/react-start/server-only";
import { DocsContentServiceLive } from "@whattax/docs-content/live";
import { ManagedRuntime } from "effect";

export const docsRuntime = ManagedRuntime.make(DocsContentServiceLive);
