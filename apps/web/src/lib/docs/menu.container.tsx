import { useAtom } from "@effect/atom-react";
import { Link } from "@tanstack/react-router";
import type {
  DocsPublicNavigation,
  DocsPublicPage,
} from "@taxkit/content/schemas";
import type { Option } from "effect";
import * as Atom from "effect/reactivity/Atom";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useRef } from "react";

import { Button } from "#/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from "#/components/ui/sheet";

import { isDocsNavigationClick } from "./components";
import { DocsNavigation } from "./page.view";

// One docs menu is mounted at a time. The registry resets this mount-local
// state once its last subscriber unmounts.
const docsMenuAtom = Atom.make<"closed" | "open" | "following-link">("closed");

export const DocsMenu = ({
  currentPath,
  navigation,
}: Readonly<{
  currentPath: Option.Option<DocsPublicPage["path"]>;
  navigation: DocsPublicNavigation;
}>) => {
  const portal = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useAtom(docsMenuAtom);
  const followLink = () => {
    setMenu("following-link");
  };
  return (
    <div className="docs-menu-host" ref={portal}>
      <Sheet
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setMenu("open");
          } else {
            setMenu("closed");
          }
        }}
        open={menu === "open"}
      >
        <SheetTrigger
          aria-label="Open documentation menu"
          render={
            <Button className="docs-menu-trigger" size="icon" variant="ghost" />
          }
        >
          <Menu aria-hidden="true" size={20} />
        </SheetTrigger>
        <SheetPortal container={portal}>
          <SheetOverlay />
          <SheetContent
            className="docs-menu-popup"
            finalFocus={menu !== "following-link"}
            side="left"
          >
            <SheetHeader className="docs-menu-heading">
              <SheetTitle>Documentation</SheetTitle>
              <SheetClose
                aria-label="Close documentation menu"
                render={<Button size="icon" variant="ghost" />}
              >
                <X aria-hidden="true" size={20} />
              </SheetClose>
            </SheetHeader>
            <SheetDescription className="sr-only">
              Browse the TaxKit guides and references.
            </SheetDescription>
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
          </SheetContent>
        </SheetPortal>
      </Sheet>
    </div>
  );
};
