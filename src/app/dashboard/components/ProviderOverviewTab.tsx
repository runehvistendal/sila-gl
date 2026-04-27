"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Anchor, Home, Filter, X } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { formatKr } from "@/lib/money"
import type { CabinBookingData } from "./BookingRow"
import type { TransportRequestData } from "./OpenRequestsList"

const REQUEST_STATUS: Record<string, string> = {
  open:      "bg-amber-100 text-amber-700",
  matched:   "bg-blue-100 text-blue-700",
  closed:    "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
}
const REQUEST_LABELS: Record<string, string> = {
  open:      "Åben",
  matched:   "Matchet",
  closed:    "Lukket",
  cancelled: "Annulleret",
}
const BOOKING_STATUS: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
}
const BOOKING_LABELS: Record<string, string> = {
  pending:   "Afventer",
  confirmed: "Bekræftet",
  completed: "Afsluttet",
  cancelled: "Annulleret",
}

interface NormItem {
  id: string
  type: "transport-request" | "booking"
  title: string
  guestName: string
  date: string
  status: string
  priceOre: number
}

interface Props {
  transportRequests: TransportRequestData[]
  hostBookings: CabinBookingData[]
}

export default function ProviderOverviewTab({ transportRequests, hostBookings }: Props) {
  const [typeFilter,   setTypeFilter]   = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery,  setSearchQuery]  = useState("")

  const allItems = useMemo<NormItem[]>(() => {
    const items: NormItem[] = [
      ...transportRequests.map((r) => ({
        id:        r.id,
        type:      "transport-request" as const,
        title:     `${r.from_location} → ${r.to_location}`,
        guestName: r.profiles?.full_name ?? "Gæst",
        date:      r.desired_date,
        status:    r.status,
        priceOre:  0,
      })),
      ...hostBookings.map((b) => ({
        id:        b.id,
        type:      "booking" as const,
        title:     b.cabin_title ?? "Hytte",
        guestName: b.guest_name ?? "Gæst",
        date:      b.check_in,
        status:    b.status,
        priceOre:  b.total_price_ore,
      })),
    ]

    let filtered = items
    if (typeFilter === "transport") filtered = filtered.filter((i) => i.type === "transport-request")
    if (typeFilter === "cabin")     filtered = filtered.filter((i) => i.type === "booking")
    if (statusFilter !== "all")     filtered = filtered.filter((i) => i.status === statusFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (i) => i.title.toLowerCase().includes(q) || i.guestName.toLowerCase().includes(q)
      )
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transportRequests, hostBookings, typeFilter, statusFilter, searchQuery])

  const stats = useMemo(() => ({
    pendingRequests: transportRequests.filter((r) => r.status === "open").length,
    pendingBookings: hostBookings.filter((b) => b.status === "pending").length,
    total: allItems.length,
  }), [transportRequests, hostBookings, allItems])

  const hasFilters = typeFilter !== "all" || statusFilter !== "all" || searchQuery !== ""

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground bg-muted/60 border border-border rounded-xl px-4 py-3">
        Af hensyn til sikker betaling opfordrer Sila til at alle aftaler indgås på platformen.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">Afventende forespørgsler</p>
          <p className="text-2xl font-bold text-primary">{stats.pendingRequests}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">Afventende bookinger</p>
          <p className="text-2xl font-bold text-primary">{stats.pendingBookings}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">I alt</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filtrer</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 rounded-lg text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle typer</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="cabin">Hytter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 rounded-lg text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statusser</SelectItem>
                <SelectItem value="pending">Afventer</SelectItem>
                <SelectItem value="confirmed">Bekræftet</SelectItem>
                <SelectItem value="open">Åben</SelectItem>
                <SelectItem value="completed">Afsluttet</SelectItem>
                <SelectItem value="cancelled">Annulleret</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Søg</label>
            <Input
              placeholder="Destination eller gæstenavn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-lg text-sm"
            />
          </div>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setSearchQuery("") }} className="text-xs gap-1">
            <X className="w-3 h-3" /> Ryd filtre
          </Button>
        )}
      </div>

      {/* Results */}
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          {allItems.length} element{allItems.length !== 1 ? "er" : ""}
        </p>
        {allItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground text-sm">Ingen elementer matcher dine filtre</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allItems.map((item) => (
              <ItemCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ItemCard({ item }: { item: NormItem }) {
  const isRequest = item.type === "transport-request"
  const statusColor = isRequest
    ? (REQUEST_STATUS[item.status] ?? "bg-gray-100 text-gray-500")
    : (BOOKING_STATUS[item.status] ?? "bg-gray-100 text-gray-500")
  const statusLabel = isRequest
    ? (REQUEST_LABELS[item.status] ?? item.status)
    : (BOOKING_LABELS[item.status] ?? item.status)

  const href = isRequest ? `/transport/${item.id}` : `/mine-hytter`

  return (
    <Link
      href={href}
      className="block w-full text-left bg-white rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isRequest ? "bg-accent/10" : "bg-primary/10"}`}>
            {isRequest
              ? <Anchor className="w-4 h-4 text-accent" />
              : <Home className="w-4 h-4 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{item.title}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
              <span>{item.guestName}</span>
              <span>•</span>
              <span>{format(new Date(item.date), "d. MMM yyyy")}</span>
              {item.priceOre > 0 && (
                <span className="text-primary font-medium">• {formatKr(item.priceOre)}</span>
              )}
            </div>
          </div>
        </div>
        <Badge className={`${statusColor} border-0 text-xs shrink-0`}>{statusLabel}</Badge>
      </div>
    </Link>
  )
}
