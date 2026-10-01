"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""

const GREENLAND_BOUNDS: mapboxgl.LngLatBoundsLike = [
  [-73, 59],
  [-11, 84],
]

/** Buet linje (samme idé som TransportMap). */
function createArc(
  from: [number, number],
  to: [number, number],
  points = 28,
): [number, number][] {
  const coords: [number, number][] = []
  for (let i = 0; i <= points; i++) {
    const t = i / points
    const lng = from[0] + (to[0] - from[0]) * t
    const lat = from[1] + (to[1] - from[1]) * t
    const bulge = Math.sin(Math.PI * t) * -4
    coords.push([lng + bulge, lat])
  }
  return coords
}

function makeMarkerEl(color: string): HTMLDivElement {
  const el = document.createElement("div")
  el.style.cssText = `
    width:22px;height:22px;border-radius:50%;
    background:${color};border:2px solid white;
    box-shadow:0 1px 4px rgba(0,0,0,.25);
  `
  return el
}

function isFiniteNum(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v)
}

function validRoute(
  a: number | null | undefined,
  b: number | null | undefined,
  c: number | null | undefined,
  d: number | null | undefined,
): boolean {
  return isFiniteNum(a) && isFiniteNum(b) && isFiniteNum(c) && isFiniteNum(d)
}

type Props = {
  className?: string
  /** Fra → til (alle fire skal være gyldige tal). */
  routeFromLng?: number | null
  routeFromLat?: number | null
  routeToLng?: number | null
  routeToLat?: number | null
  /** Ét punkt */
  markerLng?: number | null
  markerLat?: number | null
}

/** Kvadratisk dashboard-forhåndsvisning; zoom via kontroller, ingen musehjul-zoom (mobil scroll). */
export default function TransportMiniStaticMap({
  className = "",
  routeFromLng,
  routeFromLat,
  routeToLng,
  routeToLat,
  markerLng,
  markerLat,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  const hasRoute = validRoute(routeFromLng, routeFromLat, routeToLng, routeToLat)
  const hasMarker = isFiniteNum(markerLng) && isFiniteNum(markerLat)

  useEffect(() => {
    const el = containerRef.current
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim()
    if (!el || !token || (!hasRoute && !hasMarker)) return

    let cancelled = false
    const cleanupMarkers: mapboxgl.Marker[] = []

    const map = new mapboxgl.Map({
      container: el,
      style: "mapbox://styles/mapbox/streets-v12",
      interactive: true,
      attributionControl: false,
      maxBounds: GREENLAND_BOUNDS,
      renderWorldCopies: false,
    })
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right")
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right")
    map.scrollZoom.disable()

    const resizeObs = new ResizeObserver(() => map.resize())
    resizeObs.observe(el)

    map.on("load", () => {
      if (cancelled) return

      if (
        isFiniteNum(routeFromLng) &&
        isFiniteNum(routeFromLat) &&
        isFiniteNum(routeToLng) &&
        isFiniteNum(routeToLat)
      ) {
        const from: [number, number] = [routeFromLng, routeFromLat]
        const to: [number, number] = [routeToLng, routeToLat]
        const same =
          Math.abs(from[0] - to[0]) < 1e-7 && Math.abs(from[1] - to[1]) < 1e-7

        if (!same) {
          map.addSource("mini-route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: createArc(from, to) },
            },
          })
          map.addLayer({
            id: "mini-route-line",
            type: "line",
            source: "mini-route",
            paint: {
              "line-color": "#114788",
              "line-width": 2.5,
              "line-opacity": 0.9,
            },
            layout: { "line-cap": "round", "line-join": "round" },
          })
        }

        const m1 = new mapboxgl.Marker({ element: makeMarkerEl("#114788") })
          .setLngLat(from)
          .addTo(map)
        cleanupMarkers.push(m1)
        if (!same) {
          const m2 = new mapboxgl.Marker({ element: makeMarkerEl("#2563eb") })
            .setLngLat(to)
            .addTo(map)
          cleanupMarkers.push(m2)
        }

        const bounds = new mapboxgl.LngLatBounds(from, from)
        bounds.extend(to)
        map.fitBounds(bounds, { padding: 28, maxZoom: 8, duration: 0 })
      } else if (isFiniteNum(markerLng) && isFiniteNum(markerLat)) {
        const lngLat: [number, number] = [markerLng, markerLat]
        const m = new mapboxgl.Marker({ element: makeMarkerEl("#114788") })
          .setLngLat(lngLat)
          .addTo(map)
        cleanupMarkers.push(m)
        map.jumpTo({ center: lngLat, zoom: 7 })
      }
      if (!cancelled) map.resize()
    })

    return () => {
      cancelled = true
      resizeObs.disconnect()
      cleanupMarkers.forEach((m) => m.remove())
      map.remove()
    }
  }, [
    hasRoute,
    hasMarker,
    routeFromLng,
    routeFromLat,
    routeToLng,
    routeToLat,
    markerLng,
    markerLat,
  ])

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim()) return null
  if (!hasRoute && !hasMarker) return null

  return (
    <div
      ref={containerRef}
      className={`w-full aspect-square rounded-lg overflow-hidden border border-border bg-muted/30 ${className}`}
    />
  )
}
