"use client"

import { useTranslations } from "next-intl"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookingChats } from "@/components/chat/BookingChats"
import { SilaAI } from "@/components/chat/SilaAI"

type ChatDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile: boolean
}

function ChatDrawerInner({ onClose }: { onClose: () => void }) {
  const t = useTranslations("chat")
  const tCommon = useTranslations("common")

  const tabTriggerClass =
    "flex-1 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 py-3 text-sm font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-[#114788] data-[state=active]:bg-transparent data-[state=active]:text-[#114788] data-[state=active]:shadow-none dark:data-[state=active]:border-[#114788] dark:data-[state=active]:text-[#114788]"

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="shrink-0"
          aria-label={tCommon("close")}
        >
          <X className="size-5" />
        </Button>
      </header>

      <Tabs defaultValue="bookings" className="flex min-h-0 flex-1 flex-col">
        <TabsList
          variant="line"
          className="h-auto w-full shrink-0 justify-stretch rounded-none border-b border-border bg-transparent p-0"
        >
          <TabsTrigger value="bookings" className={tabTriggerClass}>
            {t("tab_bookings")}
          </TabsTrigger>
          <TabsTrigger value="ai" className={tabTriggerClass}>
            {t("tab_ai")}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="bookings"
          className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
        >
          <BookingChats />
        </TabsContent>
        <TabsContent
          value="ai"
          className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
        >
          <SilaAI />
        </TabsContent>
      </Tabs>
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
          className="flex h-[min(90dvh,600px)] max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-t-2xl p-0"
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
        className="fixed right-4 bottom-20 z-[60] flex h-[520px] w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:right-6"
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
      >
        {inner}
      </div>
    </>
  )
}
