import {
  defineFumadocsConfig,
  defineFumadocsDocsWithMeta,
  effectSchemaToStandardSchema,
} from "@whattax/docs-fumadocs/config";

import { DocsMeta, DocsPageFrontmatter } from "./src/schemas.ts";

const docsFrontmatterSchema = effectSchemaToStandardSchema(DocsPageFrontmatter);

const docsMetaSchema = effectSchemaToStandardSchema(DocsMeta);

const docsCollection = defineFumadocsDocsWithMeta({
  dir: "../../apps/docs/content",
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

export default defineFumadocsConfig();
