import { runServer } from "$/lib/runtime.server";
import type { TaxQuestion } from "@packages/tax/schemas";
import { WhatTaxService } from "@packages/tax/service";
import { Button } from "@packages/ui/ui/button";
import { Surface } from "@packages/ui/ui/surface";
import { IconArrowRight, IconReceiptTax } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";

const getTaxBrief = createServerFn({ method: "GET" }).handler(() =>
  runServer(
    Effect.gen(function* loadTaxBrief() {
      const service = yield* WhatTaxService;
      return yield* service.getBrief();
    })
  )
);

export const Route = createFileRoute("/")({
  component: Home,
  loader: () => getTaxBrief(),
});

function Home() {
  const brief = Route.useLoaderData();

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_24rem] md:items-start">
      <Surface corner="br" className="space-y-8 py-2">
        <div className="flex size-10 items-center justify-center border border-border bg-bg-elevated text-beacon">
          <IconReceiptTax className="size-5" />
        </div>
        <div className="space-y-4">
          <h1 className="max-w-3xl text-3xl font-medium tracking-normal text-foreground md:text-4xl">
            WhatTax
          </h1>
          <p className="max-w-prose text-lg text-fg-muted">{brief.headline}</p>
        </div>
        <Button size="lg" className="w-fit">
          Start a model
          <IconArrowRight data-icon="inline-end" />
        </Button>
      </Surface>

      <section aria-labelledby="questions-heading" className="space-y-4">
        <h2
          id="questions-heading"
          className="font-mono text-xs tracking-loose text-fg-muted uppercase"
        >
          First domains
        </h2>
        <ul className="space-y-3">
          {brief.questions.map((question: TaxQuestion) => (
            <li
              key={`${question.jurisdiction}-${question.topic}`}
              className="border border-border bg-bg-elevated p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium text-foreground">
                  {question.topic}
                </h3>
                <span className="font-mono text-xs text-fg-subtle">
                  {question.jurisdiction}
                </span>
              </div>
              <p className="text-sm text-fg-muted">{question.summary}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
