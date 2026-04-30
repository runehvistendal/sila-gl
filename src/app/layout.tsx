import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { Toaster } from "sonner"
import Footer from "@/components/layout/Footer"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Sila.gl — Grønland på lokale vilkår",
  description:
    "Grønlands første marketplace for hytteudlejning, samsejlads og oplevelser. Find din næste arktiske oplevelse.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="da" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background font-sans">
        {children}
        <Footer />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
