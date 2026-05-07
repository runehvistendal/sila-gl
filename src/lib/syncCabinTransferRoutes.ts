import type { SupabaseClient } from "@supabase/supabase-js"
import type { TransferRoute } from "@/types/transfer"

const TRANSPORT_TYPES = new Set<string>(["boat", "car"])

/**
 * Synkroniserer transfer_routes for et opslag. Brug auth-baseret Supabase-klient (RLS).
 */
export async function syncCabinTransferRoutes(
  supabase: SupabaseClient,
  cabinId: string,
  enabled: boolean,
  routes: TransferRoute[],
): Promise<{ error: string | null }> {
  if (!enabled) {
    const { error } = await supabase.from("transfer_routes").delete().eq("cabin_id", cabinId)
    return { error: error?.message ?? null }
  }

  const { error: delErr } = await supabase.from("transfer_routes").delete().eq("cabin_id", cabinId)
  if (delErr) return { error: delErr.message }

  if (routes.length === 0) {
    return { error: "Tilføj mindst én transferrute, eller slå tilbuddet fra" }
  }

  for (const r of routes) {
    if (!TRANSPORT_TYPES.has(r.transport_type)) {
      return { error: "Ugyldig transportform" }
    }
    if (!r.from_arrival_point.trim()) {
      return { error: "Udfyld ankomstpunkt for alle transferruter" }
    }
    if (r.price_one_way_ore <= 0 || r.price_roundtrip_ore <= 0) {
      return { error: "Angiv pris for enkelttur og tur/retur for alle transferruter" }
    }
    if (!r.description.trim()) {
      return { error: "Udfyld beskrivelse til gæsten for alle transferruter" }
    }
    if (r.max_guests < 1) {
      return { error: "Maks. gæster skal mindst være 1 pr. rute" }
    }
  }

  const rows = routes.map((r) => ({
    cabin_id: cabinId,
    from_arrival_point: r.from_arrival_point.trim(),
    transport_type: r.transport_type,
    price_one_way_ore: r.price_one_way_ore,
    price_roundtrip_ore: r.price_roundtrip_ore,
    max_guests: r.max_guests,
    description: r.description.trim() ? r.description.trim() : null,
    sort_order: r.sort_order,
  }))

  const { error: insErr } = await supabase.from("transfer_routes").insert(rows)
  return { error: insErr?.message ?? null }
}

export function parseTransferRoutesJson(raw: string | undefined): TransferRoute[] | null {
  if (raw == null || raw === "") return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    const out: TransferRoute[] = []
    for (const item of parsed) {
      if (item == null || typeof item !== "object") return null
      const o = item as Record<string, unknown>
      const transport_type = o.transport_type
      const from_arrival_point = o.from_arrival_point
      if (typeof from_arrival_point !== "string") return null
      if (transport_type !== "boat" && transport_type !== "car") {
        return null
      }
      const price_one_way_ore = Number(o.price_one_way_ore)
      const price_roundtrip_ore = Number(o.price_roundtrip_ore)
      const max_guests = Number(o.max_guests)
      const sort_order = Number(o.sort_order)
      const description = typeof o.description === "string" ? o.description : ""
      if (
        !Number.isFinite(price_one_way_ore) ||
        !Number.isFinite(price_roundtrip_ore) ||
        !Number.isFinite(max_guests) ||
        !Number.isFinite(sort_order)
      ) {
        return null
      }
      const id = typeof o.id === "string" && o.id.length > 0 ? o.id : undefined
      out.push({
        id,
        from_arrival_point,
        transport_type,
        price_one_way_ore: Math.round(price_one_way_ore),
        price_roundtrip_ore: Math.round(price_roundtrip_ore),
        max_guests: Math.round(max_guests),
        description,
        sort_order: Math.round(sort_order),
      })
    }
    return out
  } catch {
    return null
  }
}
