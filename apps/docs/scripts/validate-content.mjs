#!/usr/bin/env bun

import { spawn } from "node:child_process";

const child = spawn(
  "bun",
  ["run", "--filter=@whattax/docs-content", "validate"],
  {
    stdio: "inherit",
  }
);

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
