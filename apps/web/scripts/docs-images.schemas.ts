import { Schema } from "effect";

import { WebsiteDocsImageSize } from "../src/lib/docs/social.schemas";

// This checks the PNG envelope, dimensions and bounded bytes. Real Chromium
// decoding of every generated image independently qualifies its pixel content.
export const WebsiteDocsImageBytes = Schema.Uint8Array.check(
  Schema.makeFilter(
    (bytes) => {
      if (bytes.byteLength < 24 || bytes.byteLength > 500_000) {
        return false;
      }
      const data = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength
      );
      return (
        data.getBigUint64(0) === 0x89_50_4e_47_0d_0a_1a_0an &&
        data.getUint32(16) === WebsiteDocsImageSize.width &&
        data.getUint32(20) === WebsiteDocsImageSize.height
      );
    },
    {
      message:
        "The public image must have the owned PNG dimensions and byte bound.",
    }
  )
).pipe(Schema.brand("taxkit/WebsiteDocsImageBytes"));
