import {
  declareDocsStack,
  docsCloudflareStackName,
} from "@taxkit/infrastructure/stack";
import { decodeDocsCloudflareStackStage } from "@taxkit/infrastructure/website";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Stack } from "alchemy/Stack";
import { Stage } from "alchemy/Stage";
import * as Effect from "effect/Effect";

export default Alchemy.Stack(
  docsCloudflareStackName,
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const stack = yield* Stack;
    const stage = yield* Stage.pipe(
      Effect.flatMap(decodeDocsCloudflareStackStage)
    );
    return yield* declareDocsStack({ stackName: stack.name, stage });
  })
);
