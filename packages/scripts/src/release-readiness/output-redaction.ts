import {
  Array as EffectArray,
  Effect,
  Match,
  Option,
  Record,
  Ref,
} from "effect";

interface RedactionState {
  readonly mode:
    | "credential-separator"
    | "credential-value"
    | "credential-value-start"
    | "home-user"
    | "normal";
  readonly pending: string;
  readonly separatorWhitespace: string;
}

interface RedactionStep {
  readonly done: boolean;
  readonly output: string;
  readonly state: RedactionState;
}

const sensitiveMarker =
  /(?<homeBoundary>^|[\s"'=(]|file:\/\/|[A-Za-z][A-Za-z0-9_.-]*:)(?:\/(?:Users|home)\/|\/[A-Za-z]:\/(?:Users|home)\/|[A-Za-z]:[\\/](?:Users|home)[\\/]|\\\\[^\\/\s]+[\\/](?:Users|home)[\\/])|ghp_|github_pat_|sk-|\b(?:authorization|token|api[_-]?key|secret|password|bearer)\b/iu;

// Each transition returns new state. Long values and usernames are consumed in
// one step; ordinary output retains the existing 256-character chunk lookahead.
const redactionStep = (
  state: RedactionState,
  final: boolean
): RedactionStep => {
  const character = state.pending.slice(0, 1);
  const rest = state.pending.slice(1);
  return Match.value(state.mode).pipe(
    Match.when("credential-separator", () => {
      if (character === ":" || character === "=") {
        return {
          done: false,
          output: `${state.separatorWhitespace}${character}`,
          state: {
            mode: "credential-value-start" as const,
            pending: rest,
            separatorWhitespace: "",
          },
        };
      }
      if (/\s/u.test(character)) {
        const whitespace = Option.getOrElse(
          Option.flatMap(
            Option.fromNullishOr(/^\s+/u.exec(state.pending)),
            EffectArray.head
          ),
          () => ""
        );
        return {
          done: false,
          output: "",
          state: {
            ...state,
            pending: state.pending.slice(whitespace.length),
            separatorWhitespace: `${state.separatorWhitespace}${whitespace}`,
          },
        };
      }
      return {
        done: false,
        output: `${state.separatorWhitespace}<redacted>`,
        state: {
          mode: "credential-value" as const,
          pending: rest,
          separatorWhitespace: "",
        },
      };
    }),
    Match.when("credential-value-start", () => {
      const start = state.pending.search(/\S/u);
      if (start < 0) {
        return {
          done: false,
          output: state.pending,
          state: { ...state, pending: "" },
        };
      }
      return {
        done: false,
        output: `${state.pending.slice(0, start)}<redacted>`,
        state: {
          ...state,
          mode: "credential-value" as const,
          pending: state.pending.slice(start + 1),
        },
      };
    }),
    Match.when("credential-value", () => {
      const boundary = state.pending.search(/\s/u);
      if (boundary < 0) {
        return { done: false, output: "", state: { ...state, pending: "" } };
      }
      return {
        done: false,
        output: state.pending.slice(boundary, boundary + 1),
        state: {
          ...state,
          mode: "normal" as const,
          pending: state.pending.slice(boundary + 1),
        },
      };
    }),
    Match.when("home-user", () => {
      const boundary = state.pending.search(/[\\/\s]/u);
      if (boundary < 0) {
        return { done: false, output: "", state: { ...state, pending: "" } };
      }
      return {
        done: false,
        output: state.pending.slice(boundary, boundary + 1),
        state: {
          ...state,
          mode: "normal" as const,
          pending: state.pending.slice(boundary + 1),
        },
      };
    }),
    Match.when("normal", () =>
      Option.match(Option.fromNullishOr(sensitiveMarker.exec(state.pending)), {
        onNone: () => {
          const safeLength = final
            ? state.pending.length
            : Math.max(0, state.pending.length - 256);
          return {
            done: true,
            output: state.pending.slice(0, safeLength),
            state: { ...state, pending: state.pending.slice(safeLength) },
          };
        },
        onSome: (marker) => {
          const markerText = Option.getOrElse(
            EffectArray.head(marker),
            () => ""
          );
          const homeBoundary = Option.flatMap(
            Option.fromNullishOr(marker.groups),
            Record.get("homeBoundary")
          ).pipe(Option.flatMap(Option.fromNullishOr));
          const normalized = markerText.toLowerCase();
          const isPrefix =
            normalized === "ghp_" ||
            normalized === "github_pat_" ||
            normalized === "sk-";
          const mode = Option.match(homeBoundary, {
            onNone: () => {
              if (isPrefix) {
                return "credential-value" as const;
              }
              return normalized === "bearer"
                ? ("credential-value-start" as const)
                : ("credential-separator" as const);
            },
            onSome: () => "home-user" as const,
          });
          return {
            done: false,
            output: `${state.pending.slice(0, marker.index)}${Option.match(homeBoundary, { onNone: () => (isPrefix ? "<redacted>" : markerText), onSome: (boundary) => `${boundary}<home>` })}`,
            state: {
              ...state,
              mode,
              pending: state.pending.slice(marker.index + markerText.length),
            },
          };
        },
      })
    ),
    Match.exhaustive
  );
};

const redactOutput = (
  state: RedactionState,
  final: boolean
): readonly [string, RedactionState] => {
  const steps = EffectArray.unfold<RedactionStep, RedactionStep>(
    { done: false, output: "", state },
    (previous) => {
      if (previous.done || previous.state.pending.length === 0) {
        return Option.none();
      }
      const next = redactionStep(previous.state, final);
      return Option.some([next, next]);
    }
  );
  const retained = Option.getOrElse(
    Option.map(EffectArray.last(steps), (step) => step.state),
    () => state
  );
  const flushSeparator = final && retained.mode === "credential-separator";
  return [
    `${EffectArray.map(steps, (step) => step.output).join("")}${flushSeparator ? retained.separatorWhitespace : ""}`,
    flushSeparator ? { ...retained, separatorWhitespace: "" } : retained,
  ];
};

export const releaseOutputRedactor = Ref.make<RedactionState>({
  mode: "normal",
  pending: "",
  separatorWhitespace: "",
}).pipe(
  Effect.map((state) => ({
    end: Ref.modify(state, (current) => redactOutput(current, true)),
    write: (chunk: string) =>
      Ref.modify(state, (current) =>
        redactOutput(
          { ...current, pending: `${current.pending}${chunk}` },
          false
        )
      ),
  }))
);
