import { createFileRoute } from "@tanstack/react-router";

import { TakeHomeCalculator } from "#/lib/take-home.container";

export const Route = createFileRoute("/")({
  component: TakeHomeCalculator,
});
