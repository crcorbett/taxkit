import { Cause, Clock, ErrorReporter, Formatter, Layer, Logger } from "effect";

// Both calculation hosts discard arbitrary messages, Causes, annotations and
// span labels before log egress. This is containment, not safe tracing/export.
export const CalculatorHostTelemetryLive = (host: "api" | "website") => {
  const formatter = Logger.make(({ date, logLevel }) =>
    Formatter.formatJson({
      event: `${host}.runtime.event`,
      level: logLevel,
      timestamp: date.toISOString(),
    })
  );
  const logger = Logger.withConsoleLog(formatter);
  const reporter = ErrorReporter.make(({ fiber }) =>
    logger.log({
      cause: Cause.empty,
      date: new Date(fiber.getRef(Clock.Clock).currentTimeMillisUnsafe()),
      fiber,
      logLevel: "Error",
      message: "Calculation host failure",
    })
  );
  return Layer.mergeAll(
    Logger.layer([logger]),
    ErrorReporter.layer([reporter])
  );
};
