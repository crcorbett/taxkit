import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpClientResponse from "effect/http/HttpClientResponse";

import { handlePayPreview } from "../src/node-server.js";

it.effect("the server example preserves the documented weekly pay result", () =>
  Effect.gen(function* () {
    const response = yield* handlePayPreview(
      new Request("https://example.test/pay", {
        body: '{"grossPayCents":165400,"period":"weekly","taxFreeThresholdClaimed":true}',
        method: "POST",
      })
    );
    expect(response.headers.get("content-type")).toBe("application/json");
    const body = yield* HttpClientResponse.fromWeb(
      HttpClientRequest.get("https://example.test/pay"),
      response
    ).text;
    expect(body).toBe('{"netPayCents":130100,"withholdingsCents":35300}');
  })
);

it.effect.each([
  '{"grossPayCents":1.5,"period":"weekly","taxFreeThresholdClaimed":true}',
  '{"grossPayCents":165400,"period":"unsupported","taxFreeThresholdClaimed":true}',
  "private-invalid-json",
])("the server example rejects invalid request representations: %s", (body) =>
  Effect.gen(function* () {
    const error = yield* handlePayPreview(
      new Request("https://example.test/pay", {
        body,
        method: "POST",
      })
    ).pipe(Effect.flip);
    expect(error._tag).toBe("PayPreviewRequestError");
    expect(error.message).toBe("Invalid pay preview request.");
  })
);
