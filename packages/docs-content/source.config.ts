import { fileURLToPath } from "node:url";

import {
  defineFumadocsConfig,
  defineFumadocsDocsWithMeta,
  effectSchemaToStandardSchema,
  sharedMdxOptions,
} from "@taxkit/docs-fumadocs/config";
import { Result, Schema } from "effect";

import navigationJson from "./navigation.json" with { type: "json" };
import { DocsSourceError } from "./src/errors.ts";
import { remarkPublicDocsLinks } from "./src/public-links.boundary.ts";
import {
  DocsPublicLinkProfile,
  DocsRepositoryRevision,
} from "./src/public-links.schema.ts";
import {
  DocsMeta,
  DocsNavigation,
  DocsPageFrontmatter,
} from "./src/schemas.ts";

// Fumadocs loads this configuration synchronously. Check the single imported
// navigation representation here; runtime services retain their own file ingress.
// The SDK requires a configuration value or a thrown configuration failure.
// Discard decode details, and source Layers contain this fixed safe failure.
const navigation = Schema.decodeUnknownResult(DocsNavigation)(
  navigationJson
).pipe(
  Result.getOrThrowWith(
    () =>
      new DocsSourceError({
        message: "The documentation navigation configuration is invalid.",
        operation: "read",
      })
  )
);
const publicLinks = {
  contentRoot: new URL("content/", import.meta.url),
  navigation,
  profile: DocsPublicLinkProfile.make({
    repositoryRevision: DocsRepositoryRevision.make(
      "a151e51e8a30247526fa93412df046955846eca4"
    ),
    repositoryUrl: new URL("https://github.com/crcorbett/taxkit"),
  }),
  repositoryRoot: new URL("../../", import.meta.url),
};
const mdxOptions = sharedMdxOptions();

const docsFrontmatterSchema = effectSchemaToStandardSchema(DocsPageFrontmatter);

const docsMetaSchema = effectSchemaToStandardSchema(DocsMeta);

const docsCollection = defineFumadocsDocsWithMeta({
  dir: fileURLToPath(new URL("content", import.meta.url)),
  frontmatterSchema: docsFrontmatterSchema,
  metaSchema: docsMetaSchema,
});

export const docs: typeof docsCollection = {
  ...docsCollection,
  docs: {
    ...docsCollection.docs,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
};

export default defineFumadocsConfig({
  mdxOptions: {
    ...mdxOptions,
    remarkPlugins: (existing) => [
      [remarkPublicDocsLinks, publicLinks],
      ...mdxOptions.remarkPlugins(existing),
    ],
  },
});
