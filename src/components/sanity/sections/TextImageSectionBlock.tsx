import Image from "next/image"
import { PortableText } from "@portabletext/react"
import { sanityImage } from "@/lib/sanity"
import type { Locale } from "@/i18n/routing"

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  locale: Locale
}

export default function TextImageSectionBlock({ data, locale }: Props) {
  const heading = data[`heading_${locale}`] ?? data.heading_da
  const body = data[`body_${locale}`] ?? data.body_da
  const imgUrl = data.image ? sanityImage(data.image).width(800).url() : null
  const imgRight = data.imagePosition !== "left"

  return (
    <section className="py-16 px-4">
      <div
        className={`max-w-5xl mx-auto flex flex-col gap-10 items-center ${
          imgRight ? "md:flex-row" : "md:flex-row-reverse"
        }`}
      >
        <div className="flex-1 w-full md:w-auto">
          {heading ? <h2 className="text-2xl md:text-3xl font-bold text-[#09192A] mb-4">{heading}</h2> : null}
          {body ? (
            <div className="prose prose-lg max-w-none">
              <PortableText value={body} />
            </div>
          ) : null}
        </div>
        {imgUrl ? (
          <div className="flex-1 relative aspect-[4/3] w-full rounded-xl overflow-hidden">
            <Image src={imgUrl} alt={heading ?? ""} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
        ) : null}
      </div>
    </section>
  )
}
