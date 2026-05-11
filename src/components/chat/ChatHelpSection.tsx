"use client"

import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion"
import { useTranslations } from "next-intl"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type FaqItem = { value: string; qKey: string; aKey: string }

type FaqGroup = { headingKey: string; items: FaqItem[] }

const FAQ_GROUPS: FaqGroup[] = [
  {
    headingKey: "prices_title",
    items: [
      { value: "prices-provider", qKey: "prices_provider_q", aKey: "prices_provider_a" },
      { value: "prices-guest", qKey: "prices_guest_q", aKey: "prices_guest_a" },
      { value: "prices-payment", qKey: "prices_payment_q", aKey: "prices_payment_a" },
    ],
  },
  {
    headingKey: "booking_title",
    items: [
      { value: "booking-how", qKey: "booking_how_q", aKey: "booking_how_a" },
      { value: "booking-contact", qKey: "booking_contact_q", aKey: "booking_contact_a" },
      { value: "booking-rideshare", qKey: "booking_rideshare_q", aKey: "booking_rideshare_a" },
      { value: "booking-wish", qKey: "booking_wish_q", aKey: "booking_wish_a" },
    ],
  },
  {
    headingKey: "cancellation_title",
    items: [
      { value: "cancel-guest", qKey: "cancellation_guest_q", aKey: "cancellation_guest_a" },
      { value: "cancel-refund", qKey: "cancellation_refund_q", aKey: "cancellation_refund_a" },
      { value: "cancel-host", qKey: "cancellation_host_q", aKey: "cancellation_host_a" },
    ],
  },
  {
    headingKey: "support_title",
    items: [
      { value: "support-complaint", qKey: "support_complaint_q", aKey: "support_complaint_a" },
      { value: "support-service", qKey: "support_service_q", aKey: "support_service_a" },
      { value: "support-privacy", qKey: "support_privacy_q", aKey: "support_privacy_a" },
    ],
  },
  {
    headingKey: "providers_title",
    items: [
      { value: "providers-start", qKey: "providers_start_q", aKey: "providers_start_a" },
      { value: "providers-payout", qKey: "providers_payout_q", aKey: "providers_payout_a" },
      { value: "providers-transport", qKey: "providers_transport_q", aKey: "providers_transport_a" },
    ],
  },
]

export function ChatHelpSection({ className }: { className?: string }) {
  const t = useTranslations("chat.help")

  return (
    <section
      className={cn(
        "border-t border-neutral-200 bg-neutral-50/80 px-3 py-3",
        className,
      )}
      aria-label={t("title")}
    >
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
        {t("title")}
      </h3>
      <div className="max-h-[min(260px,38vh)] overflow-y-auto pr-1">
        {FAQ_GROUPS.map((group) => (
          <div key={group.headingKey} className="mb-4 last:mb-0">
            <h4 className="mb-1.5 px-1 text-xs font-medium text-neutral-800">
              {t(group.headingKey)}
            </h4>
            <Accordion type="multiple" className="space-y-1">
              {group.items.map((item) => (
                <AccordionItem
                  key={item.value}
                  value={item.value}
                  className="overflow-hidden rounded-lg border border-neutral-200/80 bg-white"
                >
                  <AccordionHeader className="flex">
                    <AccordionTrigger className="flex flex-1 items-center justify-between gap-2 px-2.5 py-2 text-left text-xs font-medium text-neutral-900 outline-none hover:bg-neutral-50 [&[data-state=open]>svg]:rotate-180">
                      {t(item.qKey)}
                      <ChevronDown
                        className="size-4 shrink-0 text-neutral-400 transition-transform duration-200"
                        aria-hidden
                      />
                    </AccordionTrigger>
                  </AccordionHeader>
                  <AccordionContent className="overflow-hidden">
                    <p className="border-t border-neutral-100 px-2.5 py-2 text-xs leading-relaxed text-neutral-600">
                      {t(item.aKey)}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>
    </section>
  )
}
