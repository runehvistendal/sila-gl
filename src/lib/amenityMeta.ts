import type { LucideIcon } from "lucide-react"
import {
  Droplets, Thermometer, Home, Trees, Zap, Flame,
  UtensilsCrossed, Package, Wifi, Tv, Sun, Waves,
  Anchor, Fish, Bed, ShieldCheck,
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
  // ── Køkken ──────────────────────────────────────────────────────
  kitchen:            { label: "Køkken",               icon: UtensilsCrossed },
  refrigerator:       { label: "Køleskab",             icon: Package },
  fridge:             { label: "Køleskab",             icon: Package },   // CABIN_FACILITIES key
  coffee_maker:       { label: "Kaffemaskine",         icon: Package },
  freezer:            { label: "Fryseboks",            icon: Package },
  dishwasher:         { label: "Opvaskemaskine",       icon: UtensilsCrossed },
  // ── Internet & underholdning ────────────────────────────────────
  wifi:               { label: "Wifi",                 icon: Wifi },
  tv:                 { label: "TV",                   icon: Tv },
  // ── Udendørs ────────────────────────────────────────────────────
  terrace:            { label: "Terrasse",             icon: Sun },
  campfire:           { label: "Bålplads",             icon: Flame },
  fireplace:          { label: "Bålplads",             icon: Flame },   // CABIN_FACILITIES key
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
  // ── Sikkerhed ───────────────────────────────────────────────────
  smoke_alarm:        { label: "Røgalarm",             icon: ShieldCheck },
  fire_extinguisher:  { label: "Brandslukning",        icon: ShieldCheck },
  first_aid:          { label: "Førstehjælpskasse",    icon: ShieldCheck },
  lockable_door:      { label: "Låsbar dør",           icon: ShieldCheck },
}

/**
 * Keys shown in the filter panel on /hytter — only keys present in DB.
 * Keeps the filter UI clean without showing amenities no cabin has.
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
