import { Cause, Clock, ErrorReporter, Formatter, Layer, Logger } from "effect";

// Discard arbitrary messages, Causes, annotations and span labels before egress.
// This containment is not the later safe tracing/exporter implementation.
const ApiSafeLogFormatter = Logger.make(({ date, logLevel }) =>
  Formatter.formatJson({
    event: "api.runtime.event",
    level: logLevel,
    timestamp: date.toISOString(),
  })
);

const safeLogger = Logger.withConsoleLog(ApiSafeLogFormatter);
const safeReporter = ErrorReporter.make(({ fiber }) =>
  safeLogger.log({
    cause: Cause.empty,
    date: new Date(fiber.getRef(Clock.Clock).currentTimeMillisUnsafe()),
    fiber,
    logLevel: "Error",
    message: "API runtime failure",
  })
);

export const ApiSafeTelemetryLive = Layer.mergeAll(
  Logger.layer([safeLogger]),
  ErrorReporter.layer([safeReporter])
);
