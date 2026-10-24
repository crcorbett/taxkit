# Authored documentation

`@content/docs` owns TaxKit's public documentation as MDX, plus
`navigation.json`, which orders the pages and names each page's address, source
file, page type and primary reader.

The package is private and source-only. It contains no parsed page records,
Schemas, services or runtime. `sources.ts` lists every page as a raw `?raw`
import; `repository.json` records the GitHub revisions that repository-file
links use. The API build passes the list to `@taxkit/content`, which checks
the frontmatter, supported Markdown, links and navigation and writes the
checked catalogue the API Worker serves. The Website reads the API rather than importing these files.

`sources.ts` needs a host that loads `?raw` imports as text. Bun and Vitest
both do.

## Writing pages

Each page starts with YAML frontmatter (`title`, `description` and `status`) and
a single `#` heading. Pages can use headings, paragraphs, bold, italics, inline
code, links, lists, tables and fenced code blocks. A `mermaid` code block becomes
a diagram. JSX components, images and raw HTML are not supported.

Link to another page with its relative `.mdx` file. Content turns it into the
page's public address and rejects a page that is not in `navigation.json`.
Relative links to other repository files become GitHub links at the recorded
revision.

## Adding a page

Add the `.mdx` file, list it in `navigation.json`, and add its raw import to
`sources.ts`, then run `bun run build --filter=api`. The API tests check that the list and the files in this folder
agree, that every page builds, and that the public wording rules hold. The
examples tests check that copied guide snippets match their checked files.
