import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  icon: LucideIcon
  message: string
  cta: string
  ctaHref: string
}

export default function EmptyState({ icon: Icon, message, cta, ctaHref }: Props) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-border">
      <Icon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-muted-foreground font-medium mb-4">{message}</p>
      <Button variant="outline" asChild className="rounded-xl px-6">
        <Link href={ctaHref}>{cta}</Link>
      </Button>
    </div>
  )
}
