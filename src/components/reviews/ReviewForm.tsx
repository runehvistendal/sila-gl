"use client"

import { useState, useTransition } from "react"
import { Star, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createReview, type BookingType, type ReviewerRole } from "@/app/actions/reviews"

const MIN_COMMENT = 20

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} stjerner`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110 focus:outline-none"
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              n <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export interface ReviewFormProps {
  bookingId: string
  bookingType: BookingType
  revieweeId: string
  reviewerRole: ReviewerRole
  /** Called when the review is successfully submitted */
  onSuccess?: () => void
}

export default function ReviewForm({
  bookingId,
  bookingType,
  revieweeId,
  reviewerRole,
  onSuccess,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [isPending, startTransition] = useTransition()

  if (submitted) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-5 text-center space-y-1">
        <p className="font-semibold text-green-800 text-sm">Anmeldelse modtaget</p>
        <p className="text-xs text-green-700">
          Vises når den anden part har anmeldt, eller efter 30 dage.
        </p>
      </div>
    )
  }

  function handleSubmit() {
    setErrorMsg("")
    if (rating === 0) { setErrorMsg("Vælg en bedømmelse"); return }
    if (comment.trim().length < MIN_COMMENT) {
      setErrorMsg(`Kommentar skal være mindst ${MIN_COMMENT} tegn`)
      return
    }

    startTransition(async () => {
      const result = await createReview({
        booking_id:    bookingId,
        booking_type:  bookingType,
        reviewee_id:   revieweeId,
        reviewer_role: reviewerRole,
        rating,
        comment,
      })

      if (result.error) {
        setErrorMsg(result.error)
      } else {
        setSubmitted(true)
        onSuccess?.()
      }
    })
  }

  const remaining = Math.max(0, MIN_COMMENT - comment.trim().length)

  return (
    <div className="space-y-5">
      {/* Stars */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Din bedømmelse</p>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      {/* Comment */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-foreground">Kommentar</label>
          {comment.trim().length < MIN_COMMENT && (
            <span className="text-xs text-muted-foreground">{remaining} tegn mangler</span>
          )}
        </div>
        <Textarea
          placeholder="Del din oplevelse..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="h-28 resize-none text-sm rounded-xl"
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground mt-1">{comment.trim().length} / min. {MIN_COMMENT} tegn</p>
      </div>

      {errorMsg && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isPending || rating === 0}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Sender...
          </>
        ) : (
          "Send anmeldelse"
        )}
      </Button>
    </div>
  )
}
