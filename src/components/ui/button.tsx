"use client"
import { cn } from "@/lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 rounded-lg font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        {
          primary:
            "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500 shadow-sm",
          secondary:
            "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus-visible:ring-slate-400 shadow-sm",
          ghost:
            "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400",
          danger:
            "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm",
        }[variant],
        {
          sm: "px-3 py-1.5 text-xs",
          md: "px-4 py-2 text-sm",
          lg: "px-5 py-2.5 text-base",
        }[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
