import type { ComponentProps } from "react";

export const Field = (props: Readonly<ComponentProps<"div">>) => (
  <div data-slot="field" {...props} />
);

export const FieldLabel = ({
  htmlFor,
  ...props
}: Readonly<ComponentProps<"label"> & { htmlFor: string }>) => (
  <label data-slot="field-label" htmlFor={htmlFor} {...props} />
);

export const FieldDescription = (props: Readonly<ComponentProps<"p">>) => (
  <p data-slot="field-description" {...props} />
);
