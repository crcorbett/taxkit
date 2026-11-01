import { Collapsible } from "@base-ui/react/collapsible";
import { Link } from "@tanstack/react-router";
import type {
  DocsPublicNavigation,
  DocsPublicPage,
} from "@taxkit/content/schemas";
import {
  Function as EffectFunction,
  Array,
  Option,
  Boolean as EffectBoolean,
} from "effect";
import { ChevronDown } from "lucide-react";

import {
  isDocsNavigationClick,
  requestDocsNavigationFocus,
} from "./components";

export const DocsNavigation = ({
  currentPath,
  navigation,
  onNavigate,
}: {
  readonly currentPath: Option.Option<DocsPublicPage["path"]>;
  readonly navigation: DocsPublicNavigation;
  readonly onNavigate?: () => void;
}) => (
  <nav aria-label="Documentation" className="docs-navigation">
    {EffectFunction.pipe(
      navigation.primaryNavigation,
      Array.map((section) => (
        <Collapsible.Root
          className="docs-nav-section"
          defaultOpen
          key={section.path}
        >
          <div className="docs-nav-section-heading">
            <Link
              activeOptions={{ exact: true }}
              aria-current={EffectBoolean.match(
                Option.contains(currentPath, section.path),
                {
                  onFalse: EffectFunction.constUndefined,
                  onTrue: (): "page" => "page",
                }
              )}
              onClick={(event) => {
                if (isDocsNavigationClick(event)) {
                  requestDocsNavigationFocus(event);
                  onNavigate?.();
                }
              }}
              params={{ _splat: section.path.slice(1) }}
              to="/$"
            >
              {section.title}
            </Link>
            <Collapsible.Trigger
              aria-label={`Toggle ${section.title} navigation`}
              className="docs-nav-section-toggle"
            >
              <ChevronDown aria-hidden="true" size={15} />
            </Collapsible.Trigger>
          </div>
          <Collapsible.Panel>
            <ul>
              {EffectFunction.pipe(
                section.pages,
                Array.map((item) => (
                  <li key={item.path}>
                    <Link
                      activeOptions={{ exact: true }}
                      aria-current={EffectBoolean.match(
                        Option.contains(currentPath, item.path),
                        {
                          onFalse: EffectFunction.constUndefined,
                          onTrue: (): "page" => "page",
                        }
                      )}
                      onClick={(event) => {
                        if (isDocsNavigationClick(event)) {
                          requestDocsNavigationFocus(event);
                          onNavigate?.();
                        }
                      }}
                      params={{ _splat: item.path.slice(1) }}
                      to="/$"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </Collapsible.Panel>
        </Collapsible.Root>
      ))
    )}
  </nav>
);
