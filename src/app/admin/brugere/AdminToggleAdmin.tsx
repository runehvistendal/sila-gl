"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { setIsAdmin } from "../actions"
import { toast } from "sonner"

interface Props {
  userId: string
  isAdmin: boolean
}

export default function AdminToggleAdmin({ userId, isAdmin }: Props) {
  const [isPending, startTransition] = useTransition()
  const [current, setCurrent] = useState(isAdmin)

  function handleToggle() {
    startTransition(async () => {
      try {
        await setIsAdmin(userId, !current)
        setCurrent((v) => !v)
        toast.success(!current ? "Admin-adgang givet" : "Admin-adgang fjernet")
      } catch {
        toast.error("Noget gik galt")
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
      {current ? "Fjern admin" : "Giv admin"}
    </Button>
  )
}
