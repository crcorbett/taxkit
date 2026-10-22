import {
  DocsPublicLinkProfile,
  DocsRepositoryRevision,
} from "./public-links.schema.ts";

// Accepted source snapshot for current checked examples. Other repository
// citations retain their historical attribution. Refresh only after comparing
// the Git objects with the checked source and emitted guide fences.
export const docsPublicLinkProfile = DocsPublicLinkProfile.make({
  checkedExampleRevision: DocsRepositoryRevision.make(
    "093e6466e47ab3bd5c12f65e6bf1e5f94ac074ba"
  ),
  repositoryRevision: DocsRepositoryRevision.make(
    "a151e51e8a30247526fa93412df046955846eca4"
  ),
  repositoryUrl: new URL("https://github.com/crcorbett/taxkit"),
});
