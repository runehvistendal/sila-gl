import type { Locale } from "@/i18n/routing"
import HeroSectionBlock from "@/components/sanity/sections/HeroSectionBlock"
import TextImageSectionBlock from "@/components/sanity/sections/TextImageSectionBlock"
import FaqSectionBlock from "@/components/sanity/sections/FaqSectionBlock"
import CtaSectionBlock from "@/components/sanity/sections/CtaSectionBlock"
import ImageGallerySectionBlock from "@/components/sanity/sections/ImageGallerySectionBlock"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props {
  sections: any[]
  locale: Locale
}

export default function SectionRenderer({ sections, locale }: Props) {
  if (!sections?.length) return null
  return (
    <>
      {sections.map((section, i) => {
        const key = section._key ?? String(i)
        switch (section._type) {
          case "heroSection":
            return <HeroSectionBlock key={key} data={section} locale={locale} />
          case "textImageSection":
            return <TextImageSectionBlock key={key} data={section} locale={locale} />
          case "faqSection":
            return <FaqSectionBlock key={key} data={section} locale={locale} />
          case "ctaSection":
            return <CtaSectionBlock key={key} data={section} locale={locale} />
          case "imageGallerySection":
            return <ImageGallerySectionBlock key={key} data={section} locale={locale} />
          default:
            return null
        }
      })}
    </>
  )
}
