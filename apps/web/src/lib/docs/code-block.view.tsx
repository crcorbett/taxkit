import { MdxCodeBlock } from "@taxkit/mdx-react/code-block";
import type { MdxCodeBlockProps } from "@taxkit/mdx-react/code-block";

import { DocsCopyButton } from "./copy-button.container";

export const DocsCodeBlock = (
  props: Pick<MdxCodeBlockProps, "language" | "lines">
) => (
  <MdxCodeBlock
    {...props}
    className="docs-code-block"
    renderToolbar={({ label, text }) => (
      <DocsCopyButton label={`Copy ${label} code`} text={text} />
    )}
  />
);
