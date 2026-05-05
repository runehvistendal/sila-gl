const BASE_URL = "https://sila.gl"

export function buildMetadata({
  locale,
  title,
  description,
  path,
  image,
}: {
  locale: string
  title: string
  description: string
  path: string
  image?: string
}) {
  return {
    title: `${title} — Sila.gl`,
    description,
    alternates: {
      canonical: `${BASE_URL}/${locale}${path}`,
      languages: {
        da: `${BASE_URL}/da${path}`,
        en: `${BASE_URL}/en${path}`,
      },
    },
    openGraph: {
      title: `${title} — Sila.gl`,
      description,
      url: `${BASE_URL}/${locale}${path}`,
      siteName: "Sila.gl",
      locale: locale === "da" ? "da_DK" : "en_US",
      type: "website" as const,
      images: image ? [{ url: image, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${title} — Sila.gl`,
      description,
    },
  }
}
