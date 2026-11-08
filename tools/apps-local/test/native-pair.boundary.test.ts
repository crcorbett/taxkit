import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import {
  Array,
  Effect,
  Function as EffectFunction,
  Queue,
  Schema,
} from "effect";

import {
  verifyBrowserCalculation,
  verifyRecalculation,
  verifyCalculationFailure,
  verifyCalculatorVariants,
  verifyAgentGuide,
} from "./native-pair-calculator-browser.checks";
import {
  verifyCalculatorMetadata,
  verifyServerRenderedCalculator,
} from "./native-pair-calculator-server.checks";
import {
  verifyBundles,
  verifyContentCatalogue,
  verifyDiscoveryDocuments,
} from "./native-pair-content.checks";
import {
  verifyPublicDocumentation,
  verifyMarkdownNegotiation,
  verifySearchResponses,
} from "./native-pair-docs-api.checks";
import {
  verifyClientNavigation,
  verifyPendingDestinationFocus,
  verifyPageOutline,
  verifyMobileNavigation,
  verifyCodeScrollbar,
  verifyNavigationWithoutJavaScript,
  verifyResponsiveTablesAndDiagrams,
  verifyPairedThemes,
  verifyMalformedPageRecovery,
  verifyMalformedNavigationRecovery,
} from "./native-pair-docs-navigation.checks";
import {
  captureDocumentationReplies,
  verifyAccessibleDocumentation,
  verifyShareMetadata,
  verifyDocumentationRepresentations,
} from "./native-pair-docs-reader.checks";
import {
  verifySearchNavigation,
  verifySearchInputBoundaries,
  verifySearchInteraction,
  verifySearchWithoutJavaScript,
} from "./native-pair-search.checks";
import {
  Json,
  frameworkSentinel,
  readNativePairBundles,
  startNativePairHosts,
} from "./native-pair.fixture";

describe("built native API and Website", () => {
  it.live(
    "uses the real API through the binding and browser, including an idle form and no JavaScript",
    () =>
      Effect.gen(function* () {
        const bundles = yield* readNativePairBundles();
        yield* verifyBundles(bundles).pipe(
          Effect.withSpan("NativePair.verifyBundles")
        );
        const hosts = yield* startNativePairHosts(bundles);
        const { logs, exceptions } = hosts;
        const { publicContent } = yield* verifyContentCatalogue({
          root: bundles.root,
          publicApi: hosts.publicApi,
          website: hosts.website,
        }).pipe(Effect.withSpan("NativePair.verifyContentCatalogue"));
        const { unavailableDiscoveryWorker, discoverySitemap } =
          yield* verifyDiscoveryDocuments({
            publicApi: hosts.publicApi,
            website: hosts.website,
            publicContent,
          }).pipe(Effect.withSpan("NativePair.verifyDiscoveryDocuments"));
        yield* verifyPublicDocumentation({
          publicApi: hosts.publicApi,
          website: hosts.website,
          publicContent,
        }).pipe(Effect.withSpan("NativePair.verifyPublicDocumentation"));
        const { quickstart } = yield* verifyMarkdownNegotiation({
          website: hosts.website,
          publicContent,
          unavailableDiscoveryWorker,
        }).pipe(Effect.withSpan("NativePair.verifyMarkdownNegotiation"));
        yield* verifySearchResponses({ publicApi: hosts.publicApi }).pipe(
          Effect.withSpan("NativePair.verifySearchResponses")
        );
        yield* verifyCalculatorMetadata({
          websiteModules: bundles.websiteModules,
          website: hosts.website,
        }).pipe(Effect.withSpan("NativePair.verifyCalculatorMetadata"));
        yield* verifyServerRenderedCalculator({
          publicApi: hosts.publicApi,
          website: hosts.website,
        }).pipe(Effect.withSpan("NativePair.verifyServerRenderedCalculator"));
        const { browser, context, page, calls } =
          yield* verifyBrowserCalculation({
            exceptions: hosts.exceptions,
          }).pipe(Effect.withSpan("NativePair.verifyBrowserCalculation"));
        const { payInput } = yield* verifyRecalculation({ page, calls }).pipe(
          Effect.withSpan("NativePair.verifyRecalculation")
        );
        yield* verifyCalculationFailure({ page, calls, payInput }).pipe(
          Effect.withSpan("NativePair.verifyCalculationFailure")
        );
        const { plainPage } = yield* verifyCalculatorVariants({
          screenshotRoot: bundles.screenshotRoot,
          browser,
          page,
          calls,
        }).pipe(Effect.withSpan("NativePair.verifyCalculatorVariants"));
        yield* verifyAgentGuide({ page }).pipe(
          Effect.withSpan("NativePair.verifyAgentGuide")
        );
        const {
          typescriptSdkReply,
          typescriptSdkBody,
          docsNavigationReply,
          docsNavigationBody,
        } = yield* captureDocumentationReplies({
          publicApi: hosts.publicApi,
          website: hosts.website,
        }).pipe(Effect.withSpan("NativePair.captureDocumentationReplies"));
        const { docsPage, docsCalls, docsDocuments, docsRequests } =
          yield* verifyAccessibleDocumentation({
            exceptions: hosts.exceptions,
            publicContent,
            discoverySitemap,
            context,
          }).pipe(Effect.withSpan("NativePair.verifyAccessibleDocumentation"));
        yield* verifyShareMetadata({
          website: hosts.website,
          publicContent,
          browser,
          docsPage,
        }).pipe(Effect.withSpan("NativePair.verifyShareMetadata"));
        yield* verifyDocumentationRepresentations({
          logs: hosts.logs,
          exceptions: hosts.exceptions,
          website: hosts.website,
          docsFixtureWorkers: hosts.docsFixtureWorkers,
          quickstart,
          docsPage,
        }).pipe(
          Effect.withSpan("NativePair.verifyDocumentationRepresentations")
        );
        yield* verifyClientNavigation({
          screenshotRoot: bundles.screenshotRoot,
          docsPage,
          docsCalls,
          docsDocuments,
          docsRequests,
        }).pipe(Effect.withSpan("NativePair.verifyClientNavigation"));
        yield* verifyPendingDestinationFocus({ docsPage }).pipe(
          Effect.withSpan("NativePair.verifyPendingDestinationFocus")
        );
        yield* verifyPageOutline({ docsPage }).pipe(
          Effect.withSpan("NativePair.verifyPageOutline")
        );
        yield* verifyMobileNavigation({
          screenshotRoot: bundles.screenshotRoot,
          docsPage,
        }).pipe(Effect.withSpan("NativePair.verifyMobileNavigation"));
        yield* verifyCodeScrollbar({ docsPage }).pipe(
          Effect.withSpan("NativePair.verifyCodeScrollbar")
        );
        yield* verifyNavigationWithoutJavaScript({ plainPage }).pipe(
          Effect.withSpan("NativePair.verifyNavigationWithoutJavaScript")
        );
        yield* verifyResponsiveTablesAndDiagrams({
          screenshotRoot: bundles.screenshotRoot,
          docsPage,
        }).pipe(
          Effect.withSpan("NativePair.verifyResponsiveTablesAndDiagrams")
        );
        yield* verifyPairedThemes({
          screenshotRoot: bundles.screenshotRoot,
          docsPage,
          docsCalls,
        }).pipe(Effect.withSpan("NativePair.verifyPairedThemes"));
        yield* verifyMalformedPageRecovery({
          typescriptSdkReply,
          typescriptSdkBody,
          docsPage,
        }).pipe(Effect.withSpan("NativePair.verifyMalformedPageRecovery"));
        yield* verifySearchNavigation({
          docsPage,
          docsCalls,
          docsDocuments,
          docsRequests,
        }).pipe(Effect.withSpan("NativePair.verifySearchNavigation"));
        yield* verifySearchInputBoundaries({
          publicApi: hosts.publicApi,
          website: hosts.website,
          docsPage,
        }).pipe(Effect.withSpan("NativePair.verifySearchInputBoundaries"));
        yield* verifySearchInteraction({
          screenshotRoot: bundles.screenshotRoot,
          docsPage,
        }).pipe(Effect.withSpan("NativePair.verifySearchInteraction"));
        yield* verifySearchWithoutJavaScript({ plainPage }).pipe(
          Effect.withSpan("NativePair.verifySearchWithoutJavaScript")
        );
        yield* verifyMalformedNavigationRecovery({
          docsNavigationReply,
          docsNavigationBody,
          docsPage,
        }).pipe(
          Effect.withSpan("NativePair.verifyMalformedNavigationRecovery")
        );
        yield* Effect.gen(function* verifyHostTelemetry() {
          expect(yield* Queue.clear(exceptions)).toStrictEqual([]);
          const capturedLogs = yield* Queue.clear(logs);
          const logText = yield* Schema.encodeEffect(Json)(capturedLogs);
          const messageText = yield* Schema.encodeEffect(Json)(
            EffectFunction.pipe(
              capturedLogs,
              Array.map((log) => log.message)
            )
          );
          expect(logText).not.toContain(frameworkSentinel);
          Array.forEach((marker: string) => {
            expect(messageText).not.toContain(marker);
          })(["1654", "130100"]);
        }).pipe(Effect.withSpan("NativePair.verifyHostTelemetry"));
      }).pipe(
        Effect.timeout("65 seconds"),
        Effect.scoped,
        Effect.provide(NodeServices.layer)
      ),
    { timeout: 70_000 }
  );
});
