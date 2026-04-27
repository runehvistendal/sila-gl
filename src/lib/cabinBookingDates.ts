import { addDays, format, isBefore, parseISO } from "date-fns"

/** Halvåben interval [check_in, check_out): alle nætter som YYYY-MM-DD */
export function enumerateNights(
  checkInYmd: string,
  checkOutYmd: string,
): string[] {
  const out: string[] = []
  let cur = parseISO(checkInYmd)
  const end = parseISO(checkOutYmd)
  while (isBefore(cur, end)) {
    out.push(format(cur, "yyyy-MM-dd"))
    cur = addDays(cur, 1)
  }
  return out
}

export function nightsFromBookings(
  rows: { check_in: string; check_out: string }[],
): Set<string> {
  const s = new Set<string>()
  for (const r of rows) {
    for (const n of enumerateNights(r.check_in, r.check_out)) {
      s.add(n)
    }
  }
  return s
}
