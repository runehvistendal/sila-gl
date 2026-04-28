"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import ReviewForm, { type ReviewFormProps } from "./ReviewForm"

interface Props extends ReviewFormProps {
  label?: string
}

export default function ReviewDialog({ label = "Skriv anmeldelse", ...formProps }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 rounded-lg border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Skriv en anmeldelse</DialogTitle>
        </DialogHeader>
        <ReviewForm {...formProps} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
