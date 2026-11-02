import { Dialog } from "@base-ui/react/dialog";
import { useAtom } from "@effect/atom-react";
import { Link } from "@tanstack/react-router";
import type {
  DocsPublicNavigation,
  DocsPublicPage,
} from "@taxkit/content/schemas";
import type { Option } from "effect";
import * as Atom from "effect/reactivity/Atom";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useMemo, useRef } from "react";

import { isDocsNavigationClick } from "./components";
import { DocsNavigation } from "./page.view";

export const DocsMenu = ({
  currentPath,
  navigation,
}: Readonly<{
  currentPath: Option.Option<DocsPublicPage["path"]>;
  navigation: DocsPublicNavigation;
}>) => {
  const portal = useRef<HTMLDivElement>(null);
  const menuAtom = useMemo(
    () => Atom.make<"closed" | "open" | "following-link">("closed"),
    []
  );
  const [menu, setMenu] = useAtom(menuAtom);
  const followLink = () => {
    setMenu("following-link");
  };
  return (
    <div className="docs-menu-host" ref={portal}>
      <Dialog.Root
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setMenu("open");
          } else {
            setMenu("closed");
          }
        }}
        open={menu === "open"}
      >
        <Dialog.Trigger
          aria-label="Open documentation menu"
          className="docs-icon-button docs-menu-trigger"
        >
          <Menu aria-hidden="true" size={20} />
        </Dialog.Trigger>
        <Dialog.Portal container={portal}>
          <Dialog.Backdrop className="docs-menu-backdrop" />
          <Dialog.Popup
            className="docs-menu-popup"
            finalFocus={menu !== "following-link"}
          >
            <div className="docs-menu-heading">
              <Dialog.Title>Documentation</Dialog.Title>
              <Dialog.Close
                aria-label="Close documentation menu"
                className="docs-icon-button"
              >
                <X aria-hidden="true" size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Browse the TaxKit guides and references.
            </Dialog.Description>
            <div className="docs-menu-scroll">
              <nav aria-label="TaxKit" className="docs-menu-shortcuts">
                <Link
                  onClick={(event) => {
                    if (isDocsNavigationClick(event)) {
                      followLink();
                    }
                  }}
                  to="/"
                >
                  Calculators <ArrowUpRight aria-hidden="true" size={15} />
                </Link>
                <Link
                  onClick={(event) => {
                    if (isDocsNavigationClick(event)) {
                      followLink();
                    }
                  }}
                  to="/agents"
                >
                  Agent access <ArrowUpRight aria-hidden="true" size={15} />
                </Link>
              </nav>
              <DocsNavigation
                currentPath={currentPath}
                navigation={navigation}
                onNavigate={followLink}
              />
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};
