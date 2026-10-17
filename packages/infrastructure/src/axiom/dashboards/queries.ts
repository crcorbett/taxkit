import {
  HostService,
  hostRequestEvent,
} from "@taxkit/observability/host-telemetry";
import { Array } from "effect";

import type { SharedLogsDatasetName } from "../../telemetry.js";

/**
 * Every dashboard query starts with this parameter, which the service filter
 * sets. An empty value selects both TaxKit Workers.
 */
export const serviceParameter = `declare query_parameters (service:string = "");`;

const services = Array.join(
  Array.map(HostService.literals, (service) => `'${service}'`),
  ", "
);

/**
 * TaxKit's console records in Site's shared logs dataset. Cloudflare delivers
 * each record's JSON as the log `body`; the cheap text filter runs before the
 * parse, and the parsed `service` field is the identity filter. Only
 * Production Workers export, so every row is Production.
 */
const taxKitRecords = (dataset: SharedLogsDatasetName): string =>
  `['${dataset}']
| where tostring(body) contains '"service":"taxkit-'
| extend Entry=parse_json(tostring(body))
| extend Service=tostring(Entry.service), Event=tostring(Entry.event), Level=tostring(Entry.level)
| where Service in (${services})
| where service == '' or Service == service`;

/**
 * One row per hosted request, with only the fixed fields the hosts emit.
 * `Result` sorts each request into one class, so a chart can keep 404 probes
 * apart from real errors: `Errors` are 5xx responses and requests that failed
 * or were cancelled before a response.
 */
export const requestSource = (dataset: SharedLogsDatasetName): string =>
  `${taxKitRecords(dataset)}
| where Event == '${hostRequestEvent}'
| extend Route=tostring(Entry.route), Method=tostring(Entry.method), Outcome=tostring(Entry.outcome), StatusClass=tostring(Entry.statusClass), Status=toint(Entry.status), DurationMs=toint(Entry.durationMs)
| extend Result=case(Outcome != 'completed' or StatusClass == '5xx', 'Errors', Status == 404, 'Not found', StatusClass == '4xx', 'Rejected (other 4xx)', 'Success')`;

export const requestQuery = (dataset: SharedLogsDatasetName): string =>
  `${serviceParameter}
${requestSource(dataset)}`;

/** The fixed runtime events: any other host log or a reported failure. */
export const runtimeSource = (dataset: SharedLogsDatasetName): string =>
  `${taxKitRecords(dataset)}
| where Event in ('api.runtime.event', 'website.runtime.event')`;

export const runtimeQuery = (dataset: SharedLogsDatasetName): string =>
  `${serviceParameter}
${runtimeSource(dataset)}`;

/**
 * The tail of a count-and-share table: one row per value of the column,
 * sorted by count, with its share of all rows.
 */
export const countShareTable = (column: string, heading: string): string =>
  `| summarize Requests=count() by ${column}
| summarize Rows=make_list(pack('Key', ${column}, 'Requests', Requests)), Total=sum(Requests)
| mv-expand Rows
| extend Requests=toint(Rows['Requests'])
| project ['${heading}']=tostring(Rows['Key']), Requests, ['Share (%)']=round(100.0 * Requests / Total, 1)
| sort by Requests desc`;
