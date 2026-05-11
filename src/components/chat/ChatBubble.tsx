"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { MessageCircle } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { getUnreadMessageCount } from "@/app/actions/chat"
import { ChatDrawer } from "@/components/chat/ChatDrawer"
import { cn } from "@/lib/utils"

const MOBILE_MQ = "(max-width: 639px)"
const UNREAD_POLL_MS = 30_000

export function ChatBubble() {
  const t = useTranslations("chat")
  const supabase = useMemo(() => createClient(), [])
  const [loggedIn, setLoggedIn] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(true)
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setLoggedIn(!!data.session?.user)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user)
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    if (!loggedIn) return
    let cancelled = false
    async function tick() {
      const r = await getUnreadMessageCount()
      if (cancelled || "error" in r) return
      setUnreadMsgCount(r.count)
    }
    void tick()
    const id = setInterval(() => void tick(), UNREAD_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [loggedIn])

  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia(MOBILE_MQ)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  if (!loggedIn) {
    return null
  }

  const hasUnread = unreadMsgCount > 0

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className={cn(
          "fixed right-4 bottom-4 z-50 flex size-14 items-center justify-center rounded-full shadow-lg transition-opacity hover:opacity-90 sm:right-6 sm:bottom-6 relative",
          "bg-[#114788] text-white focus-visible:ring-2 focus-visible:ring-[#114788] focus-visible:ring-offset-2 focus-visible:outline-none"
        )}
        aria-label={t("title")}
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
      >
        <MessageCircle className="size-6" aria-hidden />
        {hasUnread ? (
          <span
            className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-red-500 ring-2 ring-white"
            aria-hidden
          />
        ) : null}
      </button>

      <ChatDrawer open={drawerOpen} onOpenChange={setDrawerOpen} isMobile={isMobile} />
    </>
  )
}
