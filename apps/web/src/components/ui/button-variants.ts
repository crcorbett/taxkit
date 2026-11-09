export type ButtonVariants = Readonly<{
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "lg" | "icon";
}>;

// The shared Button styling contract. Native links and native form buttons use
// it without loading the Base UI Button runtime.
export const buttonVariants = ({
  variant = "default",
  size = "default",
}: ButtonVariants = {}) => ({
  "data-slot": "button",
  "data-ui-button": "",
  "data-variant": variant,
  "data-size": size,
});
