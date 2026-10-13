import type * as Axiom from "alchemy/Axiom";
import { Array, pipe } from "effect";

type DashboardDocument = Omit<
  Axiom.DashboardProps["dashboard"],
  "charts" | "layout"
> & {
  readonly charts: Axiom.Chart[];
  readonly layout: Axiom.LayoutCell[];
};

export interface TaxKitDashboardDefinition {
  readonly logicalId: string;
  readonly uid: string;
  readonly dashboard: DashboardDocument;
}

interface TaxKitDashboardIdentity {
  readonly logicalId: string;
  readonly name: string;
  readonly uid: string;
  /** Starts the ids of the dashboard's note and service filter. */
  readonly chartIdPrefix: string;
}

/** One panel and its place on the dashboard's twelve-column grid. */
interface TaxKitPanel {
  readonly chart: Axiom.Chart;
  readonly at: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
}

/**
 * A dashboard is its service filter, a note and its panels, in that order.
 * Every dashboard opens with the same two full-width rows, so panels start at
 * row 4. A panel's id is written once, on its chart.
 */
export const defineTaxKitDashboard = ({
  description,
  identity,
  note,
  panels,
}: {
  readonly description: string;
  readonly identity: TaxKitDashboardIdentity;
  readonly note: string;
  readonly panels: readonly TaxKitPanel[];
}): TaxKitDashboardDefinition => {
  const noteId = `${identity.chartIdPrefix}-note`;
  const filterId = `${identity.chartIdPrefix}-service-filter`;
  return {
    dashboard: {
      charts: [
        {
          filters: [
            {
              active: true,
              id: "service",
              name: "Service",
              options: [
                { key: "API", value: "taxkit-api" },
                { key: "Website", value: "taxkit-web" },
              ],
              selectType: "list",
              type: "select",
            },
          ],
          id: filterId,
          type: "SmartFilter",
        },
        { id: noteId, text: note, type: "Note" },
        ...pipe(
          panels,
          Array.map(({ chart }) => chart)
        ),
      ],
      description,
      layout: [
        { h: 1, i: filterId, w: 12, x: 0, y: 0 },
        { h: 3, i: noteId, w: 12, x: 0, y: 1 },
        ...pipe(
          panels,
          Array.map(({ at, chart }) => ({ i: chart.id, ...at }))
        ),
      ],
      name: identity.name,
      // API tokens may only write organisation-shared dashboards.
      owner: "",
      refreshTime: 60,
      schemaVersion: 2,
      timeWindowEnd: "qr-now",
      timeWindowStart: "qr-now-24h",
    },
    logicalId: identity.logicalId,
    uid: identity.uid,
  };
};
