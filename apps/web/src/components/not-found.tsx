import { Button } from "@packages/ui/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@packages/ui/ui/empty";
import { IconCompass } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function NotFound({ children }: { children?: ReactNode }) {
  return (
    <Empty className="border-none py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconCompass />
        </EmptyMedia>
        <EmptyTitle>404 — page not found</EmptyTitle>
        <EmptyDescription>
          {children ?? "That page doesn't exist."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="outline"
          size="sm"
          render={<Link to="/" />}
          nativeButton={false}
        >
          ← home
        </Button>
      </EmptyContent>
    </Empty>
  );
}
