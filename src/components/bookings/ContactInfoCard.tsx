import { getContactInfo } from "@/app/actions/contactInfo"
import { getTranslations } from "next-intl/server"

export type ContactInfoBookingType =
  | "cabin_booking"
  | "ride_share"
  | "transport_offer"
  | "stay_offer"

export default async function ContactInfoCard({
  booking_type,
  booking_id,
}: {
  booking_type: ContactInfoBookingType
  booking_id: string
}) {
  const row = await getContactInfo(booking_type, booking_id)
  if (!row) return null

  const t = await getTranslations("dashboard")
  const isSkipperSide =
    booking_type === "ride_share" || booking_type === "transport_offer"
  const title = isSkipperSide ? t("contact_card_title_skipper") : t("contact_card_title_host")

  const telHref = row.phone.replace(/[\s()-]/g, "")

  return (
    <div
      className="rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-white space-y-2 sm:space-y-3 shadow-sm"
      style={{
        backgroundColor: "#09192A",
        fontFamily: "var(--font-jakarta, system-ui, sans-serif)",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-white/80">{title}</p>
      {row.full_name ? (
        <p className="text-sm font-semibold text-white leading-snug">{row.full_name}</p>
      ) : null}
      {row.phone ? (
        <p className="text-sm">
          <a
            href={`tel:${telHref}`}
            className="text-white underline underline-offset-2 decoration-white/60 hover:text-white/90"
          >
            {row.phone}
          </a>
        </p>
      ) : null}
      {row.email ? (
        <p className="text-sm break-all">
          <a
            href={`mailto:${row.email}`}
            className="text-white underline underline-offset-2 decoration-white/60 hover:text-white/90"
          >
            {row.email}
          </a>
        </p>
      ) : null}
    </div>
  )
}
