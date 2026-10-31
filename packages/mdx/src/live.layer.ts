import { Layer } from "effect";

import { MdxArtifactsLive } from "./artifacts.layer.js";
import { MdxCompilerLive } from "./compiler.layer.js";
import { MdxRendererLive } from "./renderer.layer.js";

// Convenience composition. Provider requirements remain explicit.
export const MdxLive = Layer.mergeAll(
  MdxCompilerLive,
  MdxRendererLive,
  MdxArtifactsLive
);
