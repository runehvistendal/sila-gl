"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { captureEvent } from "@/lib/analytics/posthog-events"

function GreenlandMapInteractions() {
  useMapEvents({
    zoomend: () => {
      captureEvent("map_interacted", { type: "cabin", action: "zoom" })
    },
  })
  return null
}

export default function GreenlandMap() {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet")
    delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    })
  }, [])

  return (
    <MapContainer
      center={[67.0, -45.0]}
      zoom={4}
      style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
      scrollWheelZoom={false}
    >
      <GreenlandMapInteractions />
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
    </MapContainer>
  )
}