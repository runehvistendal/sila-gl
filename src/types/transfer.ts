export type TransferTransportType = "boat" | "car" | "other"

export type TransferRoute = {
  id?: string
  from_arrival_point: string
  transport_type: TransferTransportType
  price_one_way_ore: number
  price_roundtrip_ore: number
  max_guests: number
  description: string
  sort_order: number
}
