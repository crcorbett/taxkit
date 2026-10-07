import { CalculatorCatalogResponse } from "@taxkit/api-rpc/schemas";
import { Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";

import { WebsiteBrowserToolFailure } from "./browser-tools.schemas";
import { WebsiteCalculatorForm } from "./form.boundary";
import { WebsiteCalculatorViewState } from "./schemas";

// Native callbacks supply unknown input. Decode it directly into the owning
// EmptyParams contract: an empty Struct alone accepts excess fields in 4.0.0.
const NoArguments = Schema.Unknown.pipe(Schema.decodeTo(Tool.EmptyParams));

// These operations act on the mounted page, so their names and inputs differ
// from remote MCP's catalogue/calculation operations. Both interfaces still
// use the owning catalogue/report Schemas and the same calculation service.
export const WebsiteBrowserToolkit = Toolkit.make(
  Tool.make("taxkit_find_calculators", {
    description:
      "Read the same supported calculator list shown in this page's navigation. Choose a calculator through the visible links.",
    failure: Schema.toCodecJson(WebsiteBrowserToolFailure),
    parameters: NoArguments,
    success: Schema.toCodecJson(CalculatorCatalogResponse),
  })
    .annotate(Tool.Readonly, true)
    .annotate(Tool.Strict, true),
  Tool.make("taxkit_read_calculator", {
    description:
      "Read the mounted calculator's visible form, current or retained answer, waiting state and safe message. A stale answer does not match the current form.",
    failure: Schema.toCodecJson(WebsiteBrowserToolFailure),
    parameters: NoArguments,
    success: Schema.toCodecJson(WebsiteCalculatorViewState),
  })
    .annotate(Tool.Readonly, true)
    .annotate(Tool.Strict, true),
  Tool.make("taxkit_fill_calculator", {
    description:
      "Replace the mounted calculator's visible form fields. This cancels its unfinished calculation and marks any retained answer stale. Does not calculate or save figures.",
    failure: Schema.toCodecJson(WebsiteBrowserToolFailure),
    parameters: WebsiteCalculatorForm,
    success: Schema.toCodecJson(WebsiteCalculatorViewState),
  })
    .annotate(Tool.Readonly, false)
    .annotate(Tool.Strict, true),
  Tool.make("taxkit_calculate_visible_form", {
    description:
      "Press Calculate for the mounted calculator's current visible form and wait for that attempt. Uses the existing anonymous API allowance. Figures are not saved. Do not retry automatically.",
    failure: Schema.toCodecJson(WebsiteBrowserToolFailure),
    parameters: NoArguments,
    success: Schema.toCodecJson(WebsiteCalculatorViewState),
  })
    .annotate(Tool.Readonly, false)
    .annotate(Tool.Strict, true),
  Tool.make("taxkit_read_result", {
    description:
      "Read the answer currently displayed by the mounted calculator. Check stale, busy and message before using a retained answer.",
    failure: Schema.toCodecJson(WebsiteBrowserToolFailure),
    parameters: NoArguments,
    success: Schema.toCodecJson(WebsiteCalculatorViewState),
  })
    .annotate(Tool.Readonly, true)
    .annotate(Tool.Strict, true)
);
