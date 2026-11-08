import { packEnvValue } from "alchemy/RuntimeContext";

export const nativeLocalModeFixture = {
  CALCULATOR_HOST_MODE: { type: "json" as const, value: "local-emulator" },
};

// Disposable local workerd identity only. These explicit namespaces do not
// reserve or select Preview/Production values in a real Cloudflare account.
export const nativeRateFixture = (namespace: string) => ({
  ...nativeLocalModeFixture,
  CALCULATOR_RATE_LIMIT: {
    namespace,
    simple: { limit: 60, period: 60 as const },
    type: "rate-limit" as const,
  },
  CALCULATOR_RATE_NAMESPACE: {
    type: "json" as const,
    value: packEnvValue(namespace),
  },
});
