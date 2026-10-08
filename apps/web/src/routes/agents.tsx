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
          Connect an AI app to TaxKit to find calculators, read their input
          fields, calculate and read documentation. The tools use the same
          calculations as this website.
        </p>
        <h2>Connect a remote AI app</h2>
        <p>
          In an app that supports remote MCP servers, add a server called
          TaxKit. MCP lets an AI app call the tools offered by a service. Choose
          Streamable HTTP and paste the address below. No TaxKit account or API
          key is required.
        </p>
        {Option.isSome(settings) && (
          <>
            <p>
              <a href={new URL("/mcp", settings.value.apiOrigin).href}>
                <code className="agent-endpoint">
                  {new URL("/mcp", settings.value.apiOrigin).href}
                </code>
              </a>
            </p>
            <p>
              <a href="/api/agent-tools">
                Agent connection guide and tool list
              </a>
            </p>
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
                    new URL("/api/v1/calculators", settings.value.apiOrigin)
                      .href
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
          </>
        )}
        <p>
          Read the supported calculators and their input fields before sending a
          calculation. Use the returned tax year, breakdown and sources when
          explaining an answer. If a call fails, check its message before trying
          again. Calculations are not retried automatically.
        </p>
        <h2>Work with the visible calculator</h2>
        <p>
          An experimental browser with WebMCP support can offer tools for the
          calculator you have open. Its agent can fill the visible fields, press
          Calculate and read the displayed answer. Changing fields makes the
          previous answer out of date. Leaving the calculator removes its tools
          and stops its unfinished browser work.
        </p>
        <p>
          Ordinary browsers still work with the usual form and Calculate button.
          Browser support and agent access vary; connecting a remote MCP server
          does not grant access to the form in your browser.
        </p>
        <h2>Limits to keep in mind</h2>
        <p>
          Closing a modern remote request stops the client, but server work may
          continue until its five-second calculation limit. The connection guide
          explains older-client cancellation, connection expiry and request
          limits.
        </p>
        <p>
          The annual income-tax calculator’s Medicare thresholds are awaiting
          correction. Its answer may overstate the levy for some lower incomes.
        </p>
      </section>
    );
  },
});
