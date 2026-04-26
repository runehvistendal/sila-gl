"use client"

import { useState } from "react"
import Link from "next/link"
import { Globe, ChevronDown, User, Menu, X, Anchor } from "lucide-react"

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed top-0 w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-white">
          <Anchor size={20} className="text-[#4A9CC7]" />
          <span className="text-xl font-semibold" style={{ fontFamily: "var(--font-lora)" }}>
            Sila
          </span>
        </Link>

        {/* Nav links - desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/90">
          <Link href="/hytter" className="hover:text-white transition-colors">Hytter</Link>
          <Link href="/transport" className="hover:text-white transition-colors">Transport</Link>
        </div>

        {/* Right - desktop */}
        <div className="hidden md:flex items-center gap-4 text-sm text-white/80">
          <button className="flex items-center gap-1 hover:text-white transition-colors">
            DKK (kr) <ChevronDown size={13} />
          </button>
          <button className="flex items-center gap-1.5 hover:text-white transition-colors">
            <Globe size={14} /> Dansk
          </button>
          <button className="w-9 h-9 rounded-full border border-white/25 flex items-center justify-center hover:bg-white/10 transition-colors">
            <User size={16} />
          </button>
        </div>

        {/* Hamburger - mobile */}
        <button
          className="md:hidden text-white p-1"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden border-t px-4 pb-6 pt-4 flex flex-col gap-5 text-white text-base"
          style={{
            backgroundColor: "rgba(9,25,42,0.97)",
            backdropFilter: "blur(12px)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <Link href="/hytter" onClick={() => setOpen(false)}>Hytter</Link>
          <Link href="/transport" onClick={() => setOpen(false)}>Transport</Link>
          <hr style={{ borderColor: "rgba(255,255,255,0.08)" }} />
          <div className="flex items-center gap-6 text-sm text-white/60">
            <span>DKK (kr)</span>
            <span className="flex items-center gap-1.5">
              <Globe size={13} /> Dansk
            </span>
          </div>
        </div>
      )}
    </nav>
  )
}