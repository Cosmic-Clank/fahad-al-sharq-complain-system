"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"
import { useLanguage } from "@/hooks/use-language"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const language = useLanguage()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      // Toast text is already translated by lib/notify — keep Google Translate out
      className="toaster group notranslate"
      dir={language === "ar" ? "rtl" : "ltr"}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
