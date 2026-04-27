"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { MapPin, Anchor, ChevronLeft, ChevronRight, Zap, Users } from "lucide-react"
import { formatKr } from "@/lib/money"

export interface CabinCardData {
  id: string
  title: string
  location_hub: string
  price_per_night_ore: number
  max_guests: number
  instant_book: boolean
  offers_transport: boolean
  images: string[]
  host_name: string | null
}

const FALLBACK =
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe3e?w=600&h=400&fit=crop&q=80"

export default function CabinCard({ cabin }: { cabin: CabinCardData }) {
  const images = cabin.images?.length ? cabin.images : [FALLBACK]
  const [idx, setIdx] = useState(0)
  const [imgError, setImgError] = useState(false)
  const imgSrc = imgError ? FALLBACK : images[idx]

  function prev(e: React.MouseEvent) {
    e.preventDefault()
    setIdx((i) => (i === 0 ? images.length - 1 : i - 1))
    setImgError(false)
  }
  function next(e: React.MouseEvent) {
    e.preventDefault()
    setIdx((i) => (i === images.length - 1 ? 0 : i + 1))
    setImgError(false)
  }

  return (
    <Link href={`/hytter/${cabin.id}`} className="group block">
      {/* Image */}
      <div className="relative overflow-hidden rounded-2xl aspect-[4/3] mb-3 bg-gradient-to-br from-primary/30 to-accent/30">
        <Image
          src={imgSrc}
          alt={cabin.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          onError={() => setImgError(true)}
          unoptimized={imgSrc.startsWith("http")}
        />

        {/* Carousel arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors z-10"
              aria-label="Forrige billede"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors z-10"
              aria-label="Næste billede"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {images.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx ? "bg-white w-4" : "bg-white/50 w-1.5"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Transport badge — top left */}
        {cabin.offers_transport && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1 bg-card text-primary shadow-sm text-xs font-semibold px-2.5 py-0.5 rounded-md">
              <Anchor size={11} /> Transport
            </span>
          </div>
        )}

        {/* Instant Book badge — top right */}
        {cabin.instant_book && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-0.5 rounded-md">
              <Zap size={11} /> Instant Book
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors line-clamp-1">
            {cabin.title}
          </h3>
          <span className="text-sm font-semibold text-foreground whitespace-nowrap shrink-0">
            {formatKr(cabin.price_per_night_ore)}{" "}
            <span className="font-normal text-muted-foreground text-xs">/ nat</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-muted-foreground text-xs">
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {cabin.location_hub}
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} />
            op til {cabin.max_guests}
          </span>
        </div>

        {cabin.host_name && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Udbyder: {cabin.host_name}
          </p>
        )}
      </div>
    </Link>
  )
}
