import { Alert, AlertDescription, AlertTitle } from "@packages/ui/ui/alert";
import { Button } from "@packages/ui/ui/button";
import { IconAlertTriangle } from "@tabler/icons-react";
import {
  type ErrorComponentProps,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from "@tanstack/react-router";

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  const isRoot = useMatch({
    select: (state) => state.id === rootRouteId,
    strict: false,
  });

  console.error("DefaultCatchBoundary Error:", error);

  return (
    <div className="flex flex-col gap-4 py-8">
      <Alert variant="destructive">
        <IconAlertTriangle />
        <AlertTitle>Something broke</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Unknown error"}
        </AlertDescription>
      </Alert>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            router.invalidate();
          }}
        >
          retry
        </Button>
        {isRoot ? (
          <Button
            variant="ghost"
            size="sm"
            render={<Link to="/" />}
            nativeButton={false}
          >
            ← home
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.history.back();
            }}
          >
            ← back
          </Button>
        )}
      </div>
    </div>
  );
}
