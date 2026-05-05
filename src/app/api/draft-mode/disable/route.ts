import { perspectiveCookieName } from "@sanity/preview-url-secret/constants"
import { cookies, draftMode } from "next/headers"
import { redirect } from "next/navigation"

export async function GET() {
  ;(await draftMode()).disable()
  ;(await cookies()).delete(perspectiveCookieName)
  redirect("/da")
}
