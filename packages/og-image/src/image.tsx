import type { DocsOgImage } from "@taxkit/content/schemas";
import type { ReactElement } from "react";

import { cardColours } from "./theme.js";

// The 1200 × 630 documentation card: product line, page title and description,
// and the page's address.
export const pageImage = (image: DocsOgImage): ReactElement => (
  <div
    style={{
      backgroundColor: cardColours.background,
      color: cardColours.foreground,
      display: "flex",
      flexDirection: "column",
      fontFamily: "Geist",
      height: "100%",
      justifyContent: "space-between",
      padding: 64,
      width: "100%",
    }}
  >
    <span style={{ color: cardColours.accent, fontSize: 30, fontWeight: 600 }}>
      TaxKit · Developer docs
    </span>
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <span
        style={{
          fontSize: 64,
          fontWeight: 700,
          lineClamp: 3,
          lineHeight: 1.08,
          textOverflow: "ellipsis",
          textWrap: "balance",
        }}
      >
        {image.title}
      </span>
      <span
        style={{
          fontSize: 28,
          lineClamp: 3,
          lineHeight: 1.35,
          textOverflow: "ellipsis",
        }}
      >
        {image.description}
      </span>
    </div>
    <span style={{ color: cardColours.muted, fontSize: 24 }}>{image.path}</span>
  </div>
);
