import { Schema } from "effect";

export class DocsDeploymentRetiredError extends Schema.TaggedError<DocsDeploymentRetiredError>()(
  "DocsDeploymentRetiredError",
  {}
) {}
