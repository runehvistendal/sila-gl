"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { captureEvent } from "@/lib/analytics/posthog-events"

export interface TransportMapRoute {
  id: string
  fromName: string
  fromLat: number
  fromLng: number
  toName: string
  toLat: number
  toLng: number
  /** Optional metadata shown in overview popup */
  meta?: {
    departure?: string
    seatsAvailable?: number
    priceOre?: number
    skipperName?: string
  }
}

export interface TransportMapProps {
  routes: TransportMapRoute[]
  selectedId?: string
  onSelect?: (id: string) => void
  mode: "overview" | "detail"
  className?: string
  /** PostHog map_interacted (transport | cabin) */
  analyticsType?: "transport" | "cabin"
}

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""

const GREENLAND_CENTER: [number, number] = [-44, 69]
const GREENLAND_BOUNDS: mapboxgl.LngLatBoundsLike = [[-73, 59], [-11, 84]]

function formatKrLocal(ore: number) {
  return (ore / 100).toLocaleString("da-DK", { style: "currency", currency: "DKK", maximumFractionDigits: 0 })
}

function midpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Buet linje der buer vestover (ud over havet langs Grønlands kyst) */
function createArc(
  from: [number, number],
  to:   [number, number],
  points = 30
): [number, number][] {
  const coords: [number, number][] = []
  for (let i = 0; i <= points; i++) {
    const t     = i / points
    const lng   = from[0] + (to[0] - from[0]) * t
    const lat   = from[1] + (to[1] - from[1]) * t
    const bulge = Math.sin(Math.PI * t) * -4
    coords.push([lng + bulge, lat])
  }
  return coords
}

/** Custom HTML-markør med farve og emoji */
function makeMarkerEl(color: string, emoji: string): HTMLDivElement {
  const el = document.createElement("div")
  el.style.cssText = `
    width:32px;height:32px;border-radius:50%;
    background:${color};border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,.3);
    display:flex;align-items:center;
    justify-content:center;font-size:14px;
    cursor:default;
  `
  el.innerHTML = emoji
  return el
}

export default function TransportMap({
  routes,
  selectedId,
  onSelect,
  mode,
  className = "",
  analyticsType,
}: TransportMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<mapboxgl.Map | null>(null)
  const [loaded, setLoaded] = useState(false)

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return null

  // ── Shared map factory ───────────────────────────────────────────────────
  function initMap(el: HTMLDivElement) {
    if (mapRef.current) return
    const map = new mapboxgl.Map({
      container:          el,
      style:              "mapbox://styles/mapbox/streets-v12",
      center:             GREENLAND_CENTER,
      zoom:               mode === "detail" ? 5 : 3.5,
      maxBounds:          GREENLAND_BOUNDS,
      fadeDuration:       0,
      renderWorldCopies:  false,
      attributionControl: false,
    })
    mapRef.current = map
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right")
    if (mode === "detail") {
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right")
    }
    map.on("load", () => {
      if (mode === "detail") renderDetail(map)
      else renderOverview(map)
      setLoaded(true)

      if (analyticsType) {
        let zoomTimer: ReturnType<typeof setTimeout> | null = null
        map.on("zoomend", () => {
          if (zoomTimer) clearTimeout(zoomTimer)
          zoomTimer = setTimeout(() => {
            captureEvent("map_interacted", {
              type: analyticsType,
              action: "zoom",
            })
          }, 600)
        })
      }
    })
  }

  // ── Initialise: detail = immediately, overview = IntersectionObserver ────
  useEffect(() => {
    const el = containerRef.current
    if (!el || mapRef.current) return

    if (mode === "detail") {
      initMap(el)
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries[0].isIntersecting) return
          observer.disconnect()
          initMap(el)
        },
        { threshold: 0.1 }
      )
      observer.observe(el)
      return () => {
        observer.disconnect()
        if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      }
    }

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── selectedId change: flyTo midpoint ─────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded || !selectedId || mode !== "overview") return

    const route = routes.find((r) => r.id === selectedId)
    if (!route) return

    const mid = midpoint([route.fromLng, route.fromLat], [route.toLng, route.toLat])
    map.flyTo({ center: mid, zoom: 5, speed: 1.2, curve: 1.4 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, loaded])

  // ── Detail renderer ────────────────────────────────────────────────────────
  function renderDetail(map: mapboxgl.Map) {
    if (routes.length === 0) return
    const route = routes[0]
    const from: [number, number] = [route.fromLng, route.fromLat]
    const to:   [number, number] = [route.toLng,   route.toLat]

    // Buet linje (arc vestover langs kysten)
    map.addSource("route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: createArc(from, to) },
      },
    })
    map.addLayer({
      id: "route-line", type: "line", source: "route",
      paint: { "line-color": "#4A9CC7", "line-width": 3, "line-opacity": 0.9 },
      layout: { "line-cap": "round", "line-join": "round" },
    })
    map.addLayer({
      id: "route-glow", type: "line", source: "route",
      paint: { "line-color": "#4A9CC7", "line-width": 6, "line-opacity": 0.2, "line-blur": 4 },
    })

    // Labels via symbol layer (vises over markørerne)
    map.addSource("label-points", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          { type: "Feature", properties: { label: capitalize(route.fromName) }, geometry: { type: "Point", coordinates: from } },
          { type: "Feature", properties: { label: capitalize(route.toName) },   geometry: { type: "Point", coordinates: to } },
        ],
      },
    })
    map.addLayer({
      id: "point-labels", type: "symbol", source: "label-points",
      layout: {
        "text-field":  ["get", "label"],
        "text-size":   13,
        "text-offset": [0, -2.4],
        "text-anchor": "bottom",
        "text-font":   ["DIN Pro Medium", "Arial Unicode MS Regular"],
      },
      paint: { "text-color": "#111827", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
    })

    // HTML-markører placeret præcist på koordinaterne
    new mapboxgl.Marker({ element: makeMarkerEl("#22c55e", "⚓") })
      .setLngLat(from)
      .addTo(map)

    new mapboxgl.Marker({ element: makeMarkerEl("#ef4444", "🏁") })
      .setLngLat(to)
      .addTo(map)

    // Fit til ruten
    const bounds = new mapboxgl.LngLatBounds(from, from)
    bounds.extend(to)
    map.fitBounds(bounds, { padding: 80, maxZoom: 8, duration: 800 })
  }

  // ── Overview renderer ─────────────────────────────────────────────────────
  function renderOverview(map: mapboxgl.Map) {
    const lineFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = []
    const dotFeatures:  GeoJSON.Feature<GeoJSON.Point>[]      = []

    for (const r of routes) {
      const from: [number, number] = [r.fromLng, r.fromLat]
      const to: [number, number] = [r.toLng, r.toLat]

      lineFeatures.push({
        type: "Feature",
        properties: { id: r.id },
        geometry: { type: "LineString", coordinates: [from, to] },
      })

      dotFeatures.push({
        type: "Feature",
        properties: {
          id:            r.id,
          fromName:      capitalize(r.fromName),
          toName:        capitalize(r.toName),
          departure:     r.meta?.departure ?? "",
          seats:         r.meta?.seatsAvailable ?? 0,
          price:         r.meta?.priceOre ?? 0,
          skipperName:   r.meta?.skipperName ?? "Sila-sejler",
        },
        geometry: { type: "Point", coordinates: to },
      })
    }

    map.addSource("routes", {
      type: "geojson",
      data: { type: "FeatureCollection", features: lineFeatures },
    })
    map.addLayer({
      id: "routes-line", type: "line", source: "routes",
      paint: { "line-color": "#4A9CC7", "line-width": 2, "line-opacity": 0.55 },
      layout: { "line-cap": "round", "line-join": "round" },
    })

    map.addSource("route-dots", {
      type: "geojson",
      data: { type: "FeatureCollection", features: dotFeatures },
    })
    // Departure dot (green) — styled via circle layer
    map.addLayer({
      id: "route-dot-bg", type: "circle", source: "route-dots",
      paint: { "circle-radius": 9, "circle-color": "#22c55e", "circle-stroke-width": 2, "circle-stroke-color": "#ffffff", "circle-opacity": 0.9 },
    })

    let hoverPopup: mapboxgl.Popup | null = null

    // Hover popup
    map.on("mouseenter", "route-dot-bg", (e) => {
      map.getCanvas().style.cursor = "pointer"
      const f = e.features?.[0]
      if (!f) return
      const p = f.properties as {
        id: string; fromName: string; toName: string
        departure: string; seats: number; price: number; skipperName: string
      }
      const depLabel = p.departure
        ? new Date(p.departure).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })
        : ""

      hoverPopup = new mapboxgl.Popup({ closeButton: false, offset: 12, maxWidth: "220px" })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="font-family:system-ui;padding:2px 0">
            <p style="font-weight:700;font-size:13px;margin:0 0 3px">${p.fromName} → ${p.toName}</p>
            ${depLabel ? `<p style="color:#6b7280;font-size:11px;margin:0 0 2px">${depLabel}</p>` : ""}
            <p style="font-size:11px;margin:0 0 2px">${p.seats} plads${p.seats !== 1 ? "er" : ""} · ${p.price ? formatKrLocal(p.price) + "/plads" : ""}</p>
            <p style="color:#6b7280;font-size:11px;margin:0">Sejler: ${p.skipperName}</p>
          </div>
        `)
        .addTo(map)
    })

    map.on("mouseleave", "route-dot-bg", () => {
      map.getCanvas().style.cursor = ""
      hoverPopup?.remove()
      hoverPopup = null
    })

    // Click: flyTo + callback
    map.on("click", "route-dot-bg", (e) => {
      const f = e.features?.[0]
      if (!f) return
      const p = f.properties as { id: string; fromName: string; toName: string }
      if (analyticsType) {
        captureEvent("map_interacted", { type: analyticsType, action: "click_marker" })
      }
      const route = routes.find((r) => r.id === p.id)
      if (!route) return

      const mid = midpoint([route.fromLng, route.fromLat], [route.toLng, route.toLat])
      map.flyTo({ center: mid, zoom: 5.5, speed: 1.2, curve: 1.4 })

      onSelect?.(p.id)
    })
  }

  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-border ${className}`}
      style={{ isolation: "isolate" }}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Indlæser kort...
          </div>
        </div>
      )}
      <div className="relative z-0 w-full h-full">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  )
}
