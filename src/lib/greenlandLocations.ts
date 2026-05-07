export type LocationType = "city" | "village" | "nature"
export type ArrivalPoint = "airport" | "helipad" | "harbour"

export interface GreenlandLocation {
  postal_code: string
  name_gl: string
  name_dk: string
  type: "by" | "bygd" | "hyttested" | "naturområde" | "fåreholdersted"
  latitude: number
  longitude: number
  region: "Sermersooq" | "Qeqertalik" | "Kujalleq" | "Avannaata" | "Kommune Qeqertalik"
  region_label: string /** Brugervenlig regionsbetegnelse til søgning */
  population: number
  is_major_hub: boolean
  aliases: string[] /** Gamle danske navne, alternative stavemåder, grønlandske varianter */
  location_type: LocationType
  arrival_points: ArrivalPoint[]
}

type GreenlandLocationSeed = Omit<GreenlandLocation, "location_type" | "arrival_points">

const GREENLAND_LOCATIONS_SEED: GreenlandLocationSeed[] = [

  // ─── BYER ───────────────────────────────────────────────────────────────────

  {
    postal_code: "3900",
    name_gl: "Nuuk",
    name_dk: "Nuuk",
    type: "by",
    latitude: 64.175,
    longitude: -51.739,
    region: "Sermersooq",
    region_label: "Nuuk & omegn",
    population: 19903,
    is_major_hub: true,
    aliases: ["Godthåb", "Godthaab", "Nuuk"],
  },
  {
    postal_code: "3952",
    name_gl: "Ilulissat",
    name_dk: "Ilulissat",
    type: "by",
    latitude: 69.22,
    longitude: -51.096,
    region: "Avannaata",
    region_label: "Diskobugten",
    population: 5149,
    is_major_hub: true,
    aliases: ["Jakobshavn", "Ilulisaat"],
  },
  {
    postal_code: "3920",
    name_gl: "Qaqortoq",
    name_dk: "Qaqortoq",
    type: "by",
    latitude: 60.716,
    longitude: -46.034,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 3069,
    is_major_hub: true,
    aliases: ["Julianehåb", "Julianenaab"],
  },
  {
    postal_code: "3911",
    name_gl: "Sisimiut",
    name_dk: "Sisimiut",
    type: "by",
    latitude: 66.94,
    longitude: -53.673,
    region: "Qeqertalik",
    region_label: "Vestgrønland",
    population: 5511,
    is_major_hub: true,
    aliases: ["Holsteinsborg", "Holstensborg"],
  },
  {
    postal_code: "3950",
    name_gl: "Aasiaat",
    name_dk: "Aasiaat",
    type: "by",
    latitude: 68.708,
    longitude: -52.891,
    region: "Qeqertalik",
    region_label: "Diskobugten",
    population: 3034,
    is_major_hub: true,
    aliases: ["Egedesminde"],
  },
  {
    postal_code: "3913",
    name_gl: "Tasiilaq",
    name_dk: "Tasiilaq",
    type: "by",
    latitude: 65.614,
    longitude: -37.636,
    region: "Sermersooq",
    region_label: "Østgrønland",
    population: 2049,
    is_major_hub: true,
    aliases: ["Ammassalik", "Angmagssalik", "Angmagsalik"],
  },
  {
    postal_code: "3912",
    name_gl: "Maniitsoq",
    name_dk: "Maniitsoq",
    type: "by",
    latitude: 65.414,
    longitude: -52.897,
    region: "Qeqertalik",
    region_label: "Vestgrønland",
    population: 2459,
    is_major_hub: false,
    aliases: ["Sukkertoppen"],
  },
  {
    postal_code: "3940",
    name_gl: "Paamiut",
    name_dk: "Paamiut",
    type: "by",
    latitude: 61.994,
    longitude: -49.668,
    region: "Sermersooq",
    region_label: "Sydvestgrønland",
    population: 1429,
    is_major_hub: false,
    aliases: ["Frederikshåb", "Frederiksdal"],
  },
  {
    postal_code: "3921",
    name_gl: "Narsaq",
    name_dk: "Narsaq",
    type: "by",
    latitude: 60.912,
    longitude: -46.059,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 1242,
    is_major_hub: false,
    aliases: ["Narsak"],
  },
  {
    postal_code: "3922",
    name_gl: "Nanortalik",
    name_dk: "Nanortalik",
    type: "by",
    latitude: 60.143,
    longitude: -45.238,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 1072,
    is_major_hub: false,
    aliases: ["Nennortalik"],
  },
  {
    postal_code: "3951",
    name_gl: "Qasigiannguit",
    name_dk: "Qasigiannguit",
    type: "by",
    latitude: 68.815,
    longitude: -51.191,
    region: "Qeqertalik",
    region_label: "Diskobugten",
    population: 1178,
    is_major_hub: false,
    aliases: ["Christianshåb", "Christianshaab"],
  },
  {
    postal_code: "3953",
    name_gl: "Qeqertarsuaq",
    name_dk: "Qeqertarsuaq",
    type: "by",
    latitude: 69.253,
    longitude: -53.578,
    region: "Qeqertalik",
    region_label: "Diskoøen",
    population: 854,
    is_major_hub: false,
    aliases: ["Godhavn", "Diskoøen", "Disko"],
  },
  {
    postal_code: "3955",
    name_gl: "Kangaatsiaq",
    name_dk: "Kangaatsiaq",
    type: "by",
    latitude: 68.305,
    longitude: -53.285,
    region: "Qeqertalik",
    region_label: "Diskobugten",
    population: 508,
    is_major_hub: false,
    aliases: ["Kangatsiak"],
  },
  {
    postal_code: "3956",
    name_gl: "Uummannaq",
    name_dk: "Uummannaq",
    type: "by",
    latitude: 70.682,
    longitude: -52.117,
    region: "Avannaata",
    region_label: "Nordgrønland",
    population: 1391,
    is_major_hub: false,
    aliases: ["Umanak"],
  },
  {
    postal_code: "3961",
    name_gl: "Upernavik",
    name_dk: "Upernavik",
    type: "by",
    latitude: 72.786,
    longitude: -56.148,
    region: "Avannaata",
    region_label: "Nordgrønland",
    population: 1213,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3971",
    name_gl: "Qaanaaq",
    name_dk: "Qaanaaq",
    type: "by",
    latitude: 77.47,
    longitude: -69.23,
    region: "Avannaata",
    region_label: "Nordgrønland",
    population: 646,
    is_major_hub: false,
    aliases: ["Thule", "New Thule"],
  },
  {
    postal_code: "3910",
    name_gl: "Kangerlussuaq",
    name_dk: "Kangerlussuaq",
    type: "by",
    latitude: 66.996,
    longitude: -50.621,
    region: "Qeqertalik",
    region_label: "Vestgrønland",
    population: 512,
    is_major_hub: false,
    aliases: ["Søndre Strømfjord", "Sondrestrom"],
  },
  {
    postal_code: "3924",
    name_gl: "Ittoqqortoormiit",
    name_dk: "Ittoqqortoormiit",
    type: "by",
    latitude: 70.485,
    longitude: -21.962,
    region: "Sermersooq",
    region_label: "Østgrønland",
    population: 325,
    is_major_hub: false,
    aliases: ["Scoresbysund", "Illoqqortoormiut"],
  },
  {
    postal_code: "3930",
    name_gl: "Kangilinnguit",
    name_dk: "Kangilinnguit",
    type: "by",
    latitude: 61.225,
    longitude: -48.0,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 170,
    is_major_hub: false,
    aliases: ["Grønnedal"],
  },
  {
    postal_code: "3923",
    name_gl: "Narsarsuaq",
    name_dk: "Narsarsuaq",
    type: "by",
    latitude: 61.159,
    longitude: -45.418,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 161,
    is_major_hub: false,
    aliases: ["Bluie West One"],
  },

  // ─── BYGDER ─────────────────────────────────────────────────────────────────

  // Nuuk-området
  {
    postal_code: "3900",
    name_gl: "Kapisillit",
    name_dk: "Kapisillit",
    type: "bygd",
    latitude: 64.432,
    longitude: -50.267,
    region: "Sermersooq",
    region_label: "Nuuk & omegn",
    population: 43,
    is_major_hub: false,
    aliases: ["Lakskaj"],
  },
  {
    postal_code: "3900",
    name_gl: "Qeqertarsuatsiaat",
    name_dk: "Qeqertarsuatsiaat",
    type: "bygd",
    latitude: 63.082,
    longitude: -50.679,
    region: "Sermersooq",
    region_label: "Nuuk & omegn",
    population: 169,
    is_major_hub: false,
    aliases: ["Fiskernæs", "Fiskenæsset"],
  },

  // Sisimiut-området
  {
    postal_code: "3911",
    name_gl: "Itilleq",
    name_dk: "Itilleq",
    type: "bygd",
    latitude: 67.138,
    longitude: -53.527,
    region: "Qeqertalik",
    region_label: "Vestgrønland",
    population: 82,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3911",
    name_gl: "Sarfannguaq",
    name_dk: "Sarfannguaq",
    type: "bygd",
    latitude: 67.203,
    longitude: -53.429,
    region: "Qeqertalik",
    region_label: "Vestgrønland",
    population: 8,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3911",
    name_gl: "Kangaamiut",
    name_dk: "Kangaamiut",
    type: "bygd",
    latitude: 65.823,
    longitude: -53.347,
    region: "Qeqertalik",
    region_label: "Vestgrønland",
    population: 289,
    is_major_hub: false,
    aliases: ["Sukkertoppen Kulhavn"],
  },

  // Diskobugten
  {
    postal_code: "3952",
    name_gl: "Ilimanaq",
    name_dk: "Ilimanaq",
    type: "bygd",
    latitude: 69.083,
    longitude: -51.117,
    region: "Avannaata",
    region_label: "Diskobugten",
    population: 53,
    is_major_hub: false,
    aliases: ["Claushavn"],
  },
  {
    postal_code: "3952",
    name_gl: "Oqaatsut",
    name_dk: "Oqaatsut",
    type: "bygd",
    latitude: 69.304,
    longitude: -51.144,
    region: "Avannaata",
    region_label: "Diskobugten",
    population: 47,
    is_major_hub: false,
    aliases: ["Rodebay"],
  },
  {
    postal_code: "3952",
    name_gl: "Saqqaq",
    name_dk: "Saqqaq",
    type: "bygd",
    latitude: 70.018,
    longitude: -51.965,
    region: "Avannaata",
    region_label: "Diskobugten",
    population: 181,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3953",
    name_gl: "Kangerluk",
    name_dk: "Kangerluk",
    type: "bygd",
    latitude: 69.508,
    longitude: -53.978,
    region: "Qeqertalik",
    region_label: "Diskoøen",
    population: 12,
    is_major_hub: false,
    aliases: ["Diskofjord"],
  },

  // Qasigiannguit-området
  {
    postal_code: "3951",
    name_gl: "Ikamiut",
    name_dk: "Ikamiut",
    type: "bygd",
    latitude: 68.633,
    longitude: -51.833,
    region: "Qeqertalik",
    region_label: "Diskobugten",
    population: 26,
    is_major_hub: false,
    aliases: [],
  },

  // Aasiaat-området
  {
    postal_code: "3950",
    name_gl: "Akunnaaq",
    name_dk: "Akunnaaq",
    type: "bygd",
    latitude: 68.755,
    longitude: -52.335,
    region: "Qeqertalik",
    region_label: "Diskobugten",
    population: 145,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3950",
    name_gl: "Kitsissuarsuit",
    name_dk: "Kitsissuarsuit",
    type: "bygd",
    latitude: 68.867,
    longitude: -53.117,
    region: "Qeqertalik",
    region_label: "Diskobugten",
    population: 68,
    is_major_hub: false,
    aliases: ["Hunde Ejland"],
  },

  // Uummannaq-området
  {
    postal_code: "3956",
    name_gl: "Nuugaatsiaq",
    name_dk: "Nuugaatsiaq",
    type: "bygd",
    latitude: 71.538,
    longitude: -53.205,
    region: "Avannaata",
    region_label: "Nordgrønland",
    population: 89,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3956",
    name_gl: "Saattut",
    name_dk: "Saattut",
    type: "bygd",
    latitude: 70.817,
    longitude: -51.617,
    region: "Avannaata",
    region_label: "Nordgrønland",
    population: 196,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3956",
    name_gl: "Ikerasak",
    name_dk: "Ikerasak",
    type: "bygd",
    latitude: 70.497,
    longitude: -51.305,
    region: "Avannaata",
    region_label: "Nordgrønland",
    population: 242,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3956",
    name_gl: "Qaarsut",
    name_dk: "Qaarsut",
    type: "bygd",
    latitude: 70.733,
    longitude: -52.633,
    region: "Avannaata",
    region_label: "Nordgrønland",
    population: 172,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3956",
    name_gl: "Niaqornat",
    name_dk: "Niaqornat",
    type: "bygd",
    latitude: 70.788,
    longitude: -53.659,
    region: "Avannaata",
    region_label: "Nordgrønland",
    population: 56,
    is_major_hub: false,
    aliases: [],
  },

  // Upernavik-området
  {
    postal_code: "3961",
    name_gl: "Kullorsuaq",
    name_dk: "Kullorsuaq",
    type: "bygd",
    latitude: 74.578,
    longitude: -57.228,
    region: "Avannaata",
    region_label: "Nordgrønland",
    population: 444,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3961",
    name_gl: "Nuussuaq",
    name_dk: "Nuussuaq",
    type: "bygd",
    latitude: 74.117,
    longitude: -57.067,
    region: "Avannaata",
    region_label: "Nordgrønland",
    population: 184,
    is_major_hub: false,
    aliases: ["Kraulshavn"],
  },
  {
    postal_code: "3961",
    name_gl: "Upernavik Kujalleq",
    name_dk: "Upernavik Kujalleq",
    type: "bygd",
    latitude: 72.388,
    longitude: -56.515,
    region: "Avannaata",
    region_label: "Nordgrønland",
    population: 79,
    is_major_hub: false,
    aliases: ["Søndre Upernavik"],
  },

  // Qaanaaq-området
  {
    postal_code: "3971",
    name_gl: "Siorapaluk",
    name_dk: "Siorapaluk",
    type: "bygd",
    latitude: 77.783,
    longitude: -70.633,
    region: "Avannaata",
    region_label: "Nordgrønland",
    population: 46,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3971",
    name_gl: "Savissivik",
    name_dk: "Savissivik",
    type: "bygd",
    latitude: 76.017,
    longitude: -65.117,
    region: "Avannaata",
    region_label: "Nordgrønland",
    population: 66,
    is_major_hub: false,
    aliases: [],
  },

  // Østgrønland — Tasiilaq
  {
    postal_code: "3913",
    name_gl: "Kulusuk",
    name_dk: "Kulusuk",
    type: "bygd",
    latitude: 65.574,
    longitude: -37.293,
    region: "Sermersooq",
    region_label: "Østgrønland",
    population: 273,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3913",
    name_gl: "Sermiligaaq",
    name_dk: "Sermiligaaq",
    type: "bygd",
    latitude: 65.897,
    longitude: -36.373,
    region: "Sermersooq",
    region_label: "Østgrønland",
    population: 169,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3913",
    name_gl: "Kuummiut",
    name_dk: "Kuummiut",
    type: "bygd",
    latitude: 65.867,
    longitude: -37.0,
    region: "Sermersooq",
    region_label: "Østgrønland",
    population: 261,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3913",
    name_gl: "Isertoq",
    name_dk: "Isertoq",
    type: "bygd",
    latitude: 65.533,
    longitude: -38.983,
    region: "Sermersooq",
    region_label: "Østgrønland",
    population: 67,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3913",
    name_gl: "Tiilerilaaq",
    name_dk: "Tiilerilaaq",
    type: "bygd",
    latitude: 65.9,
    longitude: -37.383,
    region: "Sermersooq",
    region_label: "Østgrønland",
    population: 87,
    is_major_hub: false,
    aliases: ["Tiniteqilaaq"],
  },

  // Østgrønland — Ittoqqortoormiit
  {
    postal_code: "3924",
    name_gl: "Itterajivit",
    name_dk: "Itterajivit",
    type: "bygd",
    latitude: 70.717,
    longitude: -22.0,
    region: "Sermersooq",
    region_label: "Østgrønland",
    population: 14,
    is_major_hub: false,
    aliases: ["Kap Tobin", "Uunarteq"],
  },

  // Sydgrønland — Qaqortoq-området
  {
    postal_code: "3920",
    name_gl: "Saarloq",
    name_dk: "Saarloq",
    type: "bygd",
    latitude: 60.533,
    longitude: -46.783,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 69,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3920",
    name_gl: "Eqalugaarsuit",
    name_dk: "Eqalugaarsuit",
    type: "bygd",
    latitude: 60.617,
    longitude: -45.917,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 104,
    is_major_hub: false,
    aliases: ["Grønnedal"],
  },
  {
    postal_code: "3920",
    name_gl: "Qassimiut",
    name_dk: "Qassimiut",
    type: "bygd",
    latitude: 60.783,
    longitude: -47.15,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 48,
    is_major_hub: false,
    aliases: [],
  },

  // Sydgrønland — Narsaq-området
  {
    postal_code: "3921",
    name_gl: "Igaliku",
    name_dk: "Igaliku",
    type: "bygd",
    latitude: 60.997,
    longitude: -45.417,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 19,
    is_major_hub: false,
    aliases: ["Gardar", "Igaliko"],
  },

  // Sydgrønland — Nanortalik-området
  {
    postal_code: "3922",
    name_gl: "Aappilattoq",
    name_dk: "Aappilattoq",
    type: "bygd",
    latitude: 60.15,
    longitude: -44.267,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 99,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3922",
    name_gl: "Narsarmijit",
    name_dk: "Narsarmijit",
    type: "bygd",
    latitude: 60.0,
    longitude: -44.65,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 118,
    is_major_hub: false,
    aliases: ["Frederiksdal"],
  },
  {
    postal_code: "3922",
    name_gl: "Tasiusaq",
    name_dk: "Tasiusaq",
    type: "bygd",
    latitude: 60.183,
    longitude: -44.817,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 213,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3922",
    name_gl: "Alluitsup Paa",
    name_dk: "Alluitsup Paa",
    type: "bygd",
    latitude: 60.464,
    longitude: -45.567,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 178,
    is_major_hub: false,
    aliases: ["Sydprøven"],
  },

  // Paamiut-området
  {
    postal_code: "3940",
    name_gl: "Arsuk",
    name_dk: "Arsuk",
    type: "bygd",
    latitude: 61.183,
    longitude: -48.45,
    region: "Sermersooq",
    region_label: "Sydvestgrønland",
    population: 76,
    is_major_hub: false,
    aliases: ["Fiskernæs"],
  },

  // ─── HYTTEDESTINATIONER — Nuuk-fjorden ──────────────────────────────────────

  {
    postal_code: "3900",
    name_gl: "Qooqqut",
    name_dk: "Qooqqut",
    type: "hyttested",
    latitude: 64.267,
    longitude: -51.2,
    region: "Sermersooq",
    region_label: "Nuuk & omegn",
    population: 0,
    is_major_hub: false,
    aliases: ["Qoqqut"],
  },
  {
    postal_code: "3900",
    name_gl: "Qoornooq",
    name_dk: "Qoornooq",
    type: "hyttested",
    latitude: 64.583,
    longitude: -50.883,
    region: "Sermersooq",
    region_label: "Nuuk & omegn",
    population: 0,
    is_major_hub: false,
    aliases: ["Qornok", "Qoornoq"],
  },
  {
    postal_code: "3900",
    name_gl: "Kangerluarsunnguaq",
    name_dk: "Kangerluarsunnguaq",
    type: "hyttested",
    latitude: 64.083,
    longitude: -51.683,
    region: "Sermersooq",
    region_label: "Nuuk & omegn",
    population: 0,
    is_major_hub: false,
    aliases: ["Kobbefjord"],
  },

  // ─── HYTTEDESTINATIONER — Diskobugten ───────────────────────────────────────

  {
    postal_code: "3952",
    name_gl: "Eqip Sermia",
    name_dk: "Eqip Sermia",
    type: "hyttested",
    latitude: 69.817,
    longitude: -50.2,
    region: "Avannaata",
    region_label: "Diskobugten",
    population: 0,
    is_major_hub: false,
    aliases: ["Eqi", "Eqi Gletsjer"],
  },
  {
    postal_code: "3952",
    name_gl: "Sermermiut",
    name_dk: "Sermermiut",
    type: "hyttested",
    latitude: 69.267,
    longitude: -51.083,
    region: "Avannaata",
    region_label: "Diskobugten",
    population: 0,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3953",
    name_gl: "Lyngmarksbræen",
    name_dk: "Lyngmarksbræen",
    type: "hyttested",
    latitude: 69.317,
    longitude: -53.683,
    region: "Qeqertalik",
    region_label: "Diskoøen",
    population: 0,
    is_major_hub: false,
    aliases: ["Lyngmarksgletsjer"],
  },

  // ─── HYTTEDESTINATIONER — Sydgrønland ───────────────────────────────────────

  {
    postal_code: "3921",
    name_gl: "Qassiarsuk",
    name_dk: "Qassiarsuk",
    type: "hyttested",
    latitude: 61.15,
    longitude: -45.517,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 39,
    is_major_hub: false,
    aliases: ["Brattahlid", "Brattalid", "Erik den Rødes gård"],
  },
  {
    postal_code: "3921",
    name_gl: "Upernaviarsuk",
    name_dk: "Upernaviarsuk",
    type: "fåreholdersted",
    latitude: 60.75,
    longitude: -45.983,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 15,
    is_major_hub: false,
    aliases: [],
  },
  {
    postal_code: "3922",
    name_gl: "Tasermiut",
    name_dk: "Tasermiut Fjord",
    type: "naturområde",
    latitude: 60.25,
    longitude: -44.5,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 0,
    is_major_hub: false,
    aliases: ["Ketil", "Ulamertorsuaq", "Klatring Grønland"],
  },
  {
    postal_code: "3922",
    name_gl: "Qinngua",
    name_dk: "Qinngua (Paradisdalen)",
    type: "naturområde",
    latitude: 60.294,
    longitude: -44.493,
    region: "Kujalleq",
    region_label: "Sydgrønland",
    population: 0,
    is_major_hub: false,
    aliases: ["Paradisdalen", "Paradis", "Grønlands skov"],
  },

  // ─── NATUROMRÅDER / UNESCO ───────────────────────────────────────────────────

  {
    postal_code: "3911",
    name_gl: "Aasivissuit",
    name_dk: "Aasivissuit",
    type: "naturområde",
    latitude: 66.983,
    longitude: -50.767,
    region: "Qeqertalik",
    region_label: "Vestgrønland",
    population: 0,
    is_major_hub: false,
    aliases: ["Aasivissuit-Nipisat", "UNESCO Sisimiut", "Inuit jagtområde"],
  },
  {
    postal_code: "3911",
    name_gl: "Nipisat",
    name_dk: "Nipisat",
    type: "naturområde",
    latitude: 66.75,
    longitude: -53.317,
    region: "Qeqertalik",
    region_label: "Vestgrønland",
    population: 0,
    is_major_hub: false,
    aliases: ["Aasivissuit-Nipisat"],
  },
]

function inferLocationType(seedType: GreenlandLocationSeed["type"]): LocationType {
  if (seedType === "by") return "city"
  if (seedType === "bygd") return "village"
  return "nature"
}

/** Afrejsepunkter for byer (name_dk lowercase). By uden eksplicit nøgle: default havn. */
const CITY_ARRIVAL_POINTS: Record<string, ArrivalPoint[]> = {
  nuuk: ["airport", "harbour"],
  ilulissat: ["airport", "harbour"],
  sisimiut: ["airport", "harbour"],
  qaqortoq: ["helipad", "harbour"],
  aasiaat: ["airport", "harbour"],
  tasiilaq: ["airport", "harbour"],
  maniitsoq: ["helipad", "harbour"],
  paamiut: ["helipad", "harbour"],
  narsaq: ["helipad", "harbour"],
  nanortalik: ["helipad", "harbour"],
  qasigiannguit: ["helipad", "harbour"],
  qeqertarsuaq: ["helipad", "harbour"],
  kangaatsiaq: ["helipad", "harbour"],
  uummannaq: ["airport", "harbour"],
  upernavik: ["airport", "harbour"],
  qaanaaq: ["airport", "harbour"],
  kangerlussuaq: ["airport"],
  ittoqqortoormiit: ["airport", "harbour"],
  kangilinnguit: ["harbour"],
  narsarsuaq: ["airport", "harbour"],
}

function deriveArrivalPoints(seed: GreenlandLocationSeed): ArrivalPoint[] {
  const lt = inferLocationType(seed.type)
  if (lt === "nature") return []
  if (lt === "village") return ["harbour"]
  const key = seed.name_dk.toLowerCase()
  return CITY_ARRIVAL_POINTS[key] ?? ["harbour"]
}

export const GREENLAND_LOCATIONS: GreenlandLocation[] = GREENLAND_LOCATIONS_SEED.map((s) => ({
  ...s,
  location_type: inferLocationType(s.type),
  arrival_points: deriveArrivalPoints(s),
}))

// ─── UTILITY FUNCTIONS ───────────────────────────────────────────────────────

export function findLocation(query: string): GreenlandLocation | undefined {
  const q = query.toLowerCase().trim()
  return GREENLAND_LOCATIONS.find(
    (loc) =>
      loc.name_dk.toLowerCase() === q ||
      loc.name_gl.toLowerCase() === q ||
      loc.postal_code === q ||
      loc.aliases.some((a) => a.toLowerCase() === q)
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

/** Returnerer visningsnavn (name_dk) for en lowercase location-nøgle fra DB. */
export function getLocationName(key: string): string {
  if (!key) return key
  const byId = findLocationById(key)
  if (byId) return byId.name_dk
  const found = GREENLAND_LOCATIONS.find(
    (l) =>
      l.name_dk.toLowerCase() === key.toLowerCase() ||
      l.aliases.some((a) => a.toLowerCase() === key.toLowerCase()),
  )
  if (found) return found.name_dk
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export function getLocationsByType(locationType: LocationType): GreenlandLocation[] {
  return GREENLAND_LOCATIONS.filter((l) => l.location_type === locationType)
}

export function getArrivalPoints(locationId: string): ArrivalPoint[] {
  const composite = findLocationById(locationId)
  const loc = composite ?? findLocation(locationId)
  return loc ? [...loc.arrival_points] : []
}

export function isInByenCategory(locationId: string): boolean {
  const composite = findLocationById(locationId)
  const loc = composite ?? findLocation(locationId)
  if (!loc) return false
  return loc.location_type === "city" || loc.location_type === "village"
}

/** Alle lokationer for en given region_label */
export function getLocationsByRegion(regionLabel: string): GreenlandLocation[] {
  return GREENLAND_LOCATIONS.filter((l) => l.region_label === regionLabel)
}

/** Ét “anker” navn til region-chip (prioriter storby / folketal). */
export function representativeHubForRegion(regionLabel: string): string | null {
  const locs = getLocationsByRegion(regionLabel)
  if (!locs.length) return null
  const ranked = [...locs].sort((a, b) => {
    if (Boolean(b.is_major_hub) !== Boolean(a.is_major_hub)) {
      return Number(b.is_major_hub) - Number(a.is_major_hub)
    }
    return b.population - a.population
  })
  return ranked[0]?.name_dk ?? null
}

/** Alle unikke region_labels — til chips og regionssøgning */
export function getAllRegionLabels(): string[] {
  return [...new Set(GREENLAND_LOCATIONS.map((l) => l.region_label))].sort()
}
