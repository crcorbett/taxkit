// Matches the SDK-owned class export and same-script binding. Each disposable
// Worker has an isolated namespace; no cloud namespace is selected or applied.
export const nativeMcpSessionExports = {
  TaxKitMcpSessions: {
    storage: "sqlite" as const,
    type: "durable-object" as const,
  },
};

export const nativeMcpSessionFixture = (worker: string) => ({
  TaxKitMcpSessions: {
    exportName: "TaxKitMcpSessions",
    type: "durable-object" as const,
    worker,
  },
});
