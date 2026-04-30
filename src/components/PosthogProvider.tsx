"use client"

import { Suspense, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import posthog from "posthog-js"
import { PostHogProvider as PHProvider } from "posthog-js/react"

function PosthogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname
      const search = searchParams.toString()
      if (search) url += `?${search}`
      posthog.capture("$pageview", { $current_url: url })
    }
  }, [pathname, searchParams])

  return null
}

export default function PosthogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: false, // håndteres manuelt via PosthogPageView
      capture_pageleave: true,
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PosthogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
