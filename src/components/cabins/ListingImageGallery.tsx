"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Maximize2, X, ChevronLeft, ChevronRight } from "lucide-react"
import { captureEvent } from "@/lib/analytics/posthog-events"

const FALLBACK =
  "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=900&h=600&fit=crop"

interface Props {
  images?: string[]
  title?: string
  /** Når sat, trackes gallery_viewed én gang ved mount */
  cabinId?: string
}

export default function ListingImageGallery({
  images: rawImages,
  title = "",
  cabinId,
}: Props) {
  const images = rawImages?.filter((img) => img?.startsWith("http")) ?? []
  const allImages = images.length > 0 ? images : [FALLBACK]

  const [active, setActive]   = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [lbIndex, setLbIndex] = useState(0)

  useEffect(() => {
    if (!cabinId) return
    const n = rawImages?.filter((img) => img?.startsWith("http")).length ?? 0
    captureEvent("gallery_viewed", {
      cabin_id: cabinId,
      image_count: n > 0 ? n : 1,
    })
  }, [cabinId, rawImages])

  const prev = useCallback(() => setActive((i) => (i - 1 + allImages.length) % allImages.length), [allImages.length])
  const next = useCallback(() => setActive((i) => (i + 1) % allImages.length), [allImages.length])

  const lbPrev = useCallback(() => setLbIndex((i) => (i - 1 + allImages.length) % allImages.length), [allImages.length])
  const lbNext = useCallback(() => setLbIndex((i) => (i + 1) % allImages.length), [allImages.length])

  useEffect(() => {
    if (!lightbox) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  lbPrev()
      if (e.key === "ArrowRight") lbNext()
      if (e.key === "Escape")     setLightbox(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [lightbox, lbPrev, lbNext])

  const openLightbox = (idx: number) => { setLbIndex(idx); setLightbox(true) }

  return (
    <>
      <div className="mb-8 space-y-2">
        {/* Main 16:9 image */}
        <div className="relative w-full rounded-2xl overflow-hidden bg-muted" style={{ aspectRatio: "16/9" }}>
          <AnimatePresence mode="wait">
            <motion.img
              key={active}
              src={allImages[active]}
              alt={title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK }}
            />
          </AnimatePresence>

          {allImages.length > 1 && (
            <>
              <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors" aria-label="Forrige">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors" aria-label="Næste">
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {allImages.length > 1 && (
              <span className="bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
                {active + 1} / {allImages.length}
              </span>
            )}
            <button onClick={() => openLightbox(active)} title="Vis fuldskærm" className="bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`relative shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200 bg-muted ${
                  active === i
                    ? "border-primary shadow-md scale-[1.04]"
                    : "border-transparent opacity-65 hover:opacity-100 hover:border-border"
                }`}
                style={{ width: 96, aspectRatio: "16/9" }}
              >
                <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) setLightbox(false) }}
          >
            <button onClick={() => setLightbox(false)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors z-10">
              <X className="w-5 h-5" />
            </button>

            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
              {lbIndex + 1} / {allImages.length}
            </div>

            {allImages.length > 1 && (
              <button onClick={lbPrev} className="absolute left-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors z-10">
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <AnimatePresence mode="wait">
              <motion.img
                key={lbIndex}
                src={allImages[lbIndex]}
                alt={title}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK }}
              />
            </AnimatePresence>

            {allImages.length > 1 && (
              <button onClick={lbNext} className="absolute right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors z-10">
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {allImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] pb-1">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setLbIndex(i)}
                    className={`shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                      lbIndex === i ? "border-white scale-105" : "border-white/30 opacity-60 hover:opacity-100"
                    }`}
                    style={{ width: 64, aspectRatio: "16/9" }}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK }} />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
