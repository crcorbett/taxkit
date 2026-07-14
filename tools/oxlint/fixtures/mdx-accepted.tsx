import type { ComponentType } from "react";

const MDX: ComponentType<{
  readonly components: Readonly<Record<string, ComponentType>>;
}> = () => null;

const sharedMdxComponents: Readonly<Record<string, ComponentType>> = {};

export const AcceptedMdxRoute = () => <MDX components={sharedMdxComponents} />;
