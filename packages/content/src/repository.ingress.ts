import repositoryRepresentation from "@content/docs/repository.json" with { type: "json" };
import { Schema } from "effect";

import { DocsRepositoryProfile } from "./schemas.js";

// The authored repository profile: link policy and page edit links read it
// through this one checked decode.
export const docsRepositoryProfile = Schema.decodeEffect(DocsRepositoryProfile)(
  repositoryRepresentation
);
