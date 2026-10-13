import type { SharedDatasets } from "../../telemetry.js";
import { defineTaxKitDashboard } from "./definition.js";
import type { TaxKitDashboardDefinition } from "./definition.js";
import {
  countShareTable,
  requestQuery,
  requestSource,
  runtimeQuery,
  runtimeSource,
  serviceParameter,
} from "./queries.js";

const scope =
  "Counts are Production Worker requests from the hosts' fixed request records, not page views or visitors. Cached responses never reach a Worker and are not counted. Records hold a route family, method, status and outcome only: no URLs, query strings, headers, bodies, tax inputs or results.";

const overview = ({ logsDataset }: SharedDatasets) => {
  const requests = requestQuery(logsDataset);
  return defineTaxKitDashboard({
    description:
      "Is TaxKit healthy right now? Requests, errors and not-found probes for the Website and API.",
    identity: {
      chartIdPrefix: "taxkit-overview",
      logicalId: "TaxKitRequestOverview",
      name: "TaxKit Request Overview",
      uid: "taxkit-request-overview",
    },
    note: `${scope}\n\nErrors are 5xx responses or requests that failed or were cancelled before a response.`,
    panels: [
      {
        at: { h: 4, w: 3, x: 0, y: 4 },
        chart: {
          id: "taxkit-overview-requests",
          name: "Requests",
          query: { apl: `${requests} | summarize Requests=count()` },
          type: "Statistic",
        },
      },
      {
        at: { h: 4, w: 3, x: 3, y: 4 },
        chart: {
          id: "taxkit-overview-errors",
          name: "Errors (5xx or not completed)",
          query: {
            apl: `${requests} | where Result == 'Errors' | summarize Errors=count()`,
          },
          type: "Statistic",
        },
      },
      {
        at: { h: 4, w: 3, x: 6, y: 4 },
        chart: {
          id: "taxkit-overview-not-found",
          name: "Not found (404), for context",
          query: {
            apl: `${requests} | where Result == 'Not found' | summarize NotFound=count()`,
          },
          type: "Statistic",
        },
      },
      {
        at: { h: 4, w: 3, x: 9, y: 4 },
        chart: {
          id: "taxkit-overview-rejected",
          name: "Rejected (other 4xx)",
          query: {
            apl: `${requests} | where Result == 'Rejected (other 4xx)' | summarize Rejected=count()`,
          },
          type: "Statistic",
        },
      },
      {
        at: { h: 8, w: 12, x: 0, y: 8 },
        chart: {
          id: "taxkit-overview-requests-over-time",
          name: "Requests per hour",
          query: {
            apl: `${requests} | summarize Requests=count() by bin(_time, 1h)`,
          },
          type: "TimeSeries",
        },
      },
      {
        at: { h: 8, w: 6, x: 0, y: 16 },
        chart: {
          id: "taxkit-overview-routes",
          name: "Route family: requests and share",
          query: {
            apl: `${requests} | extend Family=strcat(Service, ' ', Route) ${countShareTable("Family", "Route family")}`,
          },
          type: "Table",
        },
      },
      {
        at: { h: 8, w: 6, x: 6, y: 16 },
        chart: {
          id: "taxkit-overview-results",
          name: "Result by service",
          query: {
            apl: `${requests} | summarize Requests=count() by Service, Result | sort by Service asc, Requests desc`,
          },
          type: "Table",
        },
      },
    ],
  });
};

const failures = ({ logsDataset }: SharedDatasets) => {
  const requests = requestQuery(logsDataset);
  return defineTaxKitDashboard({
    description:
      "What is failing, and is it new? Errors and cancelled requests, kept apart from 4xx probes and rejected input.",
    identity: {
      chartIdPrefix: "taxkit-failures",
      logicalId: "TaxKitRequestFailures",
      name: "TaxKit Request Failures",
      uid: "taxkit-request-failures",
    },
    note: `${scope}\n\nRuntime failures are the hosts' fixed failure events; their messages and causes are never exported.`,
    panels: [
      {
        at: { h: 4, w: 4, x: 0, y: 4 },
        chart: {
          id: "taxkit-failures-errors",
          name: "Errors (5xx or not completed)",
          query: {
            apl: `${requests} | where Result == 'Errors' | summarize Errors=count()`,
          },
          type: "Statistic",
        },
      },
      {
        at: { h: 4, w: 4, x: 4, y: 4 },
        chart: {
          id: "taxkit-failures-cancelled",
          name: "Cancelled before a response",
          query: {
            apl: `${requests} | where Outcome == 'interrupted' | summarize Cancelled=count()`,
          },
          type: "Statistic",
        },
      },
      {
        at: { h: 4, w: 4, x: 8, y: 4 },
        chart: {
          id: "taxkit-failures-runtime",
          name: "Runtime failure events",
          query: {
            apl: `${runtimeQuery(logsDataset)} | where Level == 'Error' | summarize Failures=count()`,
          },
          type: "Statistic",
        },
      },
      {
        at: { h: 7, w: 12, x: 0, y: 8 },
        chart: {
          id: "taxkit-failures-over-time",
          name: "Errors per hour",
          query: {
            apl: `${requests} | summarize Errors=countif(Result == 'Errors') by bin(_time, 1h)`,
          },
          type: "TimeSeries",
        },
      },
      {
        at: { h: 8, w: 6, x: 0, y: 15 },
        chart: {
          id: "taxkit-failures-recent",
          name: "Recent errors (no rows means none)",
          query: {
            apl: `${requests} | where Result == 'Errors' | project _time, Service, Route, Method, Status, Outcome | sort by _time desc | limit 50`,
          },
          type: "Table",
        },
      },
      {
        at: { h: 8, w: 6, x: 6, y: 15 },
        chart: {
          id: "taxkit-failures-client",
          name: "4xx by route family",
          query: {
            apl: `${requests} | where StatusClass == '4xx' | summarize Requests=count() by Service, Route, Status | sort by Requests desc | limit 20`,
          },
          type: "Table",
        },
      },
    ],
  });
};

const latency = ({ logsDataset }: SharedDatasets) => {
  const requests = requestQuery(logsDataset);
  return defineTaxKitDashboard({
    description:
      "How long do requests wait before their response is ready? Waiting time by service and route family.",
    identity: {
      chartIdPrefix: "taxkit-latency",
      logicalId: "TaxKitRequestLatency",
      name: "TaxKit Request Latency",
      uid: "taxkit-request-latency",
    },
    note: `${scope}\n\nWaiting time is read from the Workers clock between request start and a ready response. Cloudflare advances that clock only across I/O (API calls, cache and binding reads), so it excludes pure CPU time and is not page-load time. Streamed bodies and background work are excluded.`,
    panels: [
      {
        at: { h: 4, w: 6, x: 0, y: 4 },
        chart: {
          id: "taxkit-latency-median",
          name: "Median waiting time (ms)",
          query: {
            apl: `${requests} | where Outcome == 'completed' | summarize Median_ms=percentile(DurationMs, 50)`,
          },
          type: "Statistic",
        },
      },
      {
        at: { h: 4, w: 6, x: 6, y: 4 },
        chart: {
          id: "taxkit-latency-p95",
          name: "P95 waiting time (ms)",
          query: {
            apl: `${requests} | where Outcome == 'completed' | summarize P95_ms=percentile(DurationMs, 95)`,
          },
          type: "Statistic",
        },
      },
      {
        at: { h: 8, w: 12, x: 0, y: 8 },
        chart: {
          id: "taxkit-latency-over-time",
          name: "Waiting time per request: median, P95 (ms)",
          query: {
            apl: `${requests} | where Outcome == 'completed' | summarize percentiles_array(DurationMs, 50, 95) by bin(_time, 1h)`,
          },
          type: "TimeSeries",
        },
      },
      {
        at: { h: 8, w: 12, x: 0, y: 16 },
        chart: {
          id: "taxkit-latency-by-route",
          name: "Waiting time by route family (ms)",
          query: {
            apl: `${requests} | where Outcome == 'completed' | summarize Requests=count(), P50=percentile(DurationMs, 50), P95=percentile(DurationMs, 95) by Service, Route | project Service, ['Route family']=Route, Requests, ['P50 ms']=round(P50, 0), ['P95 ms']=round(P95, 0), ['n<20']=case(Requests < 20, 'yes', '') | sort by Requests desc`,
          },
          type: "Table",
        },
      },
    ],
  });
};

const telemetryHealth = ({ logsDataset }: SharedDatasets) =>
  defineTaxKitDashboard({
    description:
      "Are TaxKit's Cloudflare-delivered logs reaching Axiom? Delivery delay and record counts by service.",
    identity: {
      chartIdPrefix: "taxkit-telemetry",
      logicalId: "TaxKitTelemetryHealth",
      name: "TaxKit Telemetry Health",
      uid: "taxkit-telemetry-health",
    },
    note: "Cloudflare delivers the Production Workers' console records through the taxkit-axiom-logs destination. Delivery is best effort; delay measures only records that arrived, not records lost. Invocation logs and automatic traces are not exported, and TaxKit sends no custom metrics.",
    panels: [
      {
        at: { h: 5, w: 12, x: 0, y: 4 },
        chart: {
          id: "taxkit-telemetry-delivery-delay",
          name: "Delivery delay by service (minutes)",
          query: {
            apl: `${serviceParameter}
${requestSource(logsDataset)}
| extend DelaySeconds=datetime_diff('second', todatetime(_sysTime), _time)
| summarize Records=count(), Median=percentile(DelaySeconds, 50), P95=percentile(DelaySeconds, 95) by Service
| project Service, Records, ['Median min']=round(Median / 60.0, 1), ['P95 min']=round(P95 / 60.0, 1)
| sort by Service asc`,
          },
          type: "Table",
        },
      },
      {
        at: { h: 8, w: 12, x: 0, y: 9 },
        chart: {
          id: "taxkit-telemetry-records",
          name: "Records per hour: requests and runtime events",
          query: {
            apl: `${serviceParameter}
union
  (${requestSource(logsDataset)} | project _time, Kind='Request records'),
  (${runtimeSource(logsDataset)} | project _time, Kind='Runtime events')
| summarize Records=count() by bin(_time, 1h), Kind`,
          },
          type: "TimeSeries",
        },
      },
    ],
  });

/** Build TaxKit's four dashboards from Site's shared dataset names. */
export const taxKitDashboardDefinitions = (
  datasets: SharedDatasets
): readonly TaxKitDashboardDefinition[] => [
  overview(datasets),
  failures(datasets),
  latency(datasets),
  telemetryHealth(datasets),
];
