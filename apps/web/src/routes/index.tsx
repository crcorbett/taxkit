import { createFileRoute } from "@tanstack/react-router";
import { useContext } from "react";

import { TakeHomeCalculator } from "#/lib/take-home.container";

import { WebsiteSubmissionContext } from "./__root";

export const Route = createFileRoute("/")({
  component: function HomeRoute() {
    const submission = useContext(WebsiteSubmissionContext);
    return <TakeHomeCalculator submission={submission} />;
  },
});
