"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, ChevronUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { BookingChats } from "@/components/chat/BookingChats"
import { ChatHelpSection } from "@/components/chat/ChatHelpSection"
import { cn } from "@/lib/utils"

type ChatDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile: boolean
}

function ChatDrawerInner({ onClose }: { onClose: () => void }) {
  const t = useTranslations("chat")
  const tCommon = useTranslations("common")
  const [bookingsOpen, setBookingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const toggleBookings = () => setBookingsOpen((v) => !v)
  const toggleHelp = () => setHelpOpen((v) => !v)

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <h2 className="text-base font-semibold text-neutral-900">{t("title")}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="shrink-0 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
          aria-label={tCommon("close")}
        >
          <X className="size-5" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div
          className={cn(
            "flex min-h-0 flex-col border-b border-neutral-200 bg-white",
            bookingsOpen ? "flex-1" : "shrink-0",
          )}
        >
          <button
            type="button"
            onClick={toggleBookings}
            aria-expanded={bookingsOpen}
            className="flex w-full shrink-0 items-center justify-between gap-2 bg-white px-4 py-3 text-left"
          >
            <span className="text-sm font-semibold text-neutral-700">{t("section_bookings")}</span>
            {bookingsOpen ? (
              <ChevronUp className="size-5 shrink-0 text-neutral-400" aria-hidden />
            ) : (
              <ChevronDown className="size-5 shrink-0 text-neutral-400" aria-hidden />
            )}
          </button>
          {bookingsOpen ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <BookingChats />
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "flex min-h-0 flex-col bg-white",
            helpOpen ? "flex-1" : "shrink-0",
          )}
        >
          <button
            type="button"
            onClick={toggleHelp}
            aria-expanded={helpOpen}
            className="flex w-full shrink-0 items-center justify-between gap-2 bg-white px-4 py-3 text-left"
          >
            <span className="text-sm font-semibold text-neutral-700">{t("help.title")}</span>
            {helpOpen ? (
              <ChevronUp className="size-5 shrink-0 text-neutral-400" aria-hidden />
            ) : (
              <ChevronDown className="size-5 shrink-0 text-neutral-400" aria-hidden />
            )}
          </button>
          {helpOpen ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <ChatHelpSection />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function ChatDrawer({ open, onOpenChange, isMobile }: ChatDrawerProps) {
  const t = useTranslations("chat")

  const inner = <ChatDrawerInner onClose={() => onOpenChange(false)} />

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="flex max-h-[85vh] min-h-0 flex-col gap-0 overflow-hidden rounded-t-2xl border-t border-neutral-200 bg-white p-0"
          aria-describedby={undefined}
        >
          {inner}
        </SheetContent>
      </Sheet>
    )
  }

  if (!open) {
    return null
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[55] bg-black/10"
        aria-hidden
        tabIndex={-1}
        onClick={() => onOpenChange(false)}
      />
      <div
        className="fixed right-6 bottom-24 z-[60] flex h-[560px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm sm:bottom-28"
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
      >
        {inner}
      </div>
    </>
  )
}
