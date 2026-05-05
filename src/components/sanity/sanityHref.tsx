import type { Route } from "next"
import { Link } from "@/i18n/navigation"

interface Props {
  href: string
  className?: string
  children: React.ReactNode
}

/** Internal paths use next-intl `Link`; external/mailto use `<a>`. */
export default function SanityCtaLink({ href, className, children }: Props) {
  if (!href) return null
  const isAbsolute =
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  if (isAbsolute) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  }
  return (
    <Link href={href as Route} className={className}>
      {children}
    </Link>
  )
}
