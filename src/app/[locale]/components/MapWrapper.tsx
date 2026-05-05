"use client"

import dynamic from "next/dynamic"

const GreenlandMap = dynamic(() => import("@/components/shared/GreenlandMap"), { ssr: false })

export default function MapWrapper() {
  return <GreenlandMap />
}