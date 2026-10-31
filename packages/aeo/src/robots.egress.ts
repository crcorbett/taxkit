import { discoveryPaths } from "@taxkit/api-http/routes";
import type { DocsPublicationOrigin } from "@taxkit/content/schemas";
import { Function as EffectFunction, Array, Schema, Struct } from "effect";
// Named answer-engine and AI crawlers, as documented by their operators. Each
// gets its own group because a crawler reads only the group that names it.
const AiCrawlerToken = Schema.Literals([
  "GPTBot",
  "OAI-SearchBot",
  "Claude-Web",
  "Google-Extended",
  "Amazonbot",
  "anthropic-ai",
  "Bytespider",
  "CCBot",
  "Applebot-Extended",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "meta-externalagent",
  "DuckAssistBot",
  "MistralAI-User",
]);
const RobotsUserAgent = Schema.Union([Schema.Literal("*"), AiCrawlerToken]);
const SignalChoice = Schema.Literals(["yes", "no"]);
// Content Signals (draft-romm-aipref-contentsignals), rendered in this order.
const contentSignals = ["search", "ai-input", "ai-train"] as const;
const ContentSignal = Schema.Struct({
  "ai-input": SignalChoice,
  "ai-train": SignalChoice,
  search: SignalChoice,
});
const RobotsGroup = Schema.Struct({
  allow: Schema.Literal("/"),
  contentSignal: ContentSignal,
  userAgent: RobotsUserAgent,
});
// The documentation is open: every crawler may index it, use it as AI input
// and train on it.
const permitEverything = ContentSignal.make({
  "ai-input": "yes",
  "ai-train": "yes",
  search: "yes",
});
const groups = EffectFunction.pipe(
  AiCrawlerToken.literals,
  Array.prepend<typeof RobotsUserAgent.Type>("*"),
  Array.map((userAgent) =>
    RobotsGroup.make({
      allow: "/",
      contentSignal: permitEverything,
      userAgent,
    })
  )
);
// Robots files need an absolute sitemap address on this stage's Website.
export const robotsTxt = (origin: DocsPublicationOrigin): string =>
  EffectFunction.pipe(
    groups,
    Array.map(
      ({ allow, contentSignal, userAgent }) =>
        `User-agent: ${userAgent}\nContent-Signal: ${EffectFunction.pipe(
          contentSignals,
          Array.map(
            (signal) => `${signal}=${Struct.get(contentSignal, signal)}`
          ),
          Array.join(", ")
        )}\nAllow: ${allow}\n`
    ),
    Array.join("\n"),
    (lines) =>
      `# Content Signals: search, AI input and AI training are all permitted.\n${lines}\nSitemap: ${new URL(discoveryPaths.sitemap, origin).href}\n`
  );
