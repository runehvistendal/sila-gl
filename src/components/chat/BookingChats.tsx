"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useFormatter, useTranslations } from "next-intl"
import { ArrowLeft, MessageCircle, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase"
import {
  getBookingConversations,
  getMessages,
  sendMessage,
  type BookingConversation,
  type BookingType,
  type ChatMessageDto,
} from "@/app/actions/chat"
import { cn } from "@/lib/utils"

const POLL_MS = 15_000

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  const s = name.trim()
  return (s.length >= 2 ? s.slice(0, 2) : s.slice(0, 1) || "?").toUpperCase()
}

function previewText(text: string, max = 72): string {
  const t = text.replace(/\s+/g, " ").trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

export function BookingChats() {
  const t = useTranslations("chat")
  const tCommon = useTranslations("common")
  const tErr = useTranslations("errors")
  const format = useFormatter()
  const supabase = useMemo(() => createClient(), [])

  const [me, setMe] = useState<string | null>(null)
  const [view, setView] = useState<"list" | "thread">("list")
  const [selected, setSelected] = useState<BookingConversation | null>(null)
  const [conversations, setConversations] = useState<BookingConversation[]>([])
  const [messages, setMessages] = useState<ChatMessageDto[]>([])
  const [optimistic, setOptimistic] = useState<ChatMessageDto[]>([])
  const [draft, setDraft] = useState("")
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
  }, [supabase])

  useEffect(() => {
    let alive = true
    getBookingConversations().then((r) => {
      if (!alive) return
      setLoadingList(false)
      if ("error" in r) return
      setConversations(r.conversations)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      void getBookingConversations().then((r) => {
        if ("error" in r) return
        setConversations(r.conversations)
      })
    }, POLL_MS)
    return () => clearInterval(id)
  }, [])

  const fetchThreadMessages = useCallback(
    async (c: BookingConversation, silent: boolean) => {
      if (!silent) setLoadingThread(true)
      const r = await getMessages(c.booking_type as BookingType, c.booking_id)
      if (!silent) setLoadingThread(false)
      if ("error" in r) {
        if (!silent) toast.error(tErr("generic"))
        return
      }
      setMessages(r.messages)
    },
    [tErr],
  )

  useEffect(() => {
    if (view !== "thread" || !selected) return
    let cancelled = false
    const tick = (silent: boolean) => {
      void fetchThreadMessages(selected, silent).then(() => {
        if (cancelled) return
      })
    }
    tick(false)
    const id = setInterval(() => tick(true), POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [view, selected, fetchThreadMessages])

  const displayMsgs = useMemo(() => {
    return [...messages, ...optimistic].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
  }, [messages, optimistic])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [displayMsgs, view])

  function openThread(c: BookingConversation) {
    setSelected(c)
    setView("thread")
    setOptimistic([])
    setDraft("")
  }

  function backToList() {
    setView("list")
    setSelected(null)
    setMessages([])
    setOptimistic([])
    void getBookingConversations().then((r) => {
      if ("error" in r) return
      setConversations(r.conversations)
    })
  }

  async function handleSend() {
    const text = draft.trim()
    if (!text || !selected || sending) return
    const tempId = `opt-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const optimisticRow: ChatMessageDto = {
      id: tempId,
      sender_id: me ?? "",
      content: text,
      created_at: new Date().toISOString(),
      is_own: true,
    }
    setOptimistic((o) => [...o, optimisticRow])
    setDraft("")
    setSending(true)
    const r = await sendMessage(
      selected.booking_type,
      selected.booking_id,
      text,
    )
    setSending(false)
    setOptimistic((o) => o.filter((m) => m.id !== tempId))
    if ("error" in r) {
      setDraft(text)
      if (r.error === "rate_limit") toast.error(tErr("rate_limit"))
      else if (r.error === "invalid") toast.error(tErr("generic"))
      else toast.error(tErr("unauthorized"))
      return
    }
    await fetchThreadMessages(selected, false)
    void getBookingConversations().then((r) => {
      if ("error" in r) return
      setConversations(r.conversations)
    })
  }

  if (view === "list" && loadingList) {
    return (
      <div className="flex min-h-[240px] flex-1 items-center justify-center px-4 py-8 text-sm text-muted-foreground">
        {tCommon("loading")}
      </div>
    )
  }

  if (view === "list" && conversations.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
        <MessageCircle className="size-10 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium text-foreground">
          {t("no_conversations")}
        </p>
        <p className="max-w-[280px] text-xs text-muted-foreground">
          {t("no_conversations_sub")}
        </p>
      </div>
    )
  }

  if (view === "list") {
    return (
      <ul className="flex flex-1 flex-col divide-y divide-border overflow-y-auto">
        {conversations.map((c) => (
          <li key={`${c.booking_type}-${c.booking_id}`}>
            <button
              type="button"
              onClick={() => openThread(c)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              aria-label={`${c.other_user_name}. ${previewText(c.last_message)}`}
            >
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-[#114788] ring-1 ring-[#114788]/25"
                aria-hidden
              >
                {initials(c.other_user_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {c.other_user_name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {format.dateTime(new Date(c.last_message_at), {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="truncate text-xs text-muted-foreground">
                    {previewText(c.last_message)}
                  </p>
                  {c.unread_count > 0 ? (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {c.unread_count > 99 ? "99+" : c.unread_count}
                      <span className="sr-only">{t("unread")}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={backToList}
          className="shrink-0"
          aria-label={t("back")}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {selected?.other_user_name}
        </h3>
      </header>

      <div
        ref={scrollRef}
        className="max-h-[min(360px,50vh)] min-h-[200px] flex-1 overflow-y-auto px-3 py-3 sm:max-h-[360px]"
      >
        {loadingThread && displayMsgs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {tCommon("loading")}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayMsgs.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex",
                  m.is_own ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words",
                    m.is_own
                      ? "bg-[#114788] text-white"
                      : "bg-muted text-foreground",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex gap-2">
          <Input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("input_placeholder")}
            className="flex-1"
            aria-label={t("input_placeholder")}
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="shrink-0 bg-[#114788] text-white hover:bg-[#114788]/90 hover:text-white"
            aria-label={t("send")}
            disabled={sending || !draft.trim()}
            onClick={() => void handleSend()}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
