"use client"

import { useTheme } from "@/providers/theme-provider"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast rounded-lg shadow-md",
          info: "!bg-[#1D2B4F] !text-[#D4D8E4] !border-transparent",
          warning: "!bg-[#78412E] !text-[#FFE4D2] !border-transparent",
          error: "!bg-[#912A2A] !text-[#F5E5E5] !border-transparent",
          success: "!bg-[#4E782E] !text-[#F8FFF5] !border-transparent",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
