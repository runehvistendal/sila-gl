"use client"

import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { Sparkles, MapPin } from "lucide-react"
import { oreToKr } from "@/lib/money"
import { cn } from "@/lib/utils"

export type ExperienceListingItem = {
  id: string
  title: string
  description: string
  price_per_person_ore: number
  location: string
  images: string[]
}

function isSafeImageUrl(url: string): boolean {
  return typeof url === "string" && (url.startsWith("https://") || url.startsWith("http://"))
}

export default function ExperienceCard(props: ExperienceListingItem) {
  const { id, title, description, price_per_person_ore, location, images } = props
  const first = images.find(isSafeImageUrl)

  const priceKr = oreToKr(price_per_person_ore).toLocaleString("da-DK")

  const href = `/oplevelser/${id}` as const

  return (
    <Link href={href} className="group block h-full">
      <article
        className={cn(
          "flex h-full flex-col rounded-2xl border border-border bg-white p-5 shadow-card",
          "transition-all hover:border-primary/30 hover:shadow-card-hover",
        )}
      >
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg bg-muted">
          {first ? (
            <Image
              src={first}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width:768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-muted">
              <Sparkles className="size-12 text-muted-foreground/35" aria-hidden />
            </div>
          )}
        </div>

        <h3 className="mb-2 line-clamp-2 font-semibold leading-snug text-foreground">{title}</h3>

        <p className="mb-3 flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary/80" aria-hidden />
          <span className="line-clamp-2">{location}</span>
        </p>

        {description ? (
          <p className="mb-4 line-clamp-2 flex-1 text-sm text-muted-foreground">{description}</p>
        ) : (
          <div className="mb-4 flex-1" />
        )}

        <p className="mt-auto text-sm font-semibold tabular-nums" style={{ color: "#114788" }}>
          fra {priceKr} kr{" "}
          <span className="font-normal text-muted-foreground">pr. person</span>
        </p>
      </article>
    </Link>
  )
}
