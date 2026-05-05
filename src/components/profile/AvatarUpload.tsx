"use client"

import { useRef, useState } from "react"
import { Camera, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { fetchCloudinarySignature, uploadImageToCloudinary } from "@/lib/cloudinaryClientUpload"
import { updateAvatar } from "@/app/[locale]/profil/actions"

const MAX_BYTES = 5 * 1024 * 1024
const DEFAULT_SIZE_PX = 96

function initialLetter(fullName: string): string {
  const t = fullName.trim()
  if (!t) return "?"
  return t.charAt(0).toUpperCase()
}

type Props = {
  fullName: string
  initialAvatarUrl: string | null
  /** Avatar-diameter i px; default 96 (profil-kort bruger ofte 80) */
  sizePx?: number
  /** Sæt false når forælder viser egen knap-tekst under (fx "Skift billede") */
  showHelpText?: boolean
  /** f.eks. focus-visible:ring-offset-gray-50 på lys baggrund */
  className?: string
}

export default function AvatarUpload({
  fullName,
  initialAvatarUrl,
  sizePx = DEFAULT_SIZE_PX,
  showHelpText = true,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialAvatarUrl)
  const [uploading, setUploading] = useState(false)

  async function onPickFile(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return
    if (file.size > MAX_BYTES) {
      toast.error("Billedet må højst være 5 MB")
      return
    }

    setUploading(true)
    const previous = previewUrl
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    try {
      const sign = await fetchCloudinarySignature({ kind: "avatar" })
      const url = await uploadImageToCloudinary(file, sign)
      const r = await updateAvatar(url)
      if ("error" in r) {
        setPreviewUrl(previous)
        toast.error(r.error)
        return
      }
      URL.revokeObjectURL(objectUrl)
      setPreviewUrl(url)
    } catch (e) {
      setPreviewUrl(previous)
      URL.revokeObjectURL(objectUrl)
      toast.error(e instanceof Error ? e.message : "Upload fejlede")
    } finally {
      setUploading(false)
    }
  }

  const iconClass =
    sizePx >= 90 ? "w-8 h-8" : "w-6 h-6"
  const initialTextClass = sizePx >= 90 ? "text-3xl" : "text-2xl"

  return (
    <div
      className={`flex flex-col items-center gap-3 ${className ?? ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Vælg profilbillede"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null
          e.target.value = ""
          void onPickFile(f)
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative rounded-full border-2 overflow-hidden flex items-center justify-center shrink-0 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 focus-visible:ring-[#4A9CC7] disabled:opacity-70 group"
        style={{
          width: sizePx,
          height: sizePx,
          borderColor: "#4A9CC7",
          backgroundColor: "rgba(74, 156, 199, 0.2)",
        }}
        aria-label="Skift profilbillede"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className={`${initialTextClass} font-bold text-white`}
            aria-hidden
          >
            {initialLetter(fullName)}
          </span>
        )}
        {uploading && (
          <span
            className="absolute inset-0 flex items-center justify-center rounded-full z-10"
            style={{ backgroundColor: "rgba(9, 25, 42, 0.65)" }}
          >
            <Loader2
              className={`${iconClass} animate-spin`}
              style={{ color: "#4A9CC7" }}
              aria-hidden
            />
          </span>
        )}
        {!uploading && (
          <span
            className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: "rgba(74, 156, 199, 0.55)" }}
          >
            <Camera className={iconClass} style={{ color: "#4A9CC7" }} aria-hidden />
          </span>
        )}
      </button>
      {showHelpText && (
        <p className="text-sm text-white/70 text-center max-w-xs">
          Klik for at uploade profilbillede (max. 5 MB)
        </p>
      )}
    </div>
  )
}
