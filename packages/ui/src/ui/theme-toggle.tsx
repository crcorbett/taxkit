import {
  IconCheck,
  IconDeviceDesktop,
  IconMoon,
  IconSun,
} from "@tabler/icons-react";

import { useTheme, type Theme } from "@/lib/theme";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";

/*
 * ThemeToggle — light / dark / system selector (DESIGN.md §10.3, §16).
 *
 * Composed from shadcn primitives:
 *   - Button (icon-sm, ghost) as the trigger
 *   - DropdownMenu with three DropdownMenuItems inside a DropdownMenuGroup
 *   - Tabler icons (IconSun, IconMoon, IconDeviceDesktop) — the project's
 *     configured iconLibrary
 *
 * Trigger icon reflects the resolved theme so the user always sees what's
 * applied. Items show a check next to the active mode.
 */

interface ThemeOption {
  value: Theme;
  label: string;
  Icon: typeof IconSun;
}

const OPTIONS: ReadonlyArray<ThemeOption> = [
  { Icon: IconSun, label: "Light", value: "light" },
  { Icon: IconMoon, label: "Dark", value: "dark" },
  { Icon: IconDeviceDesktop, label: "System", value: "system" },
];

function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const TriggerIcon = resolvedTheme === "dark" ? IconMoon : IconSun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Theme: ${theme}`}
            type="button"
          />
        }
      >
        <TriggerIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-32">
        <DropdownMenuGroup>
          {OPTIONS.map(({ value, label, Icon }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => {
                setTheme(value);
              }}
              data-active={theme === value ? "" : undefined}
            >
              <Icon data-icon="inline-start" />
              {label}
              {theme === value ? (
                <IconCheck data-icon="inline-end" className="ml-auto" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { ThemeToggle };
