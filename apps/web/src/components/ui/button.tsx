import { Button as ButtonPrimitive } from "@base-ui/react/button";

import { buttonVariants } from "./button-variants";
import type { ButtonVariants } from "./button-variants";

export const Button = ({
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: Readonly<ButtonPrimitive.Props & ButtonVariants>) => (
  <ButtonPrimitive
    {...buttonVariants({ variant, size })}
    type={type}
    {...props}
  />
);
