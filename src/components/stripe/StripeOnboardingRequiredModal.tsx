"use client"

import { useTransition } from "react"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getStripeOnboardingUrl } from "@/app/actions/stripe"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Ved kald efter Stripe allerede er komplet i DB — fortsæt publicering */
  cabinId: string | null
  onStripeReady?: (cabinId: string) => void | Promise<void>
}

export function StripeOnboardingRequiredModal({
  open,
  onOpenChange,
  cabinId,
  onStripeReady,
}: Props) {
  const t = useTranslations("dashboard")
  const [pending, startTransition] = useTransition()

  function handlePrimary() {
    startTransition(async () => {
      const id = cabinId
      if (!id) {
        onOpenChange(false)
        return
      }
      const res = await getStripeOnboardingUrl()
      if ("alreadyComplete" in res && res.alreadyComplete) {
        onOpenChange(false)
        if (onStripeReady) await onStripeReady(id)
        return
      }
      if ("url" in res && res.url) {
        window.open(res.url, "_blank", "noopener,noreferrer")
        return
      }
      if ("error" in res) {
        toast.error(res.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle className="text-lg pr-8">{t("stripe_onboarding_modal_title")}</DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed pt-2">
            {t("stripe_onboarding_modal_body")}
          </DialogDescription>
        </DialogHeader>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-foreground">
          <li>{t("stripe_onboarding_step_1")}</li>
          <li>{t("stripe_onboarding_step_2")}</li>
          <li>{t("stripe_onboarding_step_3")}</li>
        </ol>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto order-2 sm:order-1"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {t("stripe_onboarding_later")}
          </Button>
          <Button
            type="button"
            disabled={pending || !cabinId}
            className="w-full sm:w-auto order-1 sm:order-2 rounded-xl text-white hover:opacity-95"
            style={{ backgroundColor: "#114788" }}
            onClick={handlePrimary}
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden />
                …
              </>
            ) : (
              t("stripe_onboarding_primary_cta")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
