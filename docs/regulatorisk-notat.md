# Sila.gl — Regulatorisk notat

**Udarbejdet:** 1. oktober 2026 · **Status:** Arbejdsnotat — ikke juridisk rådgivning.
**Formål:** Samle de regler, der påvirker hytteudlejning, samsejlads og oplevelser i Grønland, og skelne mellem
**(D) dokumenteret krav**, **(F) min fortolkning**, **(U) usikkert** og **(A) kræver afklaring hos myndighed/rådgiver**.

---

## 1. Passagersejlads (samsejlads, transfer, transport)

| # | Punkt | Status |
|---|-------|--------|
| 1.1 | Har et fartøj **flere end 12 passagerer**, betragtes det som et **passagerskib** med de krav, det medfører (bl.a. syn). | **D** — Søfartsstyrelsen, gengivet af [Minbåd.dk](https://minbaad.dk/nyhed/archive/2023/22/june/article/soefartsstyrelsen-har-du-mere-end-12-gaster-ombord-er-det-et-passagerskib/) |
| 1.2 | Erhvervsmæssig sejlads med **op til 12 passagerer** i fartøjer under 15 m er reguleret af **BEK nr. 956 af 26/09/2012**. Bekendtgørelsen gælder også i Grønland (via anordning). | **D** — [BEK 956](https://www.retsinformation.dk/eli/lta/2012/956); Grønlands Maritime Center henviser til samme bekendtgørelse for 12-pax-fartøjer i Grønland ([maritim.gl](https://maritim.gl/maritim_event/erhvervsduelighedsbevis-for-12pax-fartoejer/)) |
| 1.3 | Rederen skal have en **skriftlig sikkerhedsinstruks** (aktiviteter, risici, fartøj, besætningens kvalifikationer, begrænsninger for område/sæson/vejr/temperatur/antal passagerer, nødprocedurer). | **D** — BEK 956 § 4 |
| 1.4 | Alle om bord skal have **sikkerhedsinstruktion før afgang**. | **D** — BEK 956 § 4, stk. 11 |
| 1.5 | **Antallet af personer om bord skal være kendt og opbevares i land**. | **D** — BEK 956 § 4, stk. 10 |
| 1.6 | **Redningsvest til alle**; redningsflåde/-båd med kapacitet til alle (afhængigt af fartøj). | **D** — BEK 956, bilag I |
| 1.7 | Fører: for fartøjer med dimensionstal ≥ 20 eller motor > 100 kW kræves erhvervsduelighedsbevis (12 pax, begrænset til Grønland). | **D** — maritim.gl; besætningskrav i ny grønlandsk bekendtgørelse fra 1.1.2025 ([høringsudkast](https://naalakkersuisut.gl/-/media/horinger/2024/09/0209_besaetningsfastsaettelse/bekendtgrelse-om-bestningsfaststtelse-i-mindre-erhvervsfartjer-som-medtager-op-til-12-passagerer-dk.pdf)) |
| 1.8 | **Hvornår er samsejlads "erhvervsmæssig"?** Søfartsstyrelsen lægger vægt på, om gæsten **køber en oplevelse/tur** (erhverv) eller blot **deler udgifter** på en tur, sejleren alligevel skulle (fritid). Begrænset betaling taler imod erhverv. | **D** for Danmark (citat via Minbåd.dk) — **U** for Grønland |
| 1.9 | Når en sejler selv sætter prisen, og Sila tager 17 % i gebyr, ligner det et køb af transport — ikke ren udgiftsdeling. | **F** |
| 1.10 | Om private sejlere må tage betaling via Sila uden at opfylde BEK 956, og om Sila selv har ansvar som formidler. | **A** — Søfartsstyrelsen (sejler i grønlandske farvande) |

**Hvad er bygget på baggrund af dette:**
- Hårdt loft: **max 12 passagerer** pr. tur (DB-constraint + server-validering) og aldrig over bådens kapacitet.
- Sejleren skal **bekræfte** redningsvest til alle, sikkerhedsinstruks, vejrforbehold og kendskab til reglerne før en tur kan oprettes.
- **Passagerliste** til sejleren (`/dashboard/sejlads/[id]`), print-venlig, med antal om bord inkl. fører — så den kan efterlades i land.
- Bådprofil har nu felter for **erhvervsstatus, længde, registrering, fartstilladelse/syn-reference og førerbevis** (`boats.operator_type` m.fl.). Endnu ikke vist i bådformularen — se åbne punkter.

## 2. Turisme — Inatsisartutlov nr. 62 af 25.11.2024 om turistvirksomhed

| # | Punkt | Status |
|---|-------|--------|
| 2.1 | Turistvirksomhed = økonomisk aktivitet, der tilbyder **oplevelser** fortrinsvis til turister som **dagsture eller flerdagsture**. Kræver **licens** fra Naalakkersuisut. | **D** — [lovtekst](https://nalunaarutit.gl/groenlandsk-lovgivning/2024/inatsisartutlov-nr-62-af-25_11_2024?sc_lang=da), § 2–3 |
| 2.2 | **Bagatelgrænse:** ingen licens hvis omsætningen fra turistvirksomhed ≤ 50.000 kr./år. | **D** — § 3, stk. 6 |
| 2.3 | **Ren persontransport** til/fra og i Grønland uden turistvirksomhed er undtaget (bemærkningerne nævner fx lufthavnstransfer). | **D** — § 1, stk. 4 + [bemærkninger](https://nalunaarutit.gl/-/media/lovfiler/2024/forarbejder/ina_62/ina_62_2024_bemaerkninger_da.pdf) |
| 2.4 | Licens kræver bl.a. bopæl og fuld skattepligt i Grønland (personer) eller ≥ 2/3 lokalt ejerskab (selskaber), samt **sikkerhedsplan med risikovurdering og nødprocedurer**. | **D** — § 7–9 |
| 2.5 | Virksomheder, der drev turisme før 1.1.2025, har **overgang til 1.1.2027**. Nye skal have licens før start. | **D** — § 18; [Naalakkersuisut](https://naalakkersuisut.gl/Nyheder/2025/01/1301_turistvirksomhed?sc_lang=da) |
| 2.6 | Hytteudlejning alene er ikke en "oplevelse" og kræver ikke turistlicens (bemærkningerne skelner hoteldrift fra oplevelser). | **F** |
| 2.7 | En samsejlads A→B er persontransport; en bådtur med sightseeing/fiskeri er en oplevelse. | **F** |
| 2.8 | Om **Sila selv** driver turistvirksomhed, hvis Sila sælger pakker (hytte + transport + oplevelse) i ét checkout. Loven nævner ikke platforme. | **A** — Departementet for Erhverv (Naalakkersuisut) |

**Bygget:** felter `experiences.tourism_license_status` (`licensed` / `applied` / `below_threshold`) og `tourism_license_ref`. Formular-felt mangler endnu (se åbne punkter).

## 3. Betaling og udbetaling

| # | Punkt | Status |
|---|-------|--------|
| 3.1 | Stripe Connect cross-border payouts understøttes kun mellem platforme og konti i **US, UK, EØS, Canada og Schweiz**. Grønland er ikke EØS. | **D** — [Stripe docs](https://docs.stripe.com/connect/cross-border-payouts) |
| 3.2 | Sila opretter Express-konti med `country: "DK"`. Om en grønlandsk udbyder med **GL-IBAN** (fx Grønlandsbanken) kan gennemføre onboarding på en DK-konto, er ikke dokumenteret. | **U** — **kritisk**: hvis nej, kan lokale udbydere ikke få udbetalt |
| 3.3 | Refusioner: Sila bruger destination charges; refusion med `reverse_transfer` + `refund_application_fee` er implementeret. | **D** (teknisk) |

**Næste skridt:** test onboarding med én rigtig grønlandsk udbyder og en GL-bankkonto i Stripe test-mode — eller spørg Stripe support direkte.

## 4. Moms og skat

| # | Punkt | Status |
|---|-------|--------|
| 4.1 | Grønland er uden for EU's momsområde. En dansk virksomheds ydelser, der benyttes uden for EU, pålægges som udgangspunkt ikke dansk moms (B2B, brugskriterium). | **D** — [BDO](https://www.bdo.dk/da-dk/faglig-info/groenland/hvornaar-skal-der-moms-paa-en-faktura-fra-danmark-til-en-virksomhed-i-groenland) |
| 4.2 | Momsbehandling af Silas **gebyr over for forbrugere** (12 % servicegebyr) og leveringssted for formidling af ophold/transport i Grønland. | **A** — revisor |
| 4.3 | **DAC7** (indberetning af sælgere for danske platforme): om udbydere bosat i Grønland og ejendomme i Grønland er omfattet. Skats Q&A svarer ikke. | **A** — Skattestyrelsen, tlf. 72 38 02 10 ([Q&A](https://skat.dk/erhverv/ekapital/platformsoekonomi/qa-om-dac7)) |
| 4.4 | Udbyderes indkomst beskattes efter grønlandske regler (Skattestyrelsen i Grønland). Sila bør oplyse om det i udbyderguiden, ikke rådgive. | **F** |

## 5. Persondata

| # | Punkt | Status |
|---|-------|--------|
| 5.1 | Er Sila etableret i Danmark, gælder GDPR for Silas behandling, uanset at brugerne er i Grønland. | **F** (art. 3, stk. 1) |
| 5.2 | Passagerlister indeholder navn og telefon. Adgang er begrænset til sejleren via RLS + `get_contact_info_for_booking`; siden har `noindex`. | **D** (teknisk) |
| 5.3 | Kontaktinfo vises kun efter betaling og udløber 3 dage efter (`contact_info_visible_until`). Hullet, hvor brugere kunne sætte feltet selv, er lukket (migration 20261001100000). | **D** (teknisk) |

## 6. Sikkerhed i praksis (ikke lovkrav, men god praksis)

- Informér altid nogen i land om rute og forventet ankomst; VHF kanal 16 til nødkald; arktisk overlevelsesdragt anbefales i små åbne både; vær forsigtig ved isfjelde. — [Visit Greenland](https://visitgreenland.com/how-to-travel-safely-in-greenland/)
- GREENPOS og KYSTKONTROL er kun obligatoriske for større skibe (KYSTKONTROL: ≥ 20 BT) — ikke for typiske samsejladsbåde. — [navigation.gl](https://eng.navigation.gl/radio-reporting-services/)

## 7. Tidszone (teknisk, men med reel konsekvens)

Grønland skiftede tidszone i 2023. Siden 2024 er Nuuk **UTC-2 om vinteren og UTC-1 om sommeren** ([timeanddate](https://www.timeanddate.com/news/time/greenland-change-timezone-2024.html)).
Koden antog fast UTC-3 → afgangstider blev gemt 1–2 timer forkert. Rettet i `src/lib/nuukTime.ts`.

---

## Åbne spørgsmål til myndigheder

1. **Søfartsstyrelsen:** Må en privat sejler tage betaling via en platform for ledige pladser på en tur, sejleren alligevel skulle, uden at båden er godkendt efter BEK 956? Er der en beløbsgrænse for "udgiftsdeling"? Har platformen et selvstændigt ansvar?
2. **Departementet for Erhverv (Naalakkersuisut):** Er en platform, der formidler (ikke selv udfører) oplevelser, omfattet af licenskravet? Ændrer det sig, hvis Sila sælger hytte + transport + oplevelse i ét samlet køb?
3. **Stripe:** Kan en udbyder med bopæl i Grønland og GL-IBAN onboardes på en DK Express-konto?
4. **Skattestyrelsen + revisor:** DAC7-omfang for grønlandske sælgere/ejendomme; moms på servicegebyr over for forbrugere.
