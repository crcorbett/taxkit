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
// Both calculation hosts discard arbitrary messages, Causes, annotations and
// span labels before log egress. Only a complete request record from the same
// host keeps its fixed fields; anything else becomes one fixed runtime event.
const safeLogger = (
  service: HostService,
  event: "api.runtime.event" | "website.runtime.event"
) =>
  Logger.withConsoleLog(
    Logger.make(({ date, logLevel, message }) =>
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
            onNone: () => ({
              event,
              level: logLevel,
              service,
              timestamp: date.toISOString(),
            }),
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
// The fixed reporter keeps an empty Cause and one fixed message.
const safeReporter = (logger: ReturnType<typeof safeLogger>) =>
  ErrorReporter.make(({ fiber }) => {
    logger.log({
      cause: Cause.empty,
      date: new Date(fiber.getRef(Clock.Clock).currentTimeMillisUnsafe()),
      fiber,
      logLevel: "Error",
      message: "Calculation host failure",
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
                      Match.orElse(() => "5xx" as const)
                    ),
                }),
              })
            );
          })
        )
      );
    });
