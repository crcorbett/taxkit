import { expect } from "@effect/vitest";

export const expectAt = <A>(items: readonly A[], index: number): A => {
  const item = items[index];
  expect(item).toBeDefined();
  if (item === undefined) {
    throw new Error(`Expected item at index ${index}`);
  }
  return item;
};
