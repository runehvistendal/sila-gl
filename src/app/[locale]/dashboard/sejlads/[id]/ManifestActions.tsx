"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Printer, CloudLightning } from "lucide-react"
import { useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cancelRideShare } from "@/app/actions/rideShares"
import type { RideShareCancelReason } from "@/lib/rideSharePolicy"

interface Props {
  rideShareId: string
  confirmedCount: number
  canCancel: boolean
}

export default function ManifestActions({ rideShareId, confirmedCount, canCancel }: Props) {
  const t = useTranslations("dashboard")
  const router = useRouter()
  const [reason, setReason] = useState<RideShareCancelReason>("weather")
  const [pending, startTransition] = useTransition()

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelRideShare(rideShareId, reason)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      toast.success(t("manifest_cancelled_ok", { count: res.refundedCount }))
      router.refresh()
    })
  }

  return (
    <div className="print:hidden mt-6 space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto rounded-xl h-11 gap-2"
        onClick={() => window.print()}
      >
        <Printer className="w-4 h-4" />
        {t("manifest_print")}
      </Button>

      {canCancel && (
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CloudLightning className="w-4 h-4 text-muted-foreground" />
            {t("manifest_cancel_title")}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("manifest_cancel_body")}</p>

          <fieldset className="mt-4 space-y-2">
            {(["weather", "skipper_cancelled"] as const).map((r) => (
              <label
                key={r}
                className={`flex items-center gap-3 rounded-xl border px-3 min-h-[44px] cursor-pointer ${
                  reason === r ? "border-[#114788] bg-[#114788]/5" : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name="cancel_reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-[#114788]"
                />
                <span className="text-sm">
                  {r === "weather" ? t("manifest_cancel_reason_weather") : t("manifest_cancel_reason_other")}
                </span>
              </label>
            ))}
          </fieldset>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className="mt-4 w-full sm:w-auto rounded-xl h-11 text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
              >
                {t("manifest_cancel_button")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("manifest_cancel_confirm_title")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("manifest_cancel_confirm_body", { count: confirmedCount })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("manifest_cancel_keep")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel} disabled={pending}>
                  {t("manifest_cancel_button")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      )}
    </div>
  )
}
