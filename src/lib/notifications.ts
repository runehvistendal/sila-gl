/**
 * Notifikationsmodul — placeholder.
 * Kald logges til console nu; erstattes med email/push i en samlet omgang.
 */

export async function notifyNewTransportOffer(offerId: string): Promise<void> {
  console.log("[NOTIFY] Nyt tilbud på transportanmodning:", offerId)
}

export async function notifyTransportOfferAccepted(offerId: string): Promise<void> {
  console.log("[NOTIFY] Tilbud accepteret:", offerId)
}

export async function notifyTransportBookingConfirmed(requestId: string): Promise<void> {
  console.log("[NOTIFY] Transport booking bekræftet:", requestId)
}

export async function notifyNewReview(reviewId: string): Promise<void> {
  console.log("[NOTIFY] Ny anmeldelse:", reviewId)
}
