// Both native hosts share one compatibility policy.
export const workerCompatibility = {
  date: "2026-10-04",
  flags: ["nodejs_compat"],
};

// Invocation records and automatic traces can expose sensitive request data.
// Only Production enables checked console logs through its retained destination.
export const disabledWorkerObservability = {
  enabled: false,
  headSamplingRate: 0,
  logs: {
    enabled: false,
    headSamplingRate: 0,
    invocationLogs: false,
    persist: false,
  },
  traces: { enabled: false, headSamplingRate: 0, persist: false },
} as const;
