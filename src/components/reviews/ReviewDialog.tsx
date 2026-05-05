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
import { useTranslations } from "next-intl"
import ReviewForm, { type ReviewFormProps } from "./ReviewForm"

interface Props extends ReviewFormProps {
  label?: string
}

export default function ReviewDialog({ label, ...formProps }: Props) {
  const t = useTranslations("reviews")
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
          {label ?? t("write_review")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">{t("dialog_title")}</DialogTitle>
        </DialogHeader>
        <ReviewForm {...formProps} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
