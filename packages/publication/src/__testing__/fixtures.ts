import { Schema } from "effect";

import { DocsDiscoverySettings } from "../schemas.js";

export const exampleDiscoverySettings = Schema.decodeEffect(
  DocsDiscoverySettings
)({
  apiOrigin: "https://api.example.com",
  publicationOrigin: "https://website.example.com",
});
