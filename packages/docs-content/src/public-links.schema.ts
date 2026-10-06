import { Schema } from "effect";

export const DocsRepositoryRevision = Schema.String.check(
  Schema.isPattern(/^[a-f0-9]{40}$/u)
).pipe(Schema.brand("taxkit/DocsRepositoryRevision"));

export const DocsPublicLinkProfile = Schema.Struct({
  repositoryRevision: DocsRepositoryRevision,
  repositoryUrl: Schema.URL,
});
export type DocsPublicLinkProfile = typeof DocsPublicLinkProfile.Type;
