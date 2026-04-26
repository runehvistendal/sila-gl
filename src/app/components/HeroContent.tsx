"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Search } from "lucide-react"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import type { GreenlandLocation } from "@/lib/greenlandLocations"

const majorHubs = GREENLAND_LOCATIONS.filter((l) => l.is_major_hub)

export default function HeroContent() {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const results =
    query.length > 0
      ? GREENLAND_LOCATIONS.filter(
          (l) =>
            l.name_dk.toLowerCase().startsWith(query.toLowerCase()) ||
            l.name_gl.toLowerCase().startsWith(query.toLowerCase())
        ).slice(0, 7)
      : []

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function pick(loc: GreenlandLocation) {
    setQuery(loc.name_dk)
    setOpen(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-20 pb-16 md:pt-28 md:pb-24">

      {/* Badge */}
      <motion.div
        className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-6 text-sm font-medium"
        style={{ backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.9)" }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        Greenland&#39;s cabin &amp; boat marketplace
      </motion.div>

      {/* Headline */}
      <motion.h1
        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-4 max-w-2xl"
        style={{}}
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
      >
        Grønland på lokale vilkår
      </motion.h1>

      <motion.p
        className="text-lg md:text-xl text-white/80 mb-8 max-w-md leading-relaxed"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        Autentiske arktiske oplevelser fra dem, der kalder det hjem
      </motion.p>

      {/* Søgefelt + separat Søg-knap */}
      <motion.div
        ref={containerRef}
        className="relative"
        style={{ maxWidth: "480px" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
      >
        <div className="flex items-center gap-2">
          {/* Input-boks */}
          <div className="flex items-center gap-2.5 flex-1 px-4 py-3.5 bg-white rounded-2xl shadow-2xl">
            <Search size={17} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              placeholder="Søg i Grønland..."
              className="flex-1 text-sm text-gray-700 outline-none placeholder:text-gray-400 bg-transparent min-w-0"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">
                &times;
              </button>
            )}
          </div>

          {/* Separat Søg-knap */}
          <button
            className="px-5 py-3.5 rounded-2xl text-sm font-semibold text-white shrink-0 hover:opacity-90 transition-opacity shadow-2xl whitespace-nowrap"
            style={{ backgroundColor: "#124788" }}
          >
            Søg
          </button>
        </div>

        {/* Autocomplete */}
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
            {results.map((loc) => (
              <button
                key={loc.postal_code}
                onMouseDown={() => pick(loc)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <Search size={13} className="text-gray-400 shrink-0" />
                <span className="text-sm text-gray-800">{loc.name_dk}</span>
                <span className="text-xs text-gray-400 ml-auto">{loc.region}</span>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* By-chips */}
      <motion.div
        className="flex flex-wrap gap-2 mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        {majorHubs.map((loc) => (
          <button
            key={loc.postal_code}
            onMouseDown={() => setQuery(loc.name_dk)}
            className="text-xs px-3 py-1.5 rounded-full transition-all hover:bg-white/20"
            style={{ backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)" }}
          >
            {loc.name_dk}
          </button>
        ))}
      </motion.div>
    </div>
  )
}