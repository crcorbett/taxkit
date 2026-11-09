import { useRouter } from "@tanstack/react-router";
import { Boolean as EffectBoolean } from "effect";
import { useTransition } from "react";

import { buttonVariants } from "#/components/ui/button-variants";

// One recovery action for a failed read. Router's native `invalidate` reloads
// the failed matches; the button stays disabled for that transition, so a
// repeated press cannot queue another reload. No second request cache or
// retry loop is involved.
export const RetryButton = () => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      {...buttonVariants({ variant: "outline" })}
      aria-busy={pending}
      disabled={pending}
      onClick={() => {
        startTransition(() => router.invalidate());
      }}
      type="button"
    >
      {EffectBoolean.match(pending, {
        onFalse: (): "Try again" => "Try again",
        onTrue: (): "Trying again…" => "Trying again…",
      })}
    </button>
  );
};
