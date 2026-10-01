export const EXPERIENCE_CATEGORIES = [
  { key: "bygdebesoeg", label: "Bygdebesøg" },
  { key: "vandring", label: "Vandring" },
  { key: "catch_and_eat", label: "Catch and Eat" },
  { key: "kaffemik", label: "Kaffemik" },
  { key: "fiskeri", label: "Fiskeri" },
  { key: "isfiskeri", label: "Isfiskeri" },
  { key: "groenlandsk_madlavning", label: "Grønlandsk madlavning" },
  { key: "snescooter", label: "Snescooter" },
  { key: "hundeslæde", label: "Hundeslæde" },
  { key: "kajak", label: "Kajak" },
  { key: "padling", label: "Padling" },
  { key: "fjordtur", label: "Fjordtur" },
  { key: "nordlystur", label: "Nordlystur" },
  { key: "jagt", label: "Jagt" },
] as const

export type ExperienceCategoryKey = (typeof EXPERIENCE_CATEGORIES)[number]["key"]
