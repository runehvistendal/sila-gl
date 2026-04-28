"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""

// Greenland bounding box: SW[-73, 59] → NE[-11, 84]
const GREENLAND_BOUNDS: mapboxgl.LngLatBoundsLike = [[-73, 59], [-11, 84]]
const GREENLAND_CENTER: [number, number] = [-44, 69]
const DEFAULT_ZOOM = 4

function findCoords(locationName: string): [number, number] | null {
  const loc = GREENLAND_LOCATIONS.find(
    (l) => l.name_dk === locationName || l.name_gl === locationName
  )
  return loc ? [loc.longitude, loc.latitude] : null
}

interface Props {
  fromLocation: string
  toLocation: string
  className?: string
}

export default function SejlruteMap({ fromLocation, toLocation, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<mapboxgl.Map | null>(null)
  const [loaded, setLoaded]   = useState(false)
  const [noCoords, setNoCoords] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
      setNoCoords(true)
      return
    }

    const fromCoords = findCoords(fromLocation)
    const toCoords   = findCoords(toLocation)

    if (!fromCoords || !toCoords) {
      setNoCoords(true)
      return
    }

    const map = new mapboxgl.Map({
      container:   containerRef.current,
      style:       "mapbox://styles/mapbox/dark-v11",
      center:      GREENLAND_CENTER,
      zoom:        DEFAULT_ZOOM,
      maxBounds:   GREENLAND_BOUNDS,
      attributionControl: false,
    })

    mapRef.current = map

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right")
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right")

    map.on("load", () => {
      // Route line
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [fromCoords, toCoords],
          },
        },
      })

      map.addLayer({
        id:     "route-line",
        type:   "line",
        source: "route",
        paint: {
          "line-color":   "#4A9CC7",
          "line-width":   3,
          "line-opacity": 0.9,
        },
        layout: {
          "line-cap":  "round",
          "line-join": "round",
        },
      })

      // Dashed animated glow
      map.addLayer({
        id:     "route-glow",
        type:   "line",
        source: "route",
        paint: {
          "line-color":     "#4A9CC7",
          "line-width":     6,
          "line-opacity":   0.25,
          "line-blur":      4,
        },
      })

      // Departure marker (circle — from)
      map.addSource("from-point", {
        type: "geojson",
        data: { type: "Feature", properties: { label: fromLocation }, geometry: { type: "Point", coordinates: fromCoords } },
      })
      map.addLayer({
        id:     "from-circle",
        type:   "circle",
        source: "from-point",
        paint: {
          "circle-radius":       7,
          "circle-color":        "#4A9CC7",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      })

      // Arrival marker (circle — to)
      map.addSource("to-point", {
        type: "geojson",
        data: { type: "Feature", properties: { label: toLocation }, geometry: { type: "Point", coordinates: toCoords } },
      })
      map.addLayer({
        id:     "to-circle",
        type:   "circle",
        source: "to-point",
        paint: {
          "circle-radius":       7,
          "circle-color":        "#BF3B2B",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      })

      // Labels
      map.addLayer({
        id:     "from-label",
        type:   "symbol",
        source: "from-point",
        layout: {
          "text-field":  ["get", "label"],
          "text-size":   12,
          "text-offset": [0, -1.5],
          "text-anchor": "bottom",
          "text-font":   ["DIN Pro Medium", "Arial Unicode MS Regular"],
        },
        paint: {
          "text-color":          "#ffffff",
          "text-halo-color":     "#09192A",
          "text-halo-width":     1.5,
        },
      })

      map.addLayer({
        id:     "to-label",
        type:   "symbol",
        source: "to-point",
        layout: {
          "text-field":  ["get", "label"],
          "text-size":   12,
          "text-offset": [0, -1.5],
          "text-anchor": "bottom",
          "text-font":   ["DIN Pro Medium", "Arial Unicode MS Regular"],
        },
        paint: {
          "text-color":          "#ffffff",
          "text-halo-color":     "#09192A",
          "text-halo-width":     1.5,
        },
      })

      // Fit map to route
      const bounds = new mapboxgl.LngLatBounds(fromCoords, fromCoords)
      bounds.extend(toCoords)
      map.fitBounds(bounds, { padding: 60, maxZoom: 8, duration: 800 })

      setLoaded(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (noCoords) return null

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
