import type { ShikiTransformer, ShikiTransformerContext } from "@shikijs/core";
import { Option, Schema } from "effect";

import { FumadocsCodeBlockMeta } from "./schemas.ts";

type CodeBlockNode = Parameters<NonNullable<ShikiTransformer["pre"]>>[0];
type CodeBlockOptions = Pick<
  ShikiTransformerContext["options"],
  "lang" | "meta"
>;

export const applyCodeBlockMeta = (
  node: CodeBlockNode,
  options: CodeBlockOptions
): CodeBlockNode => {
  const titled = Schema.decodeUnknownOption(FumadocsCodeBlockMeta)(
    options.meta
  ).pipe(
    Option.flatMap((meta) => Option.fromUndefinedOr(meta.title)),
    Option.match({
      onNone: () => node.properties,
      onSome: (title) => ({ ...node.properties, "data-title": title }),
    })
  );
  const properties = Option.fromUndefinedOr(options.lang).pipe(
    Option.match({
      onNone: () => titled,
      onSome: (language) => ({ ...titled, "data-language": language }),
    })
  );
  return { ...node, properties };
};
