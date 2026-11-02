import { useAtom } from "@effect/atom-react";
import { Array, Function as EffectFunction } from "effect";
import { Monitor, Moon, Sun } from "lucide-react";
import { useId } from "react";

import { docsAppearanceAtom } from "./appearance.atoms";

export const DocsAppearance = () => {
  const group = useId();
  const [appearance, chooseAppearance] = useAtom(docsAppearanceAtom);
  return (
    <fieldset className="docs-theme-options">
      <legend className="sr-only">Appearance</legend>
      {EffectFunction.pipe(
        [
          { mode: "system", label: "System", icon: Monitor },
          { mode: "light", label: "Light", icon: Sun },
          { mode: "dark", label: "Dark", icon: Moon },
        ] as const,
        Array.map(({ mode, label, icon: Icon }) => (
          <label key={mode} title={`${label} appearance`}>
            <input
              className="docs-theme-input"
              data-mdx-appearance-option={mode}
              checked={appearance === mode}
              onChange={() => {
                chooseAppearance(mode);
              }}
              name={group}
              type="radio"
              value={mode}
            />
            <Icon aria-hidden="true" size={17} />
            <span className="sr-only">{label}</span>
          </label>
        ))
      )}
    </fieldset>
  );
};
