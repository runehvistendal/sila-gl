import { createClient } from "@/lib/supabase-server"
import { createServiceClient } from "@/lib/supabase-service"
import { stripe } from "@/lib/stripe"
import { getAppBaseUrl } from "@/lib/appUrl"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Betaling er ikke tilgængelig" }, { status: 503 })
  }

  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Du skal være logget ind" }, { status: 401 })
  }

  // Parse body
  let body: { ride_share_id?: unknown; seats_booked?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Ugyldigt request" }, { status: 400 })
  }

  const rideShareId = typeof body.ride_share_id === "string" ? body.ride_share_id.trim() : ""
  const numSeats = Number(body.seats_booked)

  if (!rideShareId) return Response.json({ error: "Manglende ride_share_id" }, { status: 400 })
  if (!Number.isInteger(numSeats) || numSeats < 1 || numSeats > 20) {
    return Response.json({ error: "Ugyldigt antal pladser" }, { status: 400 })
  }

  // Fetch ride_share
  const { data: rsRaw, error: rsErr } = await supabase
    .from("ride_shares")
    .select("id, skipper_id, from_location, to_location, departure_at, seats_available, price_per_seat_ore, status, deleted_at")
    .eq("id", rideShareId)
    .maybeSingle()

  if (rsErr || !rsRaw) {
    return Response.json({ error: "Tur ikke fundet" }, { status: 404 })
  }

  const rs = rsRaw as {
    id: string
    skipper_id: string
    from_location: string
    to_location: string
    departure_at: string
    seats_available: number
    price_per_seat_ore: number
    status: string
    deleted_at: string | null
  }

  if (rs.deleted_at || rs.status !== "active") {
    return Response.json({ error: "Tur er ikke tilgængelig" }, { status: 400 })
  }
  if (rs.seats_available < numSeats) {
    return Response.json({ error: "Ikke nok ledige pladser" }, { status: 400 })
  }
  if (rs.skipper_id === user.id) {
    return Response.json({ error: "Du kan ikke booke din egen tur" }, { status: 400 })
  }

  // Fetch skipper's Stripe info (SECURITY DEFINER RPC)
  const { data: skipperRows, error: skipperErr } = await supabase.rpc("get_skipper_stripe_info", {
    p_ride_share_id: rideShareId,
  })
  if (skipperErr || !skipperRows || (skipperRows as unknown[]).length === 0) {
    return Response.json({ error: "Kunne ikke hente sejlerens betalingsoplysninger" }, { status: 400 })
  }
  const skipper = (skipperRows as Array<{ stripe_account_id: string | null; stripe_onboarding_complete: boolean }>)[0]
  if (!skipper.stripe_onboarding_complete || !skipper.stripe_account_id) {
    return Response.json({ error: "Sejleren modtager endnu ikke betalinger — prøv igen senere" }, { status: 400 })
  }

  // Calculate price server-side — NEVER trust frontend price
  const totalPriceOre = numSeats * rs.price_per_seat_ore
  const platformFeeOre = Math.round(totalPriceOre * 0.15)

  if (totalPriceOre < 1) {
    return Response.json({ error: "Ugyldig pris" }, { status: 400 })
  }

  // Create pending booking
  const service = createServiceClient()
  const { data: booking, error: insErr } = await service
    .from("ride_share_bookings")
    .insert({
      ride_share_id:    rideShareId,
      passenger_id:     user.id,
      num_seats:        numSeats,
      total_price_ore:  totalPriceOre,
      platform_fee_ore: platformFeeOre,
      status:           "pending",
    })
    .select("id")
    .single()

  if (insErr || !booking) {
    return Response.json({ error: "Kunne ikke oprette booking" }, { status: 500 })
  }

  const bookingId = (booking as { id: string }).id
  const base = getAppBaseUrl()
  const departure = new Date(rs.departure_at)
  const dateLabel = departure.toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: numSeats,
          price_data: {
            currency: "dkk",
            unit_amount: rs.price_per_seat_ore,
            product_data: {
              name: `Samsejlads: ${rs.from_location} → ${rs.to_location}`,
              description: `Afgang ${dateLabel}`,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFeeOre,
        transfer_data: { destination: skipper.stripe_account_id },
        metadata: { booking_id: bookingId, ride_share_id: rideShareId },
      },
      success_url: `${base}/transport/${rideShareId}/bekraeftelse?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${base}/transport/${rideShareId}`,
      metadata: {
        booking_id:    bookingId,
        ride_share_id: rideShareId,
        guest_id:      user.id,
        seats_booked:  String(numSeats),
        type:          "ride_share",
      },
    })

    if (!session.url) throw new Error("Manglende session-URL")

    // Store session_id on booking for cancel-flow support
    await service
      .from("ride_share_bookings")
      .update({ stripe_session_id: session.id, updated_at: new Date().toISOString() })
      .eq("id", bookingId)

    return Response.json({ url: session.url })
  } catch (e) {
    // Clean up pending booking on Stripe failure
    await service.from("ride_share_bookings").delete().eq("id", bookingId)
    const msg = e instanceof Error ? e.message : "Betalingen kunne ikke startes"
    return Response.json({ error: msg }, { status: 500 })
  }
}
