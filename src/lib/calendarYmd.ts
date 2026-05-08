/** Lokal kalenderdag som YYYY-MM-DD (browser-tidszone). */
export function localTodayYmd(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`
}

export function parseYmd(ymd: string): Date {
  const [y, m, day] = ymd.split("-").map(Number)
  return new Date(y, m - 1, day)
}

/** Sammenlignelig nøgle for (år, månedsindex 0–11) — undgår "2024-9" > "2024-10". */
export function yearMonthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex).padStart(2, "0")}`
}
