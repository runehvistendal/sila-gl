"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "sila_onboarding_dismissed"

export default function DashboardOnboardingBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (typeof window === "undefined") return
      setVisible(localStorage.getItem(STORAGE_KEY) !== "1")
    } catch {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="mb-6 rounded-2xl border border-border bg-white shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex gap-3 min-w-0">
        <span className="text-xl shrink-0" aria-hidden>
          🏠
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-sm sm:text-base">
            Har du en hytte eller båd?
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Opret dit første opslag og tjen penge på Sila
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <Button asChild size="sm" className="rounded-xl">
          <Link href="/opret">Opret nyt opslag →</Link>
        </Button>
        <button
          type="button"
          onClick={dismiss}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Luk banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
