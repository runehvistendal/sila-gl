export const CABIN_FACILITIES = {
  basis: [
    { value: "bed_linen",      label: "Sengelinned" },
    { value: "towels",         label: "Håndklæder" },
    { value: "indoor_toilet",  label: "Toilet indendørs" },
    { value: "outdoor_toilet", label: "Udendørs toilet" },
    { value: "running_water",  label: "Rindende vand" },
    { value: "hot_water",      label: "Varmt vand" },
    { value: "heating",        label: "Opvarmning" },
    { value: "electricity",    label: "Elektricitet" },
    { value: "kitchen",        label: "Køkken" },
    { value: "fridge",         label: "Køleskab" },
  ],
  udendoors: [
    { value: "terrace",       label: "Terrasse" },
    { value: "grill",         label: "Grill" },
    { value: "fireplace",     label: "Bålplads" },
    { value: "kayak",         label: "Kajak" },
    { value: "fishing_gear",  label: "Fiskegrej" },
  ],
  komfort: [
    { value: "wifi",            label: "Wifi" },
    { value: "tv",              label: "TV" },
    { value: "washing_machine", label: "Vaskemaskine" },
    { value: "dishwasher",      label: "Opvaskemaskine" },
    { value: "coffee_maker",    label: "Kaffemaskine" },
    { value: "freezer",         label: "Fryseboks" },
  ],
  sikkerhed: [
    { value: "smoke_alarm",       label: "Røgalarm" },
    { value: "fire_extinguisher", label: "Brandslukning" },
    { value: "first_aid",         label: "Førstehjælpskasse" },
    { value: "lockable_door",     label: "Låsbar dør" },
  ],
} as const

export function getFixedFacilityValueSet(): Set<string> {
  const s = new Set<string>()
  for (const items of Object.values(CABIN_FACILITIES)) {
    for (const item of items) {
      s.add(item.value)
    }
  }
  return s
}

export type FacilityKey = keyof typeof CABIN_FACILITIES
export const FACILITY_SECTION_LABELS: Record<FacilityKey, string> = {
  basis:     "Basis",
  udendoors: "Udendørs",
  komfort:   "Komfort",
  sikkerhed: "Sikkerhed",
}
