import { redirect } from "next/navigation"

/** Eksisterende /hytter-links omdirigeres til Ophold → I naturen */
export default function HytterListingRedirect() {
  redirect("/ophold/i-naturen")
}
