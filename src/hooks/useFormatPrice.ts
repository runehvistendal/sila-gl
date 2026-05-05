'use client'

import { useFormatter } from "next-intl"

export function useFormatPrice() {
  const format = useFormatter()
  return (ore: number) =>
    format.number(ore / 100, {
      style: 'currency',
      currency: 'DKK',
      maximumFractionDigits: 0,
    })
}
