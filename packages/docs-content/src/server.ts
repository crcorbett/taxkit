import { loader } from "fumadocs-core/source";

import { docs } from "../.source/server.js";

export { docs } from "../.source/server.js";

export const source = loader({
  baseUrl: "",
  source: docs.toFumadocsSource(),
});
