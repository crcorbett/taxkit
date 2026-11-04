import { useAtom } from "@effect/atom-react";
import * as Clipboard from "@effect/platform-browser/Clipboard";
import { Effect } from "effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Check, Copy, CircleAlert } from "lucide-react";
import { useMemo } from "react";

import { Button } from "#/components/ui/button";

import { clipboardRuntime } from "./clipboard.atoms";

export const DocsCopyButton = ({
  text,
  label,
  action = "Copy",
}: Readonly<{ text: string; label: string; action?: string }>) => {
  // A description per mounted control keeps feedback independent, even when
  // two examples contain identical text. Native Atom owns action lifetime.
  const copyAtom = useMemo(
    () =>
      clipboardRuntime.fn<"copy">()(() =>
        Clipboard.Clipboard.pipe(
          Effect.flatMap((clipboard) => clipboard.writeString(text)),
          Effect.timeout("5 seconds")
        )
      ),
    [text]
  );
  const [result, copy] = useAtom(copyAtom);
  const feedback = AsyncResult.match(result, {
    onInitial: () => ({ icon: Copy, text: action, message: "" }),
    onSuccess: () => ({
      icon: Check,
      text: "Copied",
      message: "Copied to clipboard.",
    }),
    onFailure: () => ({
      icon: CircleAlert,
      text: "Copy failed",
      message: "Clipboard unavailable. Select the text and copy it manually.",
    }),
  });
  const Icon = feedback.icon;
  return (
    <span
      className="docs-copy-control"
      data-error={AsyncResult.isFailure(result)}
    >
      <Button
        aria-busy={result.waiting}
        aria-label={label}
        className="docs-copy-button"
        disabled={result.waiting}
        onClick={() => {
          copy("copy");
        }}
        title={label}
        variant="ghost"
      >
        <Icon aria-hidden="true" size={15} />
        <span>{feedback.text}</span>
      </Button>
      <output aria-live="polite" className="sr-only">
        {feedback.message}
      </output>
    </span>
  );
};
