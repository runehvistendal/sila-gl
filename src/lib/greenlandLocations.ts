export interface GreenlandLocation {
  postal_code: string
  name_gl: string
  name_dk: string
  type: "by" | "bygd"
  latitude: number
  longitude: number
  region: "Sermersooq" | "Qeqertalik" | "Kujalleq" | "Qaasuitsup"
  population: number
  is_major_hub: boolean
}

export const GREENLAND_LOCATIONS: GreenlandLocation[] = [
  { postal_code: "3900", name_gl: "Nuuk", name_dk: "Nuuk", type: "by", latitude: 64.175, longitude: -51.739, region: "Sermersooq", population: 18465, is_major_hub: true },
  { postal_code: "3910", name_gl: "Ilulissat", name_dk: "Ilulissat", type: "by", latitude: 69.22, longitude: -51.096, region: "Qeqertalik", population: 4613, is_major_hub: true },
  { postal_code: "3920", name_gl: "Qaqortoq", name_dk: "Qaqortoq", type: "by", latitude: 60.716, longitude: -46.034, region: "Kujalleq", population: 3047, is_major_hub: true },
  { postal_code: "3930", name_gl: "Sisimiut", name_dk: "Sisimiut", type: "by", latitude: 66.94, longitude: -53.673, region: "Qeqertalik", population: 5511, is_major_hub: true },
  { postal_code: "3940", name_gl: "Maniitsoq", name_dk: "Maniitsoq", type: "by", latitude: 65.414, longitude: -52.897, region: "Qeqertalik", population: 1259, is_major_hub: false },
  { postal_code: "3950", name_gl: "Aasiaat", name_dk: "Aasiaat", type: "by", latitude: 68.708, longitude: -52.891, region: "Qeqertalik", population: 3034, is_major_hub: true },
  { postal_code: "3960", name_gl: "Kangerlussuaq", name_dk: "Kangerlussuaq", type: "by", latitude: 66.996, longitude: -50.621, region: "Qeqertalik", population: 512, is_major_hub: false },
  { postal_code: "3970", name_gl: "Tasiilaq", name_dk: "Tasiilaq", type: "by", latitude: 65.614, longitude: -37.636, region: "Sermersooq", population: 2049, is_major_hub: true },
  { postal_code: "3913", name_gl: "Qeqertarsuaq", name_dk: "Qeqertarsuaq", type: "by", latitude: 69.253, longitude: -53.578, region: "Qeqertalik", population: 854, is_major_hub: false },
  { postal_code: "3921", name_gl: "Narsaq", name_dk: "Narsaq", type: "by", latitude: 60.912, longitude: -46.059, region: "Kujalleq", population: 1368, is_major_hub: false },
  { postal_code: "3932", name_gl: "Kangaatsiaq", name_dk: "Kangaatsiaq", type: "by", latitude: 68.305, longitude: -53.285, region: "Qeqertalik", population: 508, is_major_hub: false },
  { postal_code: "3933", name_gl: "Uummannaq", name_dk: "Uummannaq", type: "by", latitude: 70.682, longitude: -52.117, region: "Qeqertalik", population: 1235, is_major_hub: false },
  { postal_code: "3934", name_gl: "Upernavik", name_dk: "Upernavik", type: "by", latitude: 72.786, longitude: -56.148, region: "Qaasuitsup", population: 1213, is_major_hub: false },
  { postal_code: "3945", name_gl: "Qasigiannguit", name_dk: "Qasigiannguit", type: "by", latitude: 68.815, longitude: -51.191, region: "Qeqertalik", population: 1178, is_major_hub: false },
  { postal_code: "3954", name_gl: "Saqqaq", name_dk: "Saqqaq", type: "by", latitude: 72.118, longitude: -54.896, region: "Qaasuitsup", population: 629, is_major_hub: false },
  { postal_code: "3971", name_gl: "Avannaata", name_dk: "Avannaata", type: "by", latitude: 72.495, longitude: -56.134, region: "Qaasuitsup", population: 1210, is_major_hub: false },
  { postal_code: "3972", name_gl: "Kulusuk", name_dk: "Kulusuk", type: "bygd", latitude: 65.574, longitude: -37.293, region: "Sermersooq", population: 273, is_major_hub: false },
  { postal_code: "3973", name_gl: "Sermiligaaq", name_dk: "Sermiligaaq", type: "bygd", latitude: 65.815, longitude: -37.448, region: "Sermersooq", population: 59, is_major_hub: false },
  { postal_code: "3974", name_gl: "Tiniteqilaaq", name_dk: "Tiniteqilaaq", type: "bygd", latitude: 65.882, longitude: -37.596, region: "Sermersooq", population: 56, is_major_hub: false },
  { postal_code: "3922", name_gl: "Igaliku", name_dk: "Igaliku", type: "bygd", latitude: 60.734, longitude: -46.394, region: "Kujalleq", population: 19, is_major_hub: false },
  { postal_code: "3923", name_gl: "Narsarsuaq", name_dk: "Narsarsuaq", type: "bygd", latitude: 61.159, longitude: -45.418, region: "Kujalleq", population: 161, is_major_hub: false },
  { postal_code: "3924", name_gl: "Tasiilaq", name_dk: "Tasiilaq", type: "bygd", latitude: 61.279, longitude: -45.555, region: "Kujalleq", population: 110, is_major_hub: false },
  { postal_code: "3925", name_gl: "Uummannaq", name_dk: "Uummannaq", type: "bygd", latitude: 60.579, longitude: -45.993, region: "Kujalleq", population: 88, is_major_hub: false },
  { postal_code: "3926", name_gl: "Qorlortorsuaq", name_dk: "Qorlortorsuaq", type: "bygd", latitude: 60.661, longitude: -47.094, region: "Kujalleq", population: 9, is_major_hub: false },
  { postal_code: "3927", name_gl: "Ikerasassuaq", name_dk: "Ikerasassuaq", type: "bygd", latitude: 60.458, longitude: -46.356, region: "Kujalleq", population: 6, is_major_hub: false },
  { postal_code: "3928", name_gl: "Tunulliarfik", name_dk: "Tunulliarfik", type: "bygd", latitude: 61.157, longitude: -48.163, region: "Kujalleq", population: 75, is_major_hub: false },
  { postal_code: "3929", name_gl: "Qassimiut", name_dk: "Qassimiut", type: "bygd", latitude: 60.386, longitude: -47.628, region: "Kujalleq", population: 48, is_major_hub: false },
  { postal_code: "3975", name_gl: "Akunnaaq", name_dk: "Akunnaaq", type: "bygd", latitude: 60.287, longitude: -44.434, region: "Kujalleq", population: 45, is_major_hub: false },
  { postal_code: "3976", name_gl: "Qaanaaq", name_dk: "Qaanaaq", type: "bygd", latitude: 60.158, longitude: -44.575, region: "Kujalleq", population: 21, is_major_hub: false },
  { postal_code: "3977", name_gl: "Qeqertarsuaq", name_dk: "Qeqertarsuaq", type: "bygd", latitude: 60.303, longitude: -45.303, region: "Kujalleq", population: 31, is_major_hub: false },
  { postal_code: "3978", name_gl: "Alluitsup Paa", name_dk: "Alluitsup Paa", type: "bygd", latitude: 60.493, longitude: -46.636, region: "Kujalleq", population: 38, is_major_hub: false },
  { postal_code: "3944", name_gl: "Akureyri", name_dk: "Akureyri", type: "bygd", latitude: 68.264, longitude: -52.843, region: "Qeqertalik", population: 20, is_major_hub: false },
  { postal_code: "3931", name_gl: "Alannguaq", name_dk: "Alannguaq", type: "bygd", latitude: 68.594, longitude: -52.594, region: "Qeqertalik", population: 38, is_major_hub: false },
  { postal_code: "3912", name_gl: "Anuraaq", name_dk: "Anuraaq", type: "bygd", latitude: 69.361, longitude: -51.513, region: "Qeqertalik", population: 25, is_major_hub: false },
  { postal_code: "3931", name_gl: "Appat", name_dk: "Appat", type: "bygd", latitude: 68.553, longitude: -52.462, region: "Qeqertalik", population: 29, is_major_hub: false },
  { postal_code: "3937", name_gl: "Uummannaq", name_dk: "Uummannaq", type: "bygd", latitude: 70.724, longitude: -52.102, region: "Qeqertalik", population: 36, is_major_hub: false },
  { postal_code: "3938", name_gl: "Ikamiut", name_dk: "Ikamiut", type: "bygd", latitude: 70.501, longitude: -52.329, region: "Qeqertalik", population: 26, is_major_hub: false },
  { postal_code: "3939", name_gl: "Ikissuaq", name_dk: "Ikissuaq", type: "bygd", latitude: 70.562, longitude: -52.228, region: "Qeqertalik", population: 29, is_major_hub: false },
  { postal_code: "3941", name_gl: "Qekkertarsuaq", name_dk: "Qekkertarsuaq", type: "bygd", latitude: 65.255, longitude: -52.865, region: "Qeqertalik", population: 10, is_major_hub: false },
  { postal_code: "3942", name_gl: "Niaqornat", name_dk: "Niaqornat", type: "bygd", latitude: 65.475, longitude: -53.312, region: "Qeqertalik", population: 23, is_major_hub: false },
  { postal_code: "3943", name_gl: "Ikerasak", name_dk: "Ikerasak", type: "bygd", latitude: 68.472, longitude: -53.559, region: "Qeqertalik", population: 42, is_major_hub: false },
  { postal_code: "3946", name_gl: "Illorsuit", name_dk: "Illorsuit", type: "bygd", latitude: 69.054, longitude: -51.113, region: "Qeqertalik", population: 153, is_major_hub: false },
  { postal_code: "3947", name_gl: "Oqaatsut", name_dk: "Oqaatsut", type: "bygd", latitude: 69.304, longitude: -51.144, region: "Qeqertalik", population: 47, is_major_hub: false },
  { postal_code: "3951", name_gl: "Aappilattuk", name_dk: "Aappilattuk", type: "bygd", latitude: 68.719, longitude: -52.893, region: "Qeqertalik", population: 15, is_major_hub: false },
  { postal_code: "3952", name_gl: "Imalik", name_dk: "Imalik", type: "bygd", latitude: 68.631, longitude: -53.134, region: "Qeqertalik", population: 13, is_major_hub: false },
  { postal_code: "3953", name_gl: "Atammaq", name_dk: "Atammaq", type: "bygd", latitude: 68.565, longitude: -53.321, region: "Qeqertalik", population: 18, is_major_hub: false },
  { postal_code: "3955", name_gl: "Qeqertarsuaq", name_dk: "Qeqertarsuaq", type: "bygd", latitude: 72.308, longitude: -54.636, region: "Qaasuitsup", population: 41, is_major_hub: false },
  { postal_code: "3957", name_gl: "Uummannaq", name_dk: "Uummannaq", type: "bygd", latitude: 72.587, longitude: -55.571, region: "Qaasuitsup", population: 45, is_major_hub: false },
  { postal_code: "3958", name_gl: "Nuussuaq", name_dk: "Nuussuaq", type: "bygd", latitude: 72.641, longitude: -55.832, region: "Qaasuitsup", population: 58, is_major_hub: false },
  { postal_code: "3935", name_gl: "Upernavik Kujalleq", name_dk: "Upernavik Kujalleq", type: "bygd", latitude: 72.388, longitude: -56.515, region: "Qaasuitsup", population: 79, is_major_hub: false },
  { postal_code: "3936", name_gl: "Qaarsut", name_dk: "Qaarsut", type: "bygd", latitude: 72.768, longitude: -56.108, region: "Qaasuitsup", population: 67, is_major_hub: false },
  { postal_code: "3961", name_gl: "Sisimiut", name_dk: "Sisimiut", type: "bygd", latitude: 67.044, longitude: -53.626, region: "Qeqertalik", population: 15, is_major_hub: false },
  { postal_code: "3962", name_gl: "Itilleq", name_dk: "Itilleq", type: "bygd", latitude: 67.138, longitude: -53.527, region: "Qeqertalik", population: 12, is_major_hub: false },
  { postal_code: "3963", name_gl: "Sarfannguaq", name_dk: "Sarfannguaq", type: "bygd", latitude: 67.203, longitude: -53.429, region: "Qeqertalik", population: 8, is_major_hub: false },
  { postal_code: "3964", name_gl: "Marraq", name_dk: "Marraq", type: "bygd", latitude: 67.28, longitude: -53.341, region: "Qeqertalik", population: 24, is_major_hub: false },
  { postal_code: "3965", name_gl: "Nugssuaq", name_dk: "Nugssuaq", type: "bygd", latitude: 67.358, longitude: -53.262, region: "Qeqertalik", population: 7, is_major_hub: false },
]

export function findLocation(query: string): GreenlandLocation | undefined {
  const q = query.toLowerCase()
  return GREENLAND_LOCATIONS.find(
    (loc) =>
      loc.name_dk.toLowerCase() === q ||
      loc.name_gl.toLowerCase() === q ||
      loc.postal_code === q
  )
}

export function getCityNames(): string[] {
  return GREENLAND_LOCATIONS.map((loc) => loc.name_dk)
}

/** Unik nøgle til DB (postal + navn — nogle postnumre går igen). */
export function locationToId(loc: GreenlandLocation): string {
  return `${loc.postal_code}|${loc.name_dk}`
}

export function findLocationById(
  id: string | null | undefined,
): GreenlandLocation | undefined {
  if (!id) return undefined
  const i = id.indexOf("|")
  if (i < 0) return undefined
  const postal = id.slice(0, i)
  const name_dk = id.slice(i + 1)
  return GREENLAND_LOCATIONS.find(
    (l) => l.postal_code === postal && l.name_dk === name_dk,
  )
}

/** Alle byer/bygder — sorteret efter dansk navn (A-Å). */
export function getAllLocationsSorted(): GreenlandLocation[] {
  return [...GREENLAND_LOCATIONS].sort((a, b) =>
    a.name_dk.localeCompare(b.name_dk, "da"),
  )
}