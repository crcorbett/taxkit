import { useAtomValue } from "@effect/atom-react";
import { createFileRoute } from "@tanstack/react-router";
import { Option } from "effect";

import { publicSettingsAtom } from "#/lib/calculator.atoms";

export const Route = createFileRoute("/agents")({
  component: function AgentsRoute() {
    const settings = useAtomValue(publicSettingsAtom);
    return (
      <section className="home">
        <h1>TaxKit for agents</h1>
        <p>
          Read the supported calculators and their input fields before sending a
          calculation. Use the returned tax year, breakdown and sources when
          explaining an answer.
        </p>
        {Option.isSome(settings) && (
          <ul>
            <li>
              <a
                href={
                  new URL("/api/docs/openapi.json", settings.value.apiOrigin)
                    .href
                }
              >
                API description for software (OpenAPI)
              </a>
            </li>
            <li>
              <a
                href={
                  new URL("/api/v1/calculators", settings.value.apiOrigin).href
                }
              >
                Supported calculator list
              </a>
            </li>
            <li>
              <a href={new URL("/api/docs", settings.value.apiOrigin).href}>
                API documentation and input details
              </a>
            </li>
          </ul>
        )}
        <p>
          The annual income-tax calculator’s Medicare thresholds are awaiting
          correction. Its answer may overstate the levy for some lower incomes.
        </p>
      </section>
    );
  },
});
