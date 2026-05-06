"use client"

import dynamic from "next/dynamic"

const GreenlandMap = dynamic(() => import("@/components/shared/GreenlandMap"), { ssr: false })

export default function MapWrapper() {
  return (
    <div className="h-full w-full" style={{ isolation: "isolate" }}>
      <GreenlandMap />
    </div>
  )
}