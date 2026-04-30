"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { setCabinPublished } from "../actions"
import { toast } from "sonner"

interface Props {
  cabinId: string
  published: boolean
}

export default function AdminTogglePublished({ cabinId, published }: Props) {
  const [isPending, startTransition] = useTransition()
  const [current, setCurrent] = useState(published)

  function handleToggle() {
    startTransition(async () => {
      try {
        await setCabinPublished(cabinId, !current)
        setCurrent((v) => !v)
        toast.success(!current ? "Hytte publiceret" : "Hytte sat som kladde")
      } catch {
        toast.error("Noget gik galt")
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
      {current ? "Afpublicér" : "Publicér"}
    </Button>
  )
}
