"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"
import {
  fetchCloudinarySignature,
  uploadImageToCloudinary,
} from "@/lib/cloudinaryClientUpload"
import { updateCabinImages } from "@/app/opret/hytte/actions"

const MAX_BYTES = 5 * 1024 * 1024
const MAX_IMAGES = 8

type Props = {
  cabinId: string
  initialImages: string[]
}

export default function CabinImageUpload({ cabinId, initialImages }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<string[]>(() => [...initialImages])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    setImages([...initialImages])
  }, [initialImages])

  const persist = useCallback(
    async (next: string[]) => {
      try {
        const r = await updateCabinImages(cabinId, next)
        if ("error" in r) {
          toast.error(r.error)
          return false
        }
        return true
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Kunne ikke gemme")
        return false
      }
    },
    [cabinId],
  )

  async function handleFiles(fileList: FileList | File[] | null) {
    if (!fileList?.length || uploading) return
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"))
    if (files.length === 0) {
      toast.error("Vælg billedfiler")
      return
    }

    let current = [...images]
    for (const file of files) {
      if (current.length >= MAX_IMAGES) {
        toast.error(`Højest ${MAX_IMAGES} billeder`)
        break
      }
      if (file.size > MAX_BYTES) {
        toast.error("Hvert billede må højst være 5 MB")
        continue
      }

      setUploading(true)
      try {
        const sign = await fetchCloudinarySignature({
          kind: "cabin",
          cabinId,
        })
        const url = await uploadImageToCloudinary(file, sign)
        const next = [...current, url]
        const ok = await persist(next)
        if (ok) {
          current = next
          setImages(next)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload fejlede")
      } finally {
        setUploading(false)
      }
    }
  }

  async function removeAt(index: number) {
    if (uploading) return
    const next = images.filter((_, i) => i !== index)
    setUploading(true)
    try {
      const ok = await persist(next)
      if (ok) setImages(next)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Første billede er forsidebillede. Op til {MAX_IMAGES} billeder.
      </p>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(false)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          void handleFiles(e.dataTransfer.files)
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed px-4 py-10 text-center cursor-pointer transition-colors ${
          dragOver ? "opacity-95" : ""
        } ${uploading ? "pointer-events-none opacity-70" : ""}`}
        style={{
          borderColor: "#4A9CC7",
          backgroundColor: "#09192A",
          color: "#fff",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label="Vælg hyttebilleder"
          onChange={(e) => {
            void handleFiles(e.target.files)
            e.target.value = ""
          }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2
              className="w-10 h-10 animate-spin"
              style={{ color: "#4A9CC7" }}
              aria-hidden
            />
            <span className="text-sm">Uploader…</span>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">Træk billeder hertil eller klik for at vælge</p>
            <p className="text-xs text-white/70 mt-2">JPG, PNG, WebP — max. 5 MB pr. fil</p>
          </>
        )}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {images.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="relative aspect-[4/3] rounded-lg shadow-sm overflow-hidden group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void removeAt(i)
                }}
                disabled={uploading}
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-90 hover:opacity-100 disabled:opacity-40"
                aria-label="Slet billede"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
