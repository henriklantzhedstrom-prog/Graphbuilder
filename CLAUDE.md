# Graphbuilder – instruktioner för Claude

## Arbetsöverenskommelse med kunden

- **Kommunicera som en produktägare med en kund.** Prata om funktioner, nytta och resultat,
  inte om teknik. Ställ bara frågor som handlar om *vad* produkten ska göra, aldrig *hur*.
  Rapportera på produktnivå: vad som nu går att göra i appen och var det kan testas.
- **Alla tekniska vägval tas av Claude.** Välj alltid det som är bäst och mest framtidssäkert.
  Motivera kort om kunden frågar, men be aldrig kunden välja mellan tekniska alternativ.
- **Bygg aldrig prototyper.** Inga PoC:ar, inga "tillfälliga" lösningar, inget "MVP först".
  Allt som byggs är produktionskvalitet med tester från start.
- **AI-först arbetssätt.** Arbetet är organiserat för en AI-agent, inte för människor:
  - Automatisera allt som går: lint, typkontroll, enhetstester, e2e-tester, build och deploy körs i CI.
  - Verifiera med automatiska tester och skärmdumpar från Playwright, inte med manuella klick.
  - Håll `CLAUDE.md` och `README.md` uppdaterade så att varje ny session kan fortsätta utan att fråga om.
  - Leverera hela funktioner i ett svep: kod, tester, texter och dokumentation tillsammans.
- **Låna inga mänskliga arbetssätt.** Inga tidsuppskattningar i dagar eller veckor, inga sprintar,
  inga pauser, inget "vi tar det i nästa iteration". Omfattning och kvalitet är det enda som styr.
- **Aldrig IT-jargong.** Skriv till kunden som till en person utan teknisk bakgrund. Inga facktermer
  som repo, branch, merge, commit, deploy, CI, API, backend, PR, Pages, build, lint, test-svit.
  Säg i stället "koden", "versionen", "lägga ihop", "spara", "publicera", "automatisk kontroll",
  "inställning". Måste en teknisk sak nämnas, förklara den med en vardaglig liknelse i samma mening.
  Gäller alla svar, rapporter och frågor till kunden.
- **Kunden gör aldrig något tekniskt.** Kunden klonar inget, kör inga kommandon, ändrar inga
  inställningar och lägger inte ihop versioner. Allt sådant sköter Claude och levererar en länk eller
  ett resultat. Kräver något ett beslut av kunden (t.ex. om koden får vara öppen för alla) ställs det
  som ett val i vardagsspråk, aldrig som en instruktion att göra något. Får Claude fria händer
  ("gör som du tycker") tas beslutet och motiveras i en mening.
- **Inga frågor om publicering, synlighet eller verktygsval.** Kunden har sagt ifrån: Claude
  beslutar sådant själv, genomför, och nämner beslutet i en mening i rapporten. Det enda som får
  stoppa är en teknisk spärr som Claude inte råder över; då beskrivs det enda klick kunden behöver
  göra, i vardagsspråk, utan alternativ att välja mellan.
- **Leverans = länk.** En funktion räknas som levererad först när kunden kan öppna den i webbläsaren
  via en länk som Claude ger. Länken till den publicerade appen står i `README.md` under
  "Testa appen" och uppdateras (samma länk, ny version) vid varje leverans.

## Vad appen är

En webbapp för att rita grafmodeller (noder och relationer) i stil med arrows.app, med tre tillägg:
**lager** (som i bildredigering), **anteckningar** och **bakgrundsbilder**. Ingen backend; modeller
sparas lokalt i webbläsaren och som JSON-filer. Export till JSON, Cypher, SVG och PNG.

## Teknisk stack

React 19, TypeScript (strict), Vite 8, Tailwind CSS 4, Zustand 5 + immer + zundo (ångra/gör om),
zod 4 (dokumentschema), idb-keyval (IndexedDB), Biome (lint/format), Vitest (enhet), Playwright (e2e).
Egen SVG-renderare, inget diagrambibliotek.

## Kommandon

```
npm run dev        # utvecklingsserver
npm run build:single  # en enda html-fil i dist-single/ för publicering som egen sida
npm run check      # lint + typecheck + enhetstester – ska vara grönt före varje commit
npm run e2e        # Playwright (bygger och startar preview själv)
npm run build      # produktionsbygge till dist/
```

Chromium för Playwright finns i `/opt/pw-browsers`; kör aldrig `playwright install`.

## Konventioner

- Mappstruktur: `src/model` (typer, schema, geometri), `src/store` (Zustand-stores, selectors,
  persistence), `src/canvas` (SVG-rityta och interaktioner), `src/panels` (UI-paneler),
  `src/export` (import/export), `src/components` (små UI-byggstenar), `src/i18n/en.ts` (alla texter).
- **Alla ändringar av dokumentet går via `documentStore`** så att ångra/gör om och autospar täcker allt.
- **Appen är på engelska. Alla UI-texter ligger i `src/i18n/en.ts`** och importeras via `@/i18n`.
  Inga hårdkodade strängar i komponenter, modell eller export (felmeddelanden under `t.errors`).
  Kommunikationen med kunden är på svenska; appen och koden på engelska.
- Varje element (nod, relation, anteckning, bild) hör till exakt ett lager. Nya element skapas i
  aktivt lager. Dolda lager renderas inte; låsta lager kan inte markeras eller flyttas.
- Varje ny funktion levereras med enhetstest (`tests/unit`) och, när den har UI, e2e-test (`tests/e2e`).
- Commit-meddelanden: en kort rad i imperativ på engelska (`Add layers panel`), sedan valfri brödtext.
- Importera med alias `@/` för `src/`.
- Läs aldrig `doc` från en sparad `getState()`-ögonblicksbild efter en mutation – hämta
  `useDocumentStore.getState().doc` på nytt. Nya modeller skapas via `createAndOpenNewDocument()`
  i `src/store/persistence.ts`, som också sparar och sätter "senast öppnad".
- Filer sparas som nedladdning och öppnas via ett dolt `<input type="file">` (inte File System
  Access API) så att det fungerar i alla webbläsare och går att testa med Playwright.
- Ritytans vyer i `src/canvas/render` är rena komponenter utan store-hooks; samma komponenter
  renderar SVG-exporten via `renderToStaticMarkup`. Inga `foreignObject` i visningsläge.
- E2e-hjälpare (`freshApp`, `createNode`, `dragRelationship`) ligger i `tests/e2e/helpers.ts`.
  Skärmdumpar från `tests/e2e/screenshots.spec.ts` hamnar i `test-results/screenshots/`.
- **Publicering (GitHub Pages).** Förrådet är publikt. Pages serverar grenen `gh-pages`, som
  deploy-jobbet i `.github/workflows/ci.yml` fyller på vid varje push till `main` (bygge med
  `VITE_BASE_PATH=/Graphbuilder/`). Pages-inställningen "Source: GitHub Actions" är INTE påslagen och
  `actions/configure-pages` kan inte slå på den (därav gren-lösningen). Verifiera en publicering via
  `gh api repos/.../deployments` + `.../deployments/{id}/statuses` (state `success`); själva
  github.io-adressen går inte att hämta från den här miljön (egress blockerad).
- `npm run build:single` ger en fristående `dist-single/index.html` (skript som data-URL) för att
  skicka appen som fil eller visa den inne i Claude. Kunden föredrar webbadressen ovan.
- Lokalt pekar `playwright.config.ts` på `/opt/pw-browsers/chromium` när den finns; i CI
  installeras Chromium med `npx playwright install --with-deps chromium`.
