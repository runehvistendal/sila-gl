"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { formatKr } from "@/lib/money"
import { format } from "date-fns"
import { da } from "date-fns/locale"
import type { RideShareCardData } from "@/app/samsejlads/page"

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""

const GREENLAND_CENTER: [number, number] = [-44, 69]
const GREENLAND_BOUNDS: mapboxgl.LngLatBoundsLike = [[-73, 59], [-11, 84]]

function findCoords(name: string): [number, number] | null {
  const loc = GREENLAND_LOCATIONS.find((l) => l.name_dk === name || l.name_gl === name)
  return loc ? [loc.longitude, loc.latitude] : null
}

interface Props {
  rideShares: RideShareCardData[]
  className?: string
}

export default function SamsejladsOversigt({ rideShares, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<mapboxgl.Map | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return

    const map = new mapboxgl.Map({
      container:  containerRef.current,
      style:      "mapbox://styles/mapbox/dark-v11",
      center:     GREENLAND_CENTER,
      zoom:       3.5,
      maxBounds:  GREENLAND_BOUNDS,
      attributionControl: false,
    })

    mapRef.current = map

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right")

    map.on("load", () => {
      // Build GeoJSON features for each valid route
      const lineFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = []
      const pointFeatures: GeoJSON.Feature<GeoJSON.Point>[] = []

      for (const rs of rideShares) {
        const from = findCoords(rs.from_location)
        const to   = findCoords(rs.to_location)
        if (!from || !to) continue

        lineFeatures.push({
          type: "Feature",
          properties: {
            id:           rs.id,
            from:         rs.from_location,
            to:           rs.to_location,
            departure_at: rs.departure_at,
            price:        rs.price_per_seat_ore,
            seats:        rs.seats_available,
            sejler:       rs.profiles?.full_name ?? "Sila-sejler",
          },
          geometry: { type: "LineString", coordinates: [from, to] },
        })

        // Midpoint for popup click target
        const midLng = (from[0] + to[0]) / 2
        const midLat = (from[1] + to[1]) / 2
        pointFeatures.push({
          type: "Feature",
          properties: {
            id:           rs.id,
            from:         rs.from_location,
            to:           rs.to_location,
            departure_at: rs.departure_at,
            price:        rs.price_per_seat_ore,
            seats:        rs.seats_available,
            sejler:       rs.profiles?.full_name ?? "Sila-sejler",
          },
          geometry: { type: "Point", coordinates: [midLng, midLat] },
        })
      }

      // Route lines
      map.addSource("routes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: lineFeatures },
      })
      map.addLayer({
        id:     "routes-line",
        type:   "line",
        source: "routes",
        paint: {
          "line-color":   "#4A9CC7",
          "line-width":   2,
          "line-opacity": 0.6,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      })

      // Midpoint click dots
      map.addSource("route-points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: pointFeatures },
      })
      map.addLayer({
        id:     "route-dots",
        type:   "circle",
        source: "route-points",
        paint: {
          "circle-radius":       8,
          "circle-color":        "#4A9CC7",
          "circle-opacity":      0.85,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      })

      // Popup on dot click
      map.on("click", "route-dots", (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        const p = feature.properties as {
          id: string
          from: string
          to: string
          departure_at: string
          price: number
          seats: number
          sejler: string
        }

        const departure = format(new Date(p.departure_at), "d. MMM yyyy", { locale: da })

        new mapboxgl.Popup({ closeButton: false, offset: 10 })
          .setLngLat((e.lngLat))
          .setHTML(`
            <div style="font-family:system-ui;min-width:160px">
              <p style="font-weight:700;font-size:13px;margin:0 0 4px">${p.from} → ${p.to}</p>
              <p style="color:#666;font-size:12px;margin:0 0 2px">${departure}</p>
              <p style="font-size:12px;margin:0 0 2px">${p.seats} plads${p.seats !== 1 ? "er" : ""} · ${formatKr(p.price)}/plads</p>
              <p style="color:#666;font-size:11px;margin:0 0 8px">Sejler: ${p.sejler}</p>
              <a href="/samsejlads/${p.id}" style="background:#09192A;color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;text-decoration:none;display:inline-block">Se tur →</a>
            </div>
          `)
          .addTo(map)
      })

      map.on("mouseenter", "route-dots", () => { map.getCanvas().style.cursor = "pointer" })
      map.on("mouseleave", "route-dots", () => { map.getCanvas().style.cursor = "" })

      setLoaded(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`relative rounded-xl overflow-hidden border border-white/10 ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-[#09192A] flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <div className="w-4 h-4 border-2 border-[#4A9CC7]/40 border-t-[#4A9CC7] rounded-full animate-spin" />
            Indlæser kort...
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
