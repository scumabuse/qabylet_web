import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium",
    "transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-150 ease-out",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg shadow-xs hover:bg-accent-hover",
        secondary:
          "border border-border bg-surface text-fg shadow-xs hover:border-border-strong hover:bg-hover",
        ghost: "text-fg-muted hover:bg-hover hover:text-fg",
        soft: "bg-accent-soft text-accent-text hover:bg-accent-soft-strong",
        danger: "bg-danger-solid text-white shadow-xs hover:opacity-90",
        "danger-ghost": "text-danger hover:bg-danger-soft",
      },
      size: {
        sm: "h-8 px-3 text-[0.8125rem]",
        md: "h-9 px-3.5 text-sm",
        lg: "h-11 px-5 text-[0.9375rem]",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  }
);

export type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
