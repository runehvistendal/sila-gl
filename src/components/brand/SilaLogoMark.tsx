/**
 * Sila.gl ordmærke — bølge + nordlys-inspireret bue (erstatter rent anker-ikon).
 */
export default function SilaLogoMark({
  className = "",
  size = 22,
}: {
  className?: string
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="silaLogoGrad" x1="4" y1="24" x2="28" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4A9CC7" />
          <stop offset="1" stopColor="#7FD4C1" />
        </linearGradient>
      </defs>
      <path
        d="M4 20c4-6 8-8 12-8s8 2 12 8"
        stroke="url(#silaLogoGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M6 24c3.5-4 7-6 10-6s6.5 2 10 6"
        stroke="url(#silaLogoGrad)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.65"
        fill="none"
      />
      <path
        d="M16 6v6M13 9h6"
        stroke="url(#silaLogoGrad)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
