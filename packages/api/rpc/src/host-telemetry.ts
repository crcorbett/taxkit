import { Cause, Clock, ErrorReporter, Formatter, Layer, Logger } from "effect";

// Both calculation hosts discard arbitrary messages, Causes, annotations and
// span labels before log egress. This is containment, not safe tracing/export.
const safeLogger = (event: "api.runtime.event" | "website.runtime.event") =>
  Logger.withConsoleLog(
    Logger.make(({ date, logLevel }) =>
      Formatter.formatJson({
        event,
        level: logLevel,
        timestamp: date.toISOString(),
      })
    )
  );

// The fixed reporter keeps an empty Cause and one fixed message.
const safeReporter = (logger: ReturnType<typeof safeLogger>) =>
  ErrorReporter.make(({ fiber }) =>
    logger.log({
      cause: Cause.empty,
      date: new Date(fiber.getRef(Clock.Clock).currentTimeMillisUnsafe()),
      fiber,
      logLevel: "Error",
      message: "Calculation host failure",
    })
  );

const apiLogger = safeLogger("api.runtime.event");
const websiteLogger = safeLogger("website.runtime.event");

export const ApiHostTelemetryLive = Layer.mergeAll(
  Logger.layer([apiLogger]),
  ErrorReporter.layer([safeReporter(apiLogger)])
);

export const WebsiteHostTelemetryLive = Layer.mergeAll(
  Logger.layer([websiteLogger]),
  ErrorReporter.layer([safeReporter(websiteLogger)])
);
