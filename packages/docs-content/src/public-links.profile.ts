import {
  DocsPublicLinkProfile,
  DocsRepositoryRevision,
} from "./public-links.schema.ts";

// Accepted source snapshot for current checked examples. Other repository
// citations retain their historical attribution. Refresh only after comparing
// the Git objects with the checked source and emitted guide fences.
export const docsPublicLinkProfile = DocsPublicLinkProfile.make({
  checkedExampleRevision: DocsRepositoryRevision.make(
    "def3630768813429a9336df7a276f3da0de0fc9a"
  ),
  repositoryRevision: DocsRepositoryRevision.make(
    "a151e51e8a30247526fa93412df046955846eca4"
  ),
  repositoryUrl: new URL("https://github.com/crcorbett/taxkit"),
});
