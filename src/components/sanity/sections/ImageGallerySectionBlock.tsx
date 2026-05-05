import Image from "next/image"
import { sanityImage } from "@/lib/sanity"
import type { Locale } from "@/i18n/routing"

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  locale: Locale
}

export default function ImageGallerySectionBlock({ data, locale }: Props) {
  const heading = data[`heading_${locale}`] ?? data.heading_da
  const images = (data.images ?? []) as unknown[]

  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {heading ? (
          <h2 className="text-2xl md:text-3xl font-bold text-[#09192A] mb-8 text-center">{heading}</h2>
        ) : null}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((img, i) => {
            const ref = img as { _key?: string }
            const url = sanityImage(img).width(600).url()
            return (
              <div key={ref._key ?? i} className="relative aspect-square rounded-xl overflow-hidden">
                <Image src={url} alt="" fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
