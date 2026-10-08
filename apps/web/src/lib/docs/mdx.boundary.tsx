import { DocsPublicPage } from "@taxkit/content/schemas";
import { docsCollection } from "@taxkit/docs-content/client";
import { Effect, Result, Schema } from "effect";

import { docsMdxComponents } from "./components";
import { DocsPresentationUnavailable } from "./errors";

const CompiledPublicPage = Schema.Struct({
  _markdown: Schema.String,
  frontmatter: DocsPublicPage.fields.frontmatter,
});
const matchesCompiledPage = (
  compiled: typeof CompiledPublicPage.Type,
  page: DocsPublicPage
) =>
  compiled._markdown === page.markdown &&
  compiled.frontmatter.title === page.frontmatter.title &&
  compiled.frontmatter.description === page.frontmatter.description &&
  compiled.frontmatter.status === page.frontmatter.status;

const presentation = docsCollection.createClientLoader<{
  readonly page: DocsPublicPage;
}>({
  component(loaded, { page }) {
    const compiled = Schema.decodeUnknownResult(CompiledPublicPage)(loaded);
    if (
      Result.isFailure(compiled) ||
      !matchesCompiledPage(compiled.success, page)
    ) {
      return (
        <section role="alert">
          <h1>This documentation page needs to be reloaded</h1>
          <p>The page could not be displayed. Please reload it to try again.</p>
          <a href={page.path}>Reload this page</a>
        </section>
      );
    }
    const Document = loaded.default;
    return <Document components={docsMdxComponents} />;
  },
  id: "taxkit-website-public-docs",
});

// Read the compiler SDK's representation once. A differently activated API
// cannot silently pair its checked metadata with another compiled page body.
export const preloadDocsPresentation = (page: DocsPublicPage) =>
  Effect.tryPromise({
    catch: () => new DocsPresentationUnavailable(),
    try: () => presentation.preload(page.source.replace(/^content\//u, "")),
  }).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(CompiledPublicPage)),
    Effect.filterOrFail(
      (compiled) => matchesCompiledPage(compiled, page),
      () => new DocsPresentationUnavailable()
    ),
    Effect.mapError(() => new DocsPresentationUnavailable()),
    Effect.asVoid
  );

export const MdxDocument = ({ page }: { readonly page: DocsPublicPage }) =>
  presentation.useContent(page.source.replace(/^content\//u, ""), { page });
