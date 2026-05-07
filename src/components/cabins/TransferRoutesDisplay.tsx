import { createClient } from "@/lib/supabase-server"
import { oreToKr } from "@/lib/money"

function krLabel(ore: number): string {
  const kr = oreToKr(ore)
  return `${kr.toLocaleString("da-DK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} kr.`
}

function transportPresentation(transportType: string): { icon: string; label: string } {
  switch (transportType) {
    case "boat":
      return { icon: "🚤", label: "Båd" }
    default:
      return { icon: "🚗", label: "Bil" }
  }
}

interface Props {
  cabinId: string
}

export default async function TransferRoutesDisplay({ cabinId }: Props) {
  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from("transfer_routes")
    .select("*")
    .eq("cabin_id", cabinId)
    .order("sort_order", { ascending: true })

  if (error || !rows?.length) {
    return null
  }

  return (
    <div className="space-y-0">
      <h2 className="text-xl font-bold text-foreground mb-4">Kom dertil</h2>

      <div className="space-y-0">
        {rows.map((r, index) => {
          const { icon, label } = transportPresentation(r.transport_type)
          const desc = r.description?.trim()
          return (
            <div key={r.id}>
              {index > 0 && <hr className="my-5 border-border" />}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
                  <span aria-hidden>{icon}</span>
                  <span>{label}</span>
                </p>
                <p className="text-sm text-foreground">
                  Fra {r.from_arrival_point}
                </p>
                <p className="text-sm text-foreground">
                  {krLabel(r.price_one_way_ore)} enkelttur · {krLabel(r.price_roundtrip_ore)} tur/retur
                </p>
                <p className="text-sm text-muted-foreground">
                  Op til {r.max_guests} gæster
                </p>
                {desc ? (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {desc}
                  </p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-xs text-muted-foreground leading-relaxed border-t border-border pt-4">
        Tidspunkt og mødested aftales med udbyderen i chatten efter booking. Transfer refunderes hvis
        vejrforhold forhindrer gennemførelse.
      </p>
    </div>
  )
}
