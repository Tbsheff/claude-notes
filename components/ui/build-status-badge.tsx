import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { Button } from "./button"

const statusButtonVariants = cva(
  "inline-flex items-center space-x-2 text-sm font-medium h-auto p-2",
  {
    variants: {
      status: {
        building: "text-blue-600 hover:text-blue-700",
        success: "text-green-600 hover:text-green-700", 
        reloading: "text-orange-600 hover:text-orange-700",
      },
    },
    defaultVariants: {
      status: "building",
    },
  }
)

export interface BuildStatusBadgeProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof statusButtonVariants> {
  status: "building" | "success" | "reloading"
  children: React.ReactNode
}

function BuildStatusBadge({ className, status, children, ...props }: BuildStatusBadgeProps) {
  const dotClassName = cn(
    "w-2 h-2 rounded-full",
    {
      "bg-blue-500 animate-pulse": status === "building",
      "bg-green-500": status === "success",
      "bg-orange-500 animate-pulse": status === "reloading",
    }
  )

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(statusButtonVariants({ status }), className)}
      {...props}
    >
      <div className={dotClassName}></div>
      <span>{children}</span>
    </Button>
  )
}

export { BuildStatusBadge } 