export type CloudinarySignResponse = {
  signature: string
  timestamp: number
  /** Unix sekund: brug signatur senest inden dette tidspunkt (server: +60s fra udstedelse) */
  validUntil: number
  maxAgeSeconds: number
  cloudName: string
  apiKey: string
  folder: string
  eager: string
}

export type SignBody =
  | { kind: "avatar" }
  | { kind: "cabin"; cabinId: string }

export async function fetchCloudinarySignature(
  body: SignBody,
): Promise<CloudinarySignResponse> {
  const res = await fetch("/api/cloudinary-signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as
    | CloudinarySignResponse
    | { error?: string }
  if (!res.ok) {
    throw new Error("error" in data && data.error ? data.error : "Signering fejlede")
  }
  return data as CloudinarySignResponse
}

/**
 * Direct upload to Cloudinary; params must match signed set (folder + eager + timestamp).
 * Returns secure URL of the eager-derived image when available.
 */
export async function uploadImageToCloudinary(
  file: File,
  sign: CloudinarySignResponse,
): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000)
  if (nowSec > sign.validUntil) {
    throw new Error("Signatur udløb — hent en ny og prøv igen")
  }
  const { signature, timestamp, cloudName, apiKey, folder, eager } = sign
  const fd = new FormData()
  fd.append("file", file)
  fd.append("api_key", apiKey)
  fd.append("timestamp", String(timestamp))
  fd.append("signature", signature)
  fd.append("folder", folder)
  fd.append("eager", eager)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: fd },
  )
  const data = (await res.json()) as {
    secure_url?: string
    error?: { message?: string }
    eager?: Array<{ secure_url?: string }>
  }
  if (!res.ok) {
    throw new Error(
      data.error?.message?.trim() || "Upload til Cloudinary fejlede",
    )
  }
  const fromEager = data.eager?.[0]?.secure_url
  if (fromEager) return fromEager
  if (data.secure_url) return data.secure_url
  throw new Error("Manglede billed-URL i svar")
}
