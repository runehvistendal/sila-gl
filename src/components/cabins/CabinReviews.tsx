"use client"

import { useState, useEffect } from "react"
import { Star, User, Loader2 } from "lucide-react"
import { useFormatter } from "next-intl"
import ReviewForm from "@/components/reviews/ReviewForm"
import { createClient } from "@/lib/supabase"

/* ── Star display ── */
export function StarBar({ stars, count }: { stars: number; count?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-4 h-4 ${
            n <= Math.round(stars) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
          }`}
        />
      ))}
      {count !== undefined && (
        <span className="text-xs text-muted-foreground ml-1">({count})</span>
      )}
    </div>
  )
}

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer_id: string
  profiles: { full_name: string | null } | null
}

interface Props {
  cabinId: string
  ownerId: string
  currentUserId?: string | null
}

export default function CabinReviews({ cabinId, ownerId, currentUserId }: Props) {
  const [reviews, setReviews]                 = useState<Review[]>([])
  const [loading, setLoading]                 = useState(true)
  const [canReview, setCanReview]             = useState(false)
  const fmt = useFormatter()
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null)
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)
  const [submitted, setSubmitted]             = useState(false)
  const [showForm, setShowForm]               = useState(false)
  const [hoveredStar, setHoveredStar]         = useState(0)
  const [starInit, setStarInit]               = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // Fetch only published reviews for this cabin
      const { data: bookings } = await supabase
        .from("cabin_bookings")
        .select("id")
        .eq("cabin_id", cabinId)

      const bookingIds = (bookings ?? []).map((b: { id: string }) => b.id)

      if (bookingIds.length > 0) {
        const { data } = await supabase
          .from("reviews")
          .select("id, rating, comment, created_at, reviewer_id, profiles!reviewer_id(full_name)")
          .in("cabin_booking_id", bookingIds)
          .not("published_at", "is", null)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })

        setReviews((data as unknown as Review[]) ?? [])
      }

      // Check eligibility: completed booking, not already reviewed, within 30 days
      if (currentUserId) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        const { data: completedBooking } = await supabase
          .from("cabin_bookings")
          .select("id")
          .eq("cabin_id", cabinId)
          .eq("guest_id", currentUserId)
          .eq("status", "completed")
          .gte("updated_at", thirtyDaysAgo)
          .limit(1)

        if (completedBooking?.length) {
          const bookingId = completedBooking[0].id

          // Check if already reviewed
          const { data: existingReview } = await supabase
            .from("reviews")
            .select("id")
            .eq("cabin_booking_id", bookingId)
            .eq("reviewer_id", currentUserId)
            .is("deleted_at", null)
            .maybeSingle()

          if (!existingReview) {
            setCanReview(true)
            setReviewBookingId(bookingId)
          } else {
            setAlreadyReviewed(true)
          }
        }
      }

      setLoading(false)
    }
    void load()
  }, [cabinId, currentUserId, submitted])

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null

  const showWriteReview = canReview && !alreadyReviewed && !submitted

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Indlæser anmeldelser...
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            Anmeldelser
            {avgRating !== null && (
              <span className="text-lg font-bold">{avgRating.toFixed(1)}</span>
            )}
          </h2>
          {avgRating !== null && (
            <div className="mt-1">
              <StarBar stars={avgRating} count={reviews.length} />
            </div>
          )}
        </div>

        {/* Inline star trigger */}
        {showWriteReview && !showForm && (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} stjerner`}
                onMouseEnter={() => setHoveredStar(n)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => { setStarInit(n); setShowForm(true) }}
                className="transition-transform hover:scale-110 focus:outline-none"
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    n <= (hoveredStar || starInit)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/40"
                  }`}
                />
              </button>
            ))}
          </div>
        )}

        {alreadyReviewed && (
          <span className="text-xs text-muted-foreground italic">Du har anmeldt denne hytte</span>
        )}
      </div>

      {/* Write form */}
      {showForm && showWriteReview && reviewBookingId && (
        <div className="bg-muted/50 rounded-2xl p-5 mb-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Din anmeldelse</p>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Annuller
            </button>
          </div>
          <ReviewForm
            bookingId={reviewBookingId}
            bookingType="cabin"
            revieweeId={ownerId}
            reviewerRole="guest"
            onSuccess={() => {
              setSubmitted(true)
              setShowForm(false)
              setCanReview(false)
            }}
          />
        </div>
      )}

      {submitted && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 text-sm text-green-800 font-medium">
          Anmeldelse modtaget — vises når udlejeren også har anmeldt eller efter 30 dage.
        </div>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground bg-muted rounded-xl p-5 text-center">
          Ingen anmeldelser endnu — bliv den første til at anmelde denne hytte.
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-border p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">
                      {r.profiles?.full_name ?? "Sila-gæst"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmt.dateTime(new Date(r.created_at), { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <StarBar stars={r.rating} />
                  {r.comment && (
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                      {r.comment}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

