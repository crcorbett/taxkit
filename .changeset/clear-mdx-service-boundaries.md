---
"@taxkit/content": patch
"@taxkit/mdx": patch
"@taxkit/diagrams": patch
"api": patch
"taxkit": patch
---

Extract content-neutral MDX compilation and rendering into independent Effect
services with static individual Layers and a combined MdxLive composition.
Preserve semantic code and authored links in portable versioned documents, support
checked theme configuration, and keep TaxKit publication/link policy in Content.
Migrate the catalogue builder and provider adapters while preserving public page
responses. Compile-only and stored-document consumers can acquire just the
capability they need.

Own strict artifact decoding and encoding on the MdxArtifacts service with a
static Layer and private JSON codecs. Brand semantic text, link targets and list positions at their Schema
owners and carry those types through compilation, providers and rendering.
