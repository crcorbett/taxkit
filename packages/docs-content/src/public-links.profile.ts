import {
  DocsPublicLinkProfile,
  DocsRepositoryRevision,
} from "./public-links.schema.ts";

// Accepted source snapshot for current checked examples. Other repository
// citations retain their historical attribution. Refresh only after comparing
// the Git objects with the checked source and emitted guide fences.
export const docsPublicLinkProfile = DocsPublicLinkProfile.make({
  checkedExampleRevision: DocsRepositoryRevision.make(
    "dfc4bff4958967c186f6deebe2953416224fc5c6"
  ),
  repositoryRevision: DocsRepositoryRevision.make(
    "a151e51e8a30247526fa93412df046955846eca4"
  ),
  repositoryUrl: new URL("https://github.com/crcorbett/taxkit"),
});
