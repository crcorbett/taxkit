import { Effect, Layer } from "effect";

import type { DocsDeploymentInventoryReport } from "./inventory.schemas.js";
import { DocsDeploymentInventory } from "./inventory.service.js";

export const DocsDeploymentInventoryTest = (
  report: DocsDeploymentInventoryReport
) =>
  Layer.succeed(
    DocsDeploymentInventory,
    DocsDeploymentInventory.of({ read: Effect.succeed(report) })
  );
