"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { setIsAdmin } from "../actions"
import { toast } from "sonner"

interface Props {
  userId: string
  isAdmin: boolean
}

export default function AdminToggleAdmin({ userId, isAdmin }: Props) {
  const t = useTranslations("admin")
  const [isPending, startTransition] = useTransition()
  const [current, setCurrent] = useState(isAdmin)

  function handleToggle() {
    startTransition(async () => {
      try {
        await setIsAdmin(userId, !current)
        setCurrent((v) => !v)
        toast.success(!current ? t("admin_granted") : t("admin_revoked"))
      } catch {
        toast.error(t("something_went_wrong"))
      }
    })
  }

  return (
    <Button
      size="sm"
      variant={current ? "destructive" : "outline"}
      onClick={handleToggle}
      disabled={isPending}
      className="text-xs"
    >
      {current ? t("revoke_admin") : t("grant_admin")}
    </Button>
  )
}
