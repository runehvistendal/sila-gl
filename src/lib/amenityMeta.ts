import type { LucideIcon } from "lucide-react"
import {
  Droplets, Thermometer, Home, Trees, Zap, Flame,
  UtensilsCrossed, Package, Wifi, Tv, Sun, Waves,
  Anchor, Fish, Bed, ShieldCheck, Baby, Dog, Smile,
  Microwave, Wind, Building2, Car, Bike, Luggage, Shirt,
  Video, Bell, Cigarette,
} from "lucide-react"

export interface AmenityMeta {
  label: string
  icon: LucideIcon
}

/**
 * Canonical amenity keys — matches DB values (cabins.amenities[]).
 * Keys from CABIN_FACILITIES that don't exist in DB yet are included
 * so the "Inkluderet" section works when a cabin saves them.
 * NO compat aliases — one key per facility.
 */
export const AMENITY_META: Record<string, AmenityMeta> = {
  // ── Vand & sanitet ─────────────────────────────────────────────
  running_water:      { label: "Rindende vand",       icon: Droplets },
  hot_water:          { label: "Varmt vand",           icon: Thermometer },
  indoor_toilet:      { label: "Toilet indendørs",     icon: Home },
  outdoor_toilet:     { label: "Udendørs toilet",      icon: Trees },
  // ── El & varme ──────────────────────────────────────────────────
  electricity:        { label: "Elektricitet",         icon: Zap },
  heating:            { label: "Opvarmning",           icon: Flame },
  air_conditioning:   { label: "Aircondition",         icon: Wind },
  // ── Køkken ──────────────────────────────────────────────────────
  kitchen:            { label: "Køkken",               icon: UtensilsCrossed },
  refrigerator:       { label: "Køleskab",             icon: Package },
  fridge:             { label: "Køleskab",             icon: Package },
  coffee_maker:       { label: "Kaffemaskine",         icon: Package },
  microwave:          { label: "Mikrobølgeovn",        icon: Microwave },
  oven:               { label: "Ovn",                  icon: Flame },
  freezer:            { label: "Fryseboks",            icon: Package },
  dishwasher:         { label: "Opvaskemaskine",       icon: UtensilsCrossed },
  // ── Internet & underholdning ────────────────────────────────────
  wifi:               { label: "Wifi",                 icon: Wifi },
  tv:                 { label: "TV",                   icon: Tv },
  // ── Udendørs / uderum ──────────────────────────────────────────
  terrace:            { label: "Terrasse",             icon: Sun },
  balcony:            { label: "Altan",                icon: Home },
  campfire:           { label: "Bålplads",             icon: Flame },
  fireplace:          { label: "Bålplads",             icon: Flame },
  grill:              { label: "Grill",                icon: UtensilsCrossed },
  sauna:              { label: "Sauna",                icon: Waves },
  // ── Aktiviteter ─────────────────────────────────────────────────
  kayak:              { label: "Kajak",                icon: Waves },
  fishing_gear:       { label: "Fiskegrej",            icon: Fish },
  boat_included:      { label: "Båd inkluderet",       icon: Anchor },
  // ── Sengelinned & service ───────────────────────────────────────
  bed_linen:          { label: "Sengelinned",          icon: Bed },
  towels:             { label: "Håndklæder",           icon: Bed },
  washing_machine:    { label: "Vaskemaskine",         icon: Home },
  // ── Praktisk (bolig) ────────────────────────────────────────────
  elevator:           { label: "Elevator",             icon: Building2 },
  parking:            { label: "Parkering",            icon: Car },
  bicycle_storage:    { label: "Cykelparkering",       icon: Bike },
  luggage_storage:    { label: "Bagageopbevaring",     icon: Luggage },
  iron_and_board:     { label: "Strygejern og bræt",  icon: Shirt },
  // ── Sikkerhed ───────────────────────────────────────────────────
  smoke_alarm:        { label: "Røgalarm",             icon: ShieldCheck },
  fire_extinguisher:  { label: "Brandslukning",        icon: ShieldCheck },
  first_aid:          { label: "Førstehjælpskasse",    icon: ShieldCheck },
  lockable_door:      { label: "Låsbar dør",           icon: ShieldCheck },
  video_doorbell:     { label: "Video-dørklokke",      icon: Video },
  // ── Gæster & kæledyr (hytte — ikke /hytter-filter) ─────────────
  family_friendly:    { label: "Børnevenlig",          icon: Smile },
  baby_crib_available: { label: "Børnesenge til rådighed", icon: Baby },
  pets_allowed:       { label: "Kæledyr tilladt",      icon: Dog },
  child_friendly:     { label: "Børnevenlig",          icon: Baby },
  smoking_allowed:    { label: "Rygning tilladt",      icon: Cigarette },
  // ── Båd: gæster & kæledyr (boats.equipment[]) ───────────────────
  kids_welcome_lifejackets: {
    label: "Børn velkommen (redningsveste til børn til rådighed)",
    icon: Smile,
  },
}

/**
 * Keys shown in the filter panel on /ophold/i-naturen — only keys present in DB.
 */
export const AMENITY_FILTER_KEYS: string[] = [
  "running_water", "hot_water", "indoor_toilet", "outdoor_toilet",
  "electricity", "heating",
  "kitchen", "refrigerator",
  "wifi", "tv",
  "terrace", "campfire", "grill", "sauna",
  "kayak", "fishing_gear",
  "bed_linen", "towels",
]

/** Chip-struktur til bolig-oprettelse (I byen) — adskilt fra hytte-faciliteter */
export const RESIDENCE_FACILITIES = {
  basis: [
    { value: "wifi", labelKey: "wifi" },
    { value: "tv", labelKey: "tv" },
    { value: "washing_machine", labelKey: "washing_machine" },
    { value: "dishwasher", labelKey: "dishwasher" },
    { value: "coffee_maker", labelKey: "coffee_maker" },
    { value: "refrigerator", labelKey: "refrigerator" },
    { value: "microwave", labelKey: "microwave" },
    { value: "oven", labelKey: "oven" },
    { value: "kitchen", labelKey: "kitchen" },
  ],
  komfort: [
    { value: "heating", labelKey: "heating" },
    { value: "air_conditioning", labelKey: "air_conditioning" },
    { value: "balcony", labelKey: "balcony" },
    { value: "terrace", labelKey: "terrace" },
    { value: "elevator", labelKey: "elevator" },
  ],
  praktisk: [
    { value: "parking", labelKey: "parking" },
    { value: "bicycle_storage", labelKey: "bicycle_storage" },
    { value: "luggage_storage", labelKey: "luggage_storage" },
    { value: "iron_and_board", labelKey: "iron_and_board" },
  ],
  sikkerhed: [
    { value: "smoke_alarm", labelKey: "smoke_alarm" },
    { value: "fire_extinguisher", labelKey: "fire_extinguisher" },
    { value: "first_aid", labelKey: "first_aid" },
    { value: "lockable_door", labelKey: "lockable_door" },
    { value: "video_doorbell", labelKey: "video_doorbell" },
  ],
  regler: [
    { value: "pets_allowed", labelKey: "pets_allowed" },
    { value: "smoking_allowed", labelKey: "smoking_allowed" },
    { value: "child_friendly", labelKey: "child_friendly" },
  ],
} as const

export type ResidenceFacilitySectionKey = keyof typeof RESIDENCE_FACILITIES

export const RESIDENCE_SECTION_LABELS: Record<ResidenceFacilitySectionKey, string> = {
  basis: "Basis",
  komfort: "Komfort",
  praktisk: "Praktisk",
  sikkerhed: "Sikkerhed",
  regler: "Regler",
}

export function getResidenceFacilityValueSet(): Set<string> {
  const s = new Set<string>()
  for (const items of Object.values(RESIDENCE_FACILITIES)) {
    for (const item of items) {
      s.add(item.value)
    }
  }
  return s
}

/** Filtre på /ophold/i-byen */
export const RESIDENCE_AMENITY_FILTER_KEYS: string[] = [
  ...RESIDENCE_FACILITIES.basis.map((i) => i.value),
  ...RESIDENCE_FACILITIES.komfort.map((i) => i.value),
  ...RESIDENCE_FACILITIES.praktisk.map((i) => i.value),
  ...RESIDENCE_FACILITIES.sikkerhed.map((i) => i.value),
  ...RESIDENCE_FACILITIES.regler.map((i) => i.value),
]
