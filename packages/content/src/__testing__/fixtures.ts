import { exampleTheme } from "@taxkit/mdx/testing/fixtures";
import { Effect, Schema } from "effect";

import { DocsPublicCatalogue } from "../schemas.js";

// Checked, controlled test data does not accept any authored MDX for publication.
export const exampleContentCatalogue = exampleTheme.pipe(
  Effect.flatMap((theme) =>
    Schema.decodeEffect(DocsPublicCatalogue)({
      navigation: {
        primaryNavigation: [
          {
            pageType: "guide",
            pages: [],
            path: "/start/overview",
            primaryReader: "New contributor",
            source: "start/overview.mdx",
            title: "Start here",
          },
        ],
      },
      pages: [
        {
          theme,
          body: [
            {
              content: [
                {
                  kind: "text",
                  text: "The supported calculator returns checked results.",
                },
              ],
              kind: "paragraph",
            },
          ],
          frontmatter: {
            description: "Read the checked public guide.",
            status: "published",
            title: "Start here",
          },
          markdown:
            "# Start here\n\nThe supported calculator returns checked results.\n",
          path: "/start/overview",
          slugs: ["start", "overview"],
          source: "start/overview.mdx",
        },
      ],
      schemaVersion: 2,
    })
  )
);
