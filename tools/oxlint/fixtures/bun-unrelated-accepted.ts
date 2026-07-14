const Bun = {
  file: (path: string) => path,
  spawn: (command: readonly string[]) => command,
};
const BunRuntime = {
  runMain: <Value>(value: Value) => value,
};

export const localBunValues = [
  Bun.file("package.json"),
  Bun.spawn(["bun", "--version"]),
  BunRuntime.runMain("local"),
];
