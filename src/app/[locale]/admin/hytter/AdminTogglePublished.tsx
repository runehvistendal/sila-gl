"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { setCabinPublished } from "../actions"
import { toast } from "sonner"

interface Props {
  cabinId: string
  published: boolean
}

export default function AdminTogglePublished({ cabinId, published }: Props) {
  const t = useTranslations("admin")
  const tCommon = useTranslations("common")
  const [isPending, startTransition] = useTransition()
  const [current, setCurrent] = useState(published)

  function handleToggle() {
    startTransition(async () => {
      try {
        await setCabinPublished(cabinId, !current)
        setCurrent((v) => !v)
        toast.success(!current ? t("cabin_published") : t("cabin_unpublished"))
      } catch {
        toast.error(t("something_went_wrong"))
      }
    })
  }

  return (
    <Button
      size="sm"
      variant={current ? "outline" : "default"}
      onClick={handleToggle}
      disabled={isPending}
      className="text-xs"
    >
      {current ? tCommon("unpublish") : tCommon("publish")}
    </Button>
  )
}
