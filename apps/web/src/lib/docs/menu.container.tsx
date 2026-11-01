import { Dialog } from "@base-ui/react/dialog";
import { Link } from "@tanstack/react-router";
import type {
  DocsPublicNavigation,
  DocsPublicPage,
} from "@taxkit/content/schemas";
import type { Option } from "effect";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useRef, useState } from "react";

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
  const [open, setOpen] = useState(false);
  const [followingLink, setFollowingLink] = useState(false);
  const followLink = () => {
    setFollowingLink(true);
    setOpen(false);
  };
  return (
    <div className="docs-menu-host" ref={portal}>
      <Dialog.Root
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) {
            setFollowingLink(false);
          }
        }}
        open={open}
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
            finalFocus={() => {
              if (followingLink) {
                return document.querySelector("#taxkit-docs-content");
              }
              return true;
            }}
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
