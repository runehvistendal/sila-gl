import { createClient } from "@/lib/supabase-server"
import { getTranslations } from "next-intl/server"

export type ContactInfoBookingType =
  | "cabin_booking"
  | "ride_share"
  | "transport_offer"
  | "stay_offer"

function rpcBookingType(
  t: ContactInfoBookingType,
): "cabin" | "ride_share" | "transport_offer" | "stay_offer" {
  if (t === "cabin_booking") return "cabin"
  return t
}

type RpcRow = { full_name: string | null; phone: string | null; email: string | null }

export default async function ContactInfoCard({
  booking_type,
  booking_id,
}: {
  booking_type: ContactInfoBookingType
  booking_id: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_contact_info_for_booking", {
    p_booking_type: rpcBookingType(booking_type),
    p_booking_id:   booking_id,
  })

  if (error || data == null) return null

  const rows = Array.isArray(data) ? data : [data]
  const row = rows[0] as RpcRow | undefined
  if (!row) return null

  const name = row.full_name?.trim() ?? ""
  const phone = row.phone?.trim() ?? ""
  const email = row.email?.trim() ?? ""
  if (!name && !phone && !email) return null

  const t = await getTranslations("dashboard")
  const isSkipperSide =
    booking_type === "ride_share" || booking_type === "transport_offer"
  const title = isSkipperSide ? t("contact_card_title_skipper") : t("contact_card_title_host")

  const telHref = phone.replace(/[\s()-]/g, "")

  return (
    <div
      className="rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-white space-y-2 sm:space-y-3 shadow-sm"
      style={{
        backgroundColor: "#09192A",
        fontFamily: "var(--font-jakarta, system-ui, sans-serif)",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-white/80">{title}</p>
      {name ? <p className="text-sm font-semibold text-white leading-snug">{name}</p> : null}
      {phone ? (
        <p className="text-sm">
          <a
            href={`tel:${telHref}`}
            className="text-white underline underline-offset-2 decoration-white/60 hover:text-white/90"
          >
            {phone}
          </a>
        </p>
      ) : null}
      {email ? (
        <p className="text-sm break-all">
          <a
            href={`mailto:${email}`}
            className="text-white underline underline-offset-2 decoration-white/60 hover:text-white/90"
          >
            {email}
          </a>
        </p>
      ) : null}
    </div>
  )
}
