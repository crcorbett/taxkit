import { Schema } from "effect";

import { DocsPublicCatalogue } from "../schemas.js";

// Checked, controlled test data does not accept any authored MDX for publication.
export const exampleContentCatalogue = Schema.decodeEffect(DocsPublicCatalogue)(
  {
    navigation: {
      primaryNavigation: [
        {
          pageType: "guide",
          pages: [],
          path: "/start/overview",
          primaryReader: "New contributor",
          source: "content/start/overview.mdx",
          title: "Start here",
        },
      ],
    },
    pages: [
      {
        frontmatter: {
          description: "Read the checked public guide.",
          status: "published",
          title: "Start here",
        },
        markdown:
          "# Start here\n\nThe supported calculator returns checked results.",
        path: "/start/overview",
        slugs: ["start", "overview"],
        source: "content/start/overview.mdx",
      },
    ],
    schemaVersion: 1,
  }
);
