import { NextResponse } from "next/server"
import cloudinary from "cloudinary"
import { createClient } from "@/lib/supabase-server"

const AVATAR_EAGER = "c_fill,w_200,h_200,q_auto,f_auto"
const CABIN_EAGER = "c_fill,w_800,h_600,q_auto,f_auto"

type Body = {
  kind?: string
  cabinId?: string
  // "cabin-pending" uploads to sila/cabins/pending (no cabinId required)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const user = session.user

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary er ikke konfigureret" },
      { status: 500 },
    )
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 })
  }

  const kind = body.kind
  if (
    kind !== "avatar" &&
    kind !== "cabin" &&
    kind !== "cabin-pending" &&
    kind !== "boat-pending"
  ) {
    return NextResponse.json({ error: "Ugyldig kind" }, { status: 400 })
  }

  let folder: string
  let transformation: string

  if (kind === "avatar") {
    folder = "sila/avatars"
    transformation = AVATAR_EAGER
  } else if (kind === "cabin-pending") {
    // Upload til pending-mappe mens hytten endnu ikke er oprettet i DB
    folder = "sila/cabins/pending"
    transformation = CABIN_EAGER
  } else if (kind === "boat-pending") {
    folder = "sila/boats/pending"
    transformation = CABIN_EAGER
  } else {
    const cabinId = body.cabinId?.trim()
    if (!cabinId) {
      return NextResponse.json({ error: "Mangler cabinId" }, { status: 400 })
    }
    const { data: cabin } = await supabase
      .from("cabins")
      .select("id")
      .eq("id", cabinId)
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .maybeSingle()
    if (!cabin) {
      return NextResponse.json({ error: "Hytte ikke fundet" }, { status: 403 })
    }
    folder = `sila/cabins/${cabinId}`
    transformation = CABIN_EAGER
  }

  // Signatur genereres KUN her (api_secret aldrig til klient).
  // Cloudinary: strengen der signeres skal matche upload-body (undtagen file, api_key);
  // resource_type er fastlagt af URL-stien (/image/upload), ikke et ekstra sign-felt.
  const timestamp = Math.floor(Date.now() / 1000)
  const maxAgeSeconds = 60
  const validUntil = timestamp + maxAgeSeconds

  const paramsToSign: Record<string, string | number> = {
    eager: transformation,
    folder,
    timestamp,
  }

  const cld = cloudinary as unknown as {
    utils: { api_sign_request: (p: Record<string, string | number>, secret: string) => string }
  }
  const signature = cld.utils.api_sign_request(paramsToSign, apiSecret)

  return NextResponse.json({
    signature,
    timestamp,
    validUntil,
    maxAgeSeconds,
    cloudName,
    apiKey,
    folder,
    eager: transformation,
  })
}
