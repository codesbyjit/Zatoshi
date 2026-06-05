import * as React from "react";

import { Slot } from "@radix-ui/react-slot";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /**
   * Used to force the control to be displayed as a label element
   * while the underlying element rendered is a different element.
   */
  asChild?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "label";
    return <Comp className={className} ref={ref} {...props} />;
  },
);
Label.displayName = "Label";

export { Label };
