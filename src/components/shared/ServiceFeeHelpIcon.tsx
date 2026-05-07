"use client"

import { CircleHelp } from "lucide-react"

type Props = {
  /** Fuld forklaring vist ved hover (kan være flere linjer) */
  tooltipText: string
  /** Kort label til skærmlæsere */
  ariaLabel: string
}

/**
 * Lille hjælp-ikon med synlig tooltip ved hover (desktop); `title` som fallback.
 */
export default function ServiceFeeHelpIcon({ tooltipText, ariaLabel }: Props) {
  return (
    <span className="relative inline-flex align-middle group/sfee">
      <button
        type="button"
        className="inline-flex shrink-0 text-muted-foreground hover:text-foreground touch-manipulation rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={ariaLabel}
        title={tooltipText}
      >
        <CircleHelp className="w-3.5 h-3.5" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible group-hover/sfee:visible group-focus-within/sfee:visible opacity-0 group-hover/sfee:opacity-100 group-focus-within/sfee:opacity-100 transition-opacity duration-150 absolute z-[60] bottom-full left-1/2 -translate-x-1/2 mb-2 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md text-left leading-snug"
      >
        {tooltipText}
      </span>
    </span>
  )
}
