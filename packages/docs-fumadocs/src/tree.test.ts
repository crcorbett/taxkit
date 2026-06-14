import { describe, expect, it } from "vitest";

import { createPageTreeRoot } from "./tree.js";

describe("createPageTreeRoot", () => {
  it("converts the generic docs tree contract to a Fumadocs page tree", () => {
    expect(
      createPageTreeRoot({
        children: [
          {
            children: [
              {
                description: "Install and call the SDK.",
                name: "Quickstart",
                type: "page",
                url: "/docs/start/quickstart",
              },
            ],
            description: "Start here.",
            name: "Start",
            type: "folder-link",
            url: "/docs/start",
          },
          {
            name: "Reference",
            type: "separator",
          },
        ],
        name: "Documentation",
      })
    ).toEqual({
      children: [
        {
          children: [
            {
              description: "Install and call the SDK.",
              name: "Quickstart",
              type: "page",
              url: "/docs/start/quickstart",
            },
          ],
          collapsible: undefined,
          defaultOpen: undefined,
          description: "Start here.",
          index: {
            description: "Start here.",
            name: "Start",
            type: "page",
            url: "/docs/start",
          },
          name: "Start",
          type: "folder",
        },
        {
          name: "Reference",
          type: "separator",
        },
      ],
      name: "Documentation",
    });
  });
});
