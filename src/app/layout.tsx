import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Burnt Butter & Segelas Awan",
    template: "%s · Burnt Butter",
  },
  description: "Panel admin pesanan, produksi, dan pengiriman Burnt Butter & Segelas Awan.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster theme="light" position="top-right" />
      </body>
    </html>
  )
}
