import type { Metadata } from "next"
import { Lora, Poppins } from "next/font/google"
import "./globals.css"

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
})

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
    <html
      lang="da"
      className={`${lora.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#09192A]">{children}</body>
    </html>
  )
}
