"use client"

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { searchLocations } from "@/lib/locationSearch"
import type { GreenlandLocation } from "@/lib/greenlandLocations"

const TYPE_LABEL: Record<GreenlandLocation["type"], string> = {
  by: "By",
  bygd: "Bygd",
  hyttested: "Hyttested",
  naturområde: "Natur",
  fåreholdersted: "Fåreholder",
}

interface LocationAutocompleteProps {
  value: string
  onChange: (name_dk: string) => void
  placeholder?: string
  /** default: card + chevron (filtre). hero: hvid forside-søgning (ikon + skygge). embedded: kun input (Airbnb-pille). */
  variant?: "default" | "hero" | "embedded"
  className?: string
  inputClassName?: string
  listClassName?: string
  id?: string
  "aria-label"?: string
  /** false: kun bynavn i forslag (hytte-/transportfiltre). Hero m.m. bruger true. */
  showOptionMeta?: boolean
  /** Kontrolleret åben/luk (fx én dropdown ad gangen i forsøgebaren). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Vælg destination",
  variant = "default",
  className,
  inputClassName,
  listClassName,
  id: idProp,
  "aria-label": ariaLabel,
  showOptionMeta = true,
  open: openProp,
  onOpenChange,
}: LocationAutocompleteProps) {
  const autoId = useId()
  const listId = `${autoId}-listbox`
  const inputId = idProp ?? `${autoId}-input`

  const isControlled = openProp !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const open = isControlled ? Boolean(openProp) : internalOpen
  const setOpenState = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )
  const [draft, setDraft] = useState(value)
  const [highlighted, setHighlighted] = useState(-1)
  const [prevCommittedValue, setPrevCommittedValue] = useState(value)

  const wrapRef = useRef<HTMLDivElement>(null)
  const portalLayerRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLLIElement | null)[]>([])

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const [portalBox, setPortalBox] = useState({ top: 0, left: 0, width: 0 })

  if (value !== prevCommittedValue) {
    setPrevCommittedValue(value)
    setDraft(value)
  }

  const inputValue = isControlled && !open ? value : draft

  const suggestions = open ? searchLocations(draft) : []

  const isHero = variant === "hero"
  const isEmbedded = variant === "embedded"
  const isHeroShell = isHero || isEmbedded

  const updatePortalPosition = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const gap = isHeroShell ? 8 : 4
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    const vw = window.innerWidth

    let left = rect.left + scrollX
    let width = rect.width

    if (isEmbedded) {
      const margin = 12
      const maxPanel = Math.max(200, vw - margin * 2)
      const isMd = window.matchMedia("(min-width: 768px)").matches
      if (isMd) {
        const minDesktop = 420
        const maxDesktop = Math.min(520, maxPanel)
        width = Math.min(Math.max(rect.width, minDesktop), maxDesktop)
      } else {
        width = Math.min(Math.max(rect.width, 280), maxPanel)
      }

      const rightEdge = left + width
      const maxRight = scrollX + vw - margin
      if (rightEdge > maxRight) {
        left = Math.max(scrollX + margin, maxRight - width)
      }
      if (left < scrollX + margin) {
        left = scrollX + margin
      }
    }

    setPortalBox({
      left,
      top: rect.bottom + scrollY + gap,
      width,
    })
  }, [isHeroShell, isEmbedded])

  useEffect(() => {
    if (!open) return
    updatePortalPosition()
    window.addEventListener("resize", updatePortalPosition)
    window.addEventListener("scroll", updatePortalPosition, true)
    return () => {
      window.removeEventListener("resize", updatePortalPosition)
      window.removeEventListener("scroll", updatePortalPosition, true)
    }
  }, [open, updatePortalPosition])

  const close = useCallback(() => {
    setOpenState(false)
    setHighlighted(-1)
    setDraft(value)
  }, [value, setOpenState])

  const commit = useCallback(
    (loc: GreenlandLocation) => {
      onChange(loc.name_dk)
      setDraft(loc.name_dk)
      setOpenState(false)
      setHighlighted(-1)
    },
    [onChange, setOpenState],
  )

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node
      if (wrapRef.current?.contains(t)) return
      if (portalLayerRef.current?.contains(t)) return
      close()
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [close])

  useEffect(() => {
    const el = rowRefs.current[highlighted]
    if (el) el.scrollIntoView({ block: "nearest" })
  }, [highlighted])

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setDraft(value)
        setOpenState(true)
        setHighlighted(suggestions.length > 0 ? 0 : -1)
        return
      }
      /* hero/embedded: lukket liste + Enter → lad overliggende formular submitte */
      if (e.key === "Enter" && (variant === "hero" || variant === "embedded")) return
      if (e.key === "Enter") {
        setDraft(value)
        setOpenState(true)
        setHighlighted(suggestions.length > 0 ? 0 : -1)
      }
      return
    }

    if (e.key === "Escape") {
      e.preventDefault()
      close()
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlighted((i) => Math.min(i + 1, suggestions.length - 1))
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlighted((i) => Math.max(i - 1, 0))
      return
    }

    if (e.key === "Enter") {
      e.preventDefault()
      const pick =
        highlighted >= 0 ? suggestions[highlighted] : suggestions[0]
      if (pick) commit(pick)
      else close()
      return
    }
  }

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative",
        variant === "default" && "min-w-[min(100%,11rem)]",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex items-center",
          isHero &&
            "gap-2.5 px-4 py-4 md:py-3.5 bg-white rounded-2xl shadow-2xl w-full min-w-0",
          isEmbedded && "w-full min-w-0",
        )}
      >
        {isHero ? (
          <Search size={17} className="text-gray-400 shrink-0 pointer-events-none" aria-hidden />
        ) : null}
        <div className={cn("relative flex flex-1 items-center min-w-0", variant === "default" && "w-full")}>
          <Input
            id={inputId}
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-autocomplete="list"
            aria-label={ariaLabel}
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => {
              const v = e.target.value
              setDraft(v)
              setOpenState(true)
              setHighlighted(0)
            }}
            onFocus={() => {
              setDraft(value)
              setOpenState(true)
              setHighlighted(0)
            }}
            onBlur={() => {
              window.setTimeout(() => {
                const a = document.activeElement
                if (
                  wrapRef.current?.contains(a) ||
                  portalLayerRef.current?.contains(a)
                ) {
                  return
                }
                setDraft(value)
                setOpenState(false)
                setHighlighted(-1)
              }, 120)
            }}
            onKeyDown={onKeyDown}
            autoComplete="off"
            className={cn(
              isHeroShell
                ? "h-9 border-0 bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0 text-sm text-gray-700 placeholder:text-gray-400 rounded-none px-0 py-0 pr-9"
                : "h-10 rounded-xl pr-16",
              inputClassName,
            )}
          />
          {variant === "default" ? (
            <ChevronDown
              className="pointer-events-none absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
          ) : null}
          {value ? (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Ryd destination"
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 rounded-md p-1",
                isHeroShell
                  ? "text-gray-400 hover:text-gray-600"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange("")
                setDraft("")
                setOpenState(false)
                setHighlighted(-1)
              }}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {mounted &&
        open &&
        (suggestions.length > 0 ||
          (draft.trim() !== "" && suggestions.length === 0)) &&
        createPortal(
          <div
            ref={portalLayerRef}
            data-location-autocomplete-portal
            style={{
              position: "absolute",
              left: portalBox.left,
              top: portalBox.top,
              width: portalBox.width,
              zIndex: 60,
            }}
          >
            {suggestions.length > 0 ? (
              <ul
                id={listId}
                role="listbox"
                className={cn(
                  "max-h-[min(18rem,50vh)] overflow-auto py-1",
                  isHeroShell
                    ? "rounded-2xl border border-gray-100 bg-white text-gray-800 shadow-2xl"
                    : "rounded-xl border border-border bg-popover text-popover-foreground shadow-md",
                  listClassName,
                )}
              >
                {suggestions.map((loc, i) => {
                  const active = i === highlighted
                  return (
                    <li
                      key={`${loc.postal_code}-${loc.name_dk}`}
                      ref={(el) => {
                        rowRefs.current[i] = el
                      }}
                      role="option"
                      aria-selected={active}
                      className={cn(
                        "flex cursor-pointer px-3 py-2 text-sm",
                        showOptionMeta &&
                          "flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2",
                        isHeroShell
                          ? active
                            ? "bg-gray-100"
                            : "hover:bg-gray-50"
                          : active
                            ? "bg-primary/10"
                            : "hover:bg-muted",
                      )}
                      onMouseEnter={() => setHighlighted(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => commit(loc)}
                    >
                      <span
                        className={cn(
                          "font-medium",
                          isHeroShell ? "text-gray-800" : "text-foreground",
                        )}
                      >
                        {loc.name_dk}
                      </span>
                      {showOptionMeta ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex shrink-0 rounded-md border px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide",
                              isHeroShell
                                ? active
                                  ? "border-gray-300 text-gray-600"
                                  : "border-gray-200 text-gray-500"
                                : cn(
                                    "border-border text-muted-foreground",
                                    active &&
                                      "border-primary/40 bg-primary/5 text-primary",
                                  ),
                            )}
                          >
                            {TYPE_LABEL[loc.type]}
                          </span>
                          <span
                            className={cn(
                              "text-xs",
                              isHeroShell ? "text-gray-400" : "text-muted-foreground",
                            )}
                          >
                            {loc.region_label}
                          </span>
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : null}
            {draft.trim() !== "" && suggestions.length === 0 ? (
              <div
                className={cn(
                  "px-3 py-2 text-sm shadow-md",
                  isHeroShell
                    ? "rounded-2xl border border-gray-100 bg-white text-gray-500 shadow-2xl"
                    : "rounded-xl border border-border bg-popover text-muted-foreground shadow-md",
                )}
                role="status"
              >
                Ingen resultater
              </div>
            ) : null}
          </div>,
          document.body,
        )}
    </div>
  )
}
