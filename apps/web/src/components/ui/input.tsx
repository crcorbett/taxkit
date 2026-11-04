import { Input as InputPrimitive } from "@base-ui/react/input";

export const Input = (props: Readonly<InputPrimitive.Props>) => (
  <InputPrimitive data-slot="input" {...props} />
);
