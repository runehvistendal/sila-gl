"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type RoleMsg = { role: "user" | "assistant"; content: string }

export function SilaAI() {
  const t = useTranslations("chat")
  const locale = useLocale()
  const silaLocale: "da" | "en" = locale === "en" ? "en" : "da"
  const [messages, setMessages] = useState<RoleMsg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [showError, setShowError] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const showSuggestions = messages.length === 0 && !loading

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, loading])

  async function runAssistant(nextMessages: RoleMsg[]) {
    setLoading(true)
    setShowError(false)
    try {
      const res = await fetch("/api/chat/sila-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          locale: silaLocale,
        }),
      })
      const data = (await res.json()) as { reply?: string; error?: string }
      if (!res.ok || typeof data.reply !== "string") {
        setShowError(true)
        return
      }
      const replyText = data.reply.trim()
      if (!replyText) {
        setShowError(true)
        return
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: replyText },
      ])
    } catch {
      setShowError(true)
    } finally {
      setLoading(false)
    }
  }

  function sendQuestion(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    const next = [...messages, { role: "user" as const, content: trimmed }]
    setMessages(next)
    setInput("")
    void runAssistant(next)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex min-h-[160px] flex-1 flex-col gap-2 border-b border-border/60 px-1"
        aria-busy={loading}
      >
        <div className="flex shrink-0 items-center gap-2 px-2 py-2 text-muted-foreground">
          <Sparkles className="size-4 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">{t("ai_title")}</p>
            <p className="text-[11px] leading-snug">{t("ai_sub")}</p>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="max-h-[min(320px,45vh)] min-h-[120px] flex-1 overflow-y-auto px-2 pb-2 sm:max-h-[320px]"
        >
          {messages.map((m, i) => (
            <div
              key={`${i}-${m.role}-${m.content.slice(0, 12)}`}
              className={cn(
                "mb-2 flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[88%] rounded-2xl px-3 py-2 text-sm break-words",
                  m.role === "user"
                    ? "bg-[#114788] text-white"
                    : "bg-muted text-foreground",
                )}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading ? (
            <div className="flex justify-start">
              <div
                className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground"
                aria-live="polite"
              >
                <span className="sr-only">{t("ai_thinking")}</span>
                <span className="inline-flex items-center gap-1.5" aria-hidden>
                  <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                  <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                  <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                </span>
                <span aria-hidden className="text-xs">
                  {t("ai_thinking")}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {showError ? (
        <p
          className="shrink-0 px-3 py-2 text-center text-xs text-destructive"
          role="alert"
        >
          {t("ai_error")}
        </p>
      ) : null}

      {showSuggestions ? (
        <div className="flex flex-wrap gap-2 px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto max-w-full whitespace-normal rounded-full px-3 py-2 text-left text-xs"
            onClick={() => sendQuestion(t("ai_suggestion_1"))}
            disabled={loading}
          >
            {t("ai_suggestion_1")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto max-w-full whitespace-normal rounded-full px-3 py-2 text-left text-xs"
            onClick={() => sendQuestion(t("ai_suggestion_2"))}
            disabled={loading}
          >
            {t("ai_suggestion_2")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto max-w-full whitespace-normal rounded-full px-3 py-2 text-left text-xs"
            onClick={() => sendQuestion(t("ai_suggestion_3"))}
            disabled={loading}
          >
            {t("ai_suggestion_3")}
          </Button>
        </div>
      ) : null}

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex gap-2">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("ai_input_placeholder")}
            className="flex-1"
            aria-label={t("ai_input_placeholder")}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendQuestion(input)
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="shrink-0 bg-[#114788] text-white hover:bg-[#114788]/90 hover:text-white"
            aria-label={t("send")}
            disabled={loading || !input.trim()}
            onClick={() => sendQuestion(input)}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
