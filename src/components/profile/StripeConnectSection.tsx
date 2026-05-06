"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Loader2, CreditCard } from "lucide-react"
import { connect } from "@/app/actions/stripe"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { captureEvent } from "@/lib/analytics/posthog-events"

type Props = {
  stripeAccountId: string | null
  stripeOnboardingComplete: boolean
}

export default function StripeConnectSection({
  stripeAccountId,
  stripeOnboardingComplete,
}: Props) {
  const [isPending, startTransition] = useTransition()

  function onConnect() {
    captureEvent("stripe_onboarding_started", {})
    startTransition(async () => {
      const r = await connect()
      if ("error" in r) {
        toast.error(r.error)
        return
      }
      window.location.assign(r.url)
    })
  }

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-4"
      style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-slate-100"
          aria-hidden
        >
          <CreditCard className="w-5 h-5 text-slate-700" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="font-semibold text-gray-900">Udbetalinger (Stripe)</h2>
          <p className="text-sm text-gray-500">
            Forbind Stripe for at modtage betalinger som udbyder. Sila håndterer
            provision på platformen; du fuldfører verifikation hos Stripe.
          </p>

          {!stripeOnboardingComplete && !stripeAccountId && (
            <div className="pt-1">
              <Button
                type="button"
                disabled={isPending}
                onClick={onConnect}
                className="h-10 rounded-lg font-medium text-white border-0 w-full sm:w-auto"
                style={{ backgroundColor: "#4A9CC7" }}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
                    Henter link…
                  </>
                ) : (
                  "Forbind Stripe"
                )}
              </Button>
            </div>
          )}

          {!stripeOnboardingComplete && stripeAccountId && (
            <div className="space-y-2 pt-1">
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Stripe-opsætning ikke færdig
              </p>
              <Button
                type="button"
                disabled={isPending}
                onClick={onConnect}
                variant="outline"
                className="h-10 w-full sm:w-auto"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
                    Henter link…
                  </>
                ) : (
                  "Fortsæt opsætning"
                )}
              </Button>
            </div>
          )}

          {stripeOnboardingComplete && (
            <div className="space-y-1 pt-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  "bg-emerald-100 text-emerald-800",
                )}
              >
                Stripe forbundet ✓
              </span>
              <p className="text-sm text-gray-600">
                Du kan modtage udbetalinger
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
