export const EXPERIENCE_FORM_CATEGORIES = [
  "fiskeri",
  "vandring",
  "kajak",
  "hundeslæde",
  "hvalsafari",
  "guidetur",
  "fotografering",
  "andet",
] as const

export type ExperienceFormCategory = (typeof EXPERIENCE_FORM_CATEGORIES)[number]
