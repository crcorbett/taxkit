import {
  Function as EffectFunction,
  Array,
  Cause,
  Clock,
  Effect,
  ErrorReporter,
  Exit,
  Formatter,
  Layer,
  Logger,
  Match,
  Option,
  References,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
/**
 * The names the hosts emit and the Axiom dashboards read. Each is written
 * here once, so a rename cannot leave a dashboard query reading an old name.
 */
export const HostService = Schema.Literals(["taxkit-api", "taxkit-web"]);
export type HostService = typeof HostService.Type;
export const hostRequestEvent = "taxkit.request";
/**
 * Closed route families. Each host maps its own paths onto these; a raw path,
 * query string or calculator input never becomes a field.
 */
export const HostRoute = Schema.Literals([
  "calculate",
  "calculator-page",
  "catalogue",
  "discovery",
  "docs",
  "health",
  "mcp",
  "page",
  "reference",
  "search",
  "other",
]);
export type HostRoute = typeof HostRoute.Type;
const HostMethod = Schema.Literals(["GET", "HEAD", "POST", "OPTIONS", "other"]);
const HttpStatus = Schema.Int.check(
  Schema.isBetween({ maximum: 599, minimum: 100 })
);
/**
 * One fixed record per hosted request: service, closed route family, method,
 * outcome, status and its class, and the response-ready time read from the
 * Effect clock. Workers advance that clock only across I/O, so it is not CPU
 * time or visitor latency. The Worker name and version come from the
 * platform's own log envelope.
 */
export const HostRequestRecord = Schema.Struct({
  durationMs: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  event: Schema.Literal(hostRequestEvent),
  method: HostMethod,
  outcome: Schema.Literals(["completed", "failed", "interrupted"]),
  route: HostRoute,
  service: HostService,
  status: Schema.OptionFromNullOr(HttpStatus),
  statusClass: Schema.Literals(["1xx", "2xx", "3xx", "4xx", "5xx", "none"]),
});
export type HostRequestRecord = typeof HostRequestRecord.Type;
/**
 * The closed operational events a host may log besides its request record.
 * Each names one decision an operator can act on.
 */
export const HostEvent = Schema.Literals([
  "api.analytics.dropped",
  "host.failure.reported",
  "website.load.failed",
]);
export type HostEvent = typeof HostEvent.Type;
// A failure's own tag, such as `ApiUnavailable`: bounded and never a message.
const HostErrorTag = Schema.String.check(
  Schema.isPattern(/^[A-Z][A-Za-z0-9]{0,63}$/u)
);
/**
 * The one annotation record a host log may carry: a closed event, the tag of
 * the failure it describes and a short fixed reason. A host attaches it with
 * `Effect.annotateLogs(HostEventRecord.make(...))`; other annotations, the
 * message, Causes and span labels never reach output.
 */
export const HostEventRecord = Schema.Struct({
  errorTag: HostErrorTag,
  event: HostEvent,
  reason: Schema.String.check(Schema.isPattern(/^[a-z][a-z0-9-]{0,47}$/u)),
});
export type HostEventRecord = typeof HostEventRecord.Type;
// Both calculation hosts discard arbitrary messages, Causes, annotations and
// span labels before log egress. A complete request record from the same host
// keeps its fixed fields, and a checked event record (from the message or the
// annotations) keeps its three; anything else becomes one fixed runtime event.
const safeLogger = (
  service: HostService,
  event: "api.runtime.event" | "website.runtime.event"
) =>
  Logger.withConsoleLog(
    Logger.make(({ date, fiber, logLevel, message }) =>
      Formatter.formatJson(
        Option.match(
          EffectFunction.pipe(
            Array.ensure(message),
            Array.findFirst(
              (part): part is HostRequestRecord =>
                Schema.is(HostRequestRecord)(part) && part.service === service
            ),
            Option.flatMap(Schema.encodeUnknownOption(HostRequestRecord))
          ),
          {
            onNone: () =>
              Option.match(
                EffectFunction.pipe(
                  Array.ensure(message),
                  Array.findFirst(Schema.is(HostEventRecord)),
                  Option.orElse(() =>
                    Option.liftPredicate(
                      fiber.getRef(References.CurrentLogAnnotations),
                      Schema.is(HostEventRecord)
                    )
                  )
                ),
                {
                  onNone: () => ({
                    event,
                    level: logLevel,
                    service,
                    timestamp: date.toISOString(),
                  }),
                  onSome: (record) => ({
                    errorTag: record.errorTag,
                    event: record.event,
                    level: logLevel,
                    reason: record.reason,
                    service,
                    timestamp: date.toISOString(),
                  }),
                }
              ),
            onSome: (record) => ({
              durationMs: record.durationMs,
              event: record.event,
              level: logLevel,
              method: record.method,
              outcome: record.outcome,
              route: record.route,
              service,
              status: record.status,
              statusClass: record.statusClass,
              timestamp: date.toISOString(),
            }),
          }
        )
      )
    )
  );
// Effect's reporter callback is synchronous, so it calls the safe logger
// directly. It keeps an empty Cause and writes only the failure's checked tag
// (or `Defect`), never its message, attributes or stack.
const safeReporter = (logger: ReturnType<typeof safeLogger>) =>
  ErrorReporter.make(({ cause, error, fiber }) => {
    logger.log({
      cause: Cause.empty,
      date: new Date(fiber.getRef(Clock.Clock).currentTimeMillisUnsafe()),
      fiber,
      logLevel: "Error",
      message: HostEventRecord.make({
        // A tagged failure keeps its name as its tag; a defect is `Defect`.
        errorTag: EffectBoolean.match(Cause.hasFails(cause), {
          onFalse: () => "Defect",
          onTrue: () =>
            Option.liftPredicate(error.name, Schema.is(HostErrorTag)).pipe(
              Option.getOrElse(() => "Unknown")
            ),
        }),
        event: "host.failure.reported",
        reason: "reported",
      }),
    });
  });
const apiLogger = safeLogger("taxkit-api", "api.runtime.event");
const websiteLogger = safeLogger("taxkit-web", "website.runtime.event");
export const ApiHostTelemetryLive = Layer.mergeAll(
  Logger.layer([apiLogger]),
  ErrorReporter.layer([safeReporter(apiLogger)])
);
export const WebsiteHostTelemetryLive = Layer.mergeAll(
  Logger.layer([websiteLogger]),
  ErrorReporter.layer([safeReporter(websiteLogger)])
);
/**
 * Writes one request record when the response is ready, fails or is
 * cancelled. It reads only the method it is given and the response status;
 * never the URL, headers or either body. The response and any failure pass
 * through unchanged.
 */
export const observeHostRequest =
  (
    service: HostService,
    {
      method,
      route,
    }: {
      readonly method: string;
      readonly route: HostRoute;
    }
  ) =>
  <
    A extends {
      readonly status: number;
    },
    E,
    R,
  >(
    self: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, R> =>
    Effect.gen(function* () {
      const started = yield* Clock.currentTimeMillis;
      return yield* self.pipe(
        Effect.onExit((exit) =>
          Effect.gen(function* () {
            const finished = yield* Clock.currentTimeMillis;
            const status = Exit.match(exit, {
              onFailure: () => Option.none(),
              onSuccess: (response) =>
                Option.some(response.status).pipe(
                  Option.filter(Schema.is(HttpStatus))
                ),
            });
            yield* Effect.logInfo(
              HostRequestRecord.make({
                durationMs: Math.max(0, Math.round(finished - started)),
                event: hostRequestEvent,
                method: Match.value(method).pipe(
                  Match.when(
                    Schema.is(HostMethod),
                    (matchedValue) => matchedValue
                  ),
                  Match.orElse((): "other" => "other")
                ),
                outcome: Exit.match(exit, {
                  onFailure: (cause) =>
                    EffectBoolean.match(Cause.hasInterruptsOnly(cause), {
                      onFalse: (): "failed" => "failed",
                      onTrue: (): "interrupted" => "interrupted",
                    }),
                  onSuccess: () => "completed",
                }),
                route,
                service,
                status,
                statusClass: Option.match(status, {
                  onNone: () => "none",
                  onSome: (code) =>
                    Match.value(Math.floor(code / 100)).pipe(
                      Match.when(1, () => "1xx" as const),
                      Match.when(2, () => "2xx" as const),
                      Match.when(3, () => "3xx" as const),
                      Match.when(4, () => "4xx" as const),
                      // Every other class the platform reports is a server failure.
                      Match.when(Match.number, () => "5xx" as const),
                      Match.exhaustive
                    ),
                }),
              })
            );
          })
        )
      );
    });
