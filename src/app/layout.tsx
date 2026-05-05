import type { ReactNode } from "react"
import { Plus_Jakarta_Sans } from "next/font/google"
import { getLocale } from "next-intl/server"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
})

// Root layout — required <html> and <body> shell for all routes (including /studio).
// lang is resolved from next-intl's server context; falls back to "da".
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale().catch(() => "da")
  return (
    <html lang={locale} className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background font-sans">
        {children}
      </body>
    </html>
  )
}
