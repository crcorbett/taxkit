// Disposable native host fixture only; this is never a hosted credential.
export const nativeForwardingKey = "f1".repeat(32);
export const nativePreviousForwardingKey = "d3".repeat(32);

// Alchemy lowers a deployed secret_text binding to Text.local in its native
// local runtime (Cloudflare/Workers/RuntimeBindings.ts). Miniflare's secret
// declaration has no value; the local text binding is the native value shape.
export const nativeForwardingFixture = {
  TAXKIT_WEBSITE_FORWARDING_KEY: {
    type: "text" as const,
    value: nativeForwardingKey,
  },
};

// Rotation overlap is limited to its dedicated native API qualification.
export const nativeForwardingOverlapFixture = {
  ...nativeForwardingFixture,
  TAXKIT_WEBSITE_FORWARDING_PREVIOUS_KEY: {
    type: "text" as const,
    value: nativePreviousForwardingKey,
  },
};
