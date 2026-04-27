"use client"

import { useState, useEffect } from "react"
import { Star, User, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase"

/* ── Star helpers ── */
function StarBar({ stars, count }: { stars: number; count?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`w-4 h-4 ${n <= Math.round(stars) ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
      ))}
      {count !== undefined && (
        <span className="text-xs text-muted-foreground ml-1">({count})</span>
      )}
    </div>
  )
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
        >
          <Star className={`w-7 h-7 transition-colors ${n <= (hovered || value) ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
        </button>
      ))}
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
  currentUserId?: string | null
}

export default function CabinReviews({ cabinId, currentUserId }: Props) {
  const [reviews, setReviews]             = useState<Review[]>([])
  const [loading, setLoading]             = useState(true)
  const [canReview, setCanReview]         = useState(false)
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)

  const [showForm, setShowForm]           = useState(false)
  const [stars, setStars]                 = useState(0)
  const [hoveredStar, setHoveredStar]     = useState(0)
  const [comment, setComment]             = useState("")
  const [submitting, setSubmitting]       = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // 1. Get all booking IDs for this cabin
      const { data: bookings } = await supabase
        .from("cabin_bookings")
        .select("id")
        .eq("cabin_id", cabinId)

      const bookingIds = (bookings ?? []).map((b: { id: string }) => b.id)

      if (bookingIds.length === 0) {
        setLoading(false)
        return
      }

      // 2. Get reviews linked to those bookings
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, reviewer_id, profiles!reviewer_id(full_name)")
        .in("cabin_booking_id", bookingIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      setReviews((data as unknown as Review[]) ?? [])

      // 3. Check if current user can review
      if (currentUserId) {
        const { data: completedBooking } = await supabase
          .from("cabin_bookings")
          .select("id")
          .eq("cabin_id", cabinId)
          .eq("guest_id", currentUserId)
          .eq("status", "completed")
          .limit(1)

        setCanReview(!!completedBooking?.length)

        const alreadyDone = ((data as unknown as Review[]) ?? []).some(
          (r) => r.reviewer_id === currentUserId
        )
        setAlreadyReviewed(alreadyDone)
      }

      setLoading(false)
    }
    void load()
  }, [cabinId, currentUserId, submitSuccess])

  async function handleSubmit() {
    if (stars === 0) return
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    // Get the completed booking to link the review
    const { data: booking } = await supabase
      .from("cabin_bookings")
      .select("id")
      .eq("cabin_id", cabinId)
      .eq("guest_id", user.id)
      .eq("status", "completed")
      .limit(1)
      .single()

    if (!booking) { setSubmitting(false); return }

    await supabase.from("reviews").insert({
      reviewer_id:       user.id,
      reviewee_id:       user.id, // will be overridden by RLS context, placeholder
      cabin_booking_id:  booking.id,
      review_type:       "guest_to_host",
      rating:            stars,
      comment:           comment.trim() || null,
    })

    setSubmitting(false)
    setSubmitSuccess(true)
    setShowForm(false)
    setStars(0)
    setComment("")
  }

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null

  const showWriteReview = canReview && !alreadyReviewed && !submitSuccess

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
            {avgRating && (
              <span className="text-lg font-bold text-foreground">{avgRating.toFixed(1)}</span>
            )}
          </h2>
          {avgRating && (
            <div className="mt-1 flex items-center gap-2">
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
                onMouseEnter={() => setHoveredStar(n)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => { setStars(n); setShowForm(true) }}
                className="transition-transform hover:scale-110"
              >
                <Star className={`w-6 h-6 transition-colors ${n <= (hoveredStar || stars) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Write form */}
      {showForm && showWriteReview && (
        <div className="bg-muted/50 rounded-2xl p-5 mb-6 border border-border space-y-4">
          <p className="text-sm font-semibold text-foreground">Din anmeldelse</p>
          <StarPicker value={stars} onChange={setStars} />
          <Textarea
            placeholder="Del din oplevelse med hytten og udlejeren... (valgfrit)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="h-24 resize-none text-sm rounded-xl"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={stars === 0 || submitting}
              className="bg-primary text-primary-foreground rounded-xl text-sm"
            >
              {submitting ? "Sender..." : "Send anmeldelse"}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)} className="text-sm rounded-xl">
              Annuller
            </Button>
          </div>
        </div>
      )}

      {submitSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 text-sm text-green-800 font-medium">
          Tak for din anmeldelse!
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
                      {r.profiles?.full_name ?? "Anonym"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "d. MMM yyyy")}
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
