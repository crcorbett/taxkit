import { Button as ButtonPrimitive } from "@base-ui/react/button";

type ButtonVariants = Readonly<{
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "lg" | "icon";
}>;

export const buttonVariants = ({
  variant = "default",
  size = "default",
}: ButtonVariants = {}) => ({
  "data-slot": "button",
  "data-ui-button": "",
  "data-variant": variant,
  "data-size": size,
});

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
