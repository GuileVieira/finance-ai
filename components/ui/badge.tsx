import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border",
        // Variantes monocromáticas
        primary: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        "primary-light": "border-transparent bg-primary-100 text-primary-700 hover:bg-primary-200",
        "primary-outline": "border-primary-300 text-primary-700 bg-primary-50/50",
        // Variantes semânticas
        success: "border-transparent bg-success text-success-foreground hover:bg-success/80",
        "success-light": "border-transparent bg-success/10 text-success hover:bg-success/20",
        danger: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        "danger-light": "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20",
        warning: "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
        info: "border-transparent bg-info text-info-foreground hover:bg-info/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
