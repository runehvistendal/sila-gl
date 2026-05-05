export interface DestinationMeta {
  slug: string
  name_da: string
  name_en: string
  description_da: string
  description_en: string
  location_key: string
}

export const DESTINATIONS: Record<string, DestinationMeta> = {
  nuuk: {
    slug: "nuuk",
    name_da: "Nuuk",
    name_en: "Nuuk",
    description_da: "Grønlands hovedstad — moderne by omgivet af fjorde og fjelde.",
    description_en: "Greenland's capital — a modern city surrounded by fjords and mountains.",
    location_key: "nuuk",
  },
  ilulissat: {
    slug: "ilulissat",
    name_da: "Ilulissat",
    name_en: "Ilulissat",
    description_da: "Isfjordens by — verdensarv og udgangspunkt for uforglemmelige bådture.",
    description_en: "City of the Icefjord — a UNESCO World Heritage site and base for unforgettable boat trips.",
    location_key: "ilulissat",
  },
  sisimiut: {
    slug: "sisimiut",
    name_da: "Sisimiut",
    name_en: "Sisimiut",
    description_da: "Grønlands næststørste by — porten til Arktis med dramatisk natur.",
    description_en: "Greenland's second largest city — the gateway to the Arctic with dramatic scenery.",
    location_key: "sisimiut",
  },
  qaqortoq: {
    slug: "qaqortoq",
    name_da: "Qaqortoq",
    name_en: "Qaqortoq",
    description_da: "Sydgrønlands perle — farverige huse, vikinghistorie og milde somre.",
    description_en: "The jewel of South Greenland — colourful houses, Viking history and mild summers.",
    location_key: "qaqortoq",
  },
  aasiaat: {
    slug: "aasiaat",
    name_da: "Aasiaat",
    name_en: "Aasiaat",
    description_da: "Diskobugten — midnatssol, isfjelde og autentisk grønlandsk hverdagsliv.",
    description_en: "Disko Bay — midnight sun, icebergs and authentic Greenlandic everyday life.",
    location_key: "aasiaat",
  },
  tasiilaq: {
    slug: "tasiilaq",
    name_da: "Tasiilaq",
    name_en: "Tasiilaq",
    description_da: "Østgrønlands vigtigste by — vild natur, isbjørne og uberørt arktisk land.",
    description_en:
      "East Greenland's main town — wild nature, polar bears and untouched Arctic land.",
    location_key: "tasiilaq",
  },
}

export const DESTINATION_SLUGS = Object.keys(DESTINATIONS)
