"use client"

import { Printer } from "lucide-react"

/**
 * Åbner browserens print-dialog; vælg «Gem som PDF» som destinationsprinter.
 */
export default function UdbyderguidePdfButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center size-12 shrink-0 rounded-2xl border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
      title="Gem siden som PDF (udskriftsdialog)"
      aria-label="Udskriv eller gem siden som PDF"
    >
      <Printer className="size-5" aria-hidden />
    </button>
  )
}
