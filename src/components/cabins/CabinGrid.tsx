import Link from "next/link"
import { Home, ArrowRight } from "lucide-react"
import CabinCard, { type CabinCardData } from "./CabinCard"

export default function CabinGrid({
  cabins,
  total,
}: {
  cabins: CabinCardData[]
  total: number
}) {
  if (cabins.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Home size={24} className="text-muted-foreground/50" />
        </div>
        <p className="text-lg font-medium text-foreground mb-1">
          Ingen hytter fundet
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Prøv andre filtre, eller ryd filtreringen
        </p>
        <Link
          href="/hytter"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80"
        >
          Vis alle hytter <ArrowRight size={14} />
        </Link>
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-muted-foreground mb-6">
        {total} {total === 1 ? "hytte fundet" : "hytter fundet"}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cabins.map((cabin) => (
          <CabinCard key={cabin.id} cabin={cabin} />
        ))}
      </div>
    </>
  )
}
