"use client"

import posthog from "posthog-js"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef } from "react"
import { OAuthReturnTracker } from "@/components/analytics/OAuthReturnTracker"

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const didInit = useRef(false)

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
    if (!key || !host) return

    if (!didInit.current) {
      posthog.init(key, {
        api_host: host,
        capture_pageview: false,
        capture_pageleave: true,
        persistence: "localStorage+cookie",
      })
      didInit.current = true
    }

    const qs = searchParams.toString()
    const pathWithQuery = qs ? `${pathname}?${qs}` : pathname
    posthog.capture("$pageview", {
      $current_url:
        typeof window !== "undefined" ? window.location.href : pathWithQuery,
    })
  }, [pathname, searchParams])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <Suspense fallback={null}>
        <OAuthReturnTracker />
      </Suspense>
      {children}
    </>
  )
}
