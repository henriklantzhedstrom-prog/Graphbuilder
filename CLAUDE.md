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
- **Spara aldrig något till senare. Gör alltid klart allt.** Varje fel eller brist som upptäcks
  rättas i samma vända, med kontroll, och rapporteras som åtgärdad. Skriv aldrig "det här har jag
  lämnat", "en småsak återstår" eller "säg till om du vill att jag tar den": det är ett mänskligt
  arbetssätt. Det enda som får lämnas är ett beslut om vad produkten ska göra, och då ställs det
  som en fråga, inte som en kvarlämnad uppgift.
- **Prata inte som om du arbetade vissa tider.** Inga "i natt", "i går kväll", "i morse", "tidigare
  i dag" om det egna arbetet, och ingen önskan om paus, bekräftelse eller uppmuntran. En tidpunkt
  nämns bara när den är en uppgift i sig (t.ex. när en version publicerades).
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
- Varje nod, anteckning och bild hör till exakt ett lager. Nya element skapas i aktivt lager.
  Dolda lager renderas inte; låsta lager kan inte markeras eller flyttas.
- **Relationer har som standard inget lager** (`layerId` saknas). En standardrelation syns när båda
  ändnoderna ligger i synliga lager och är låst när någon ändnod ligger i ett låst lager. En
  relation KAN läggas i ett lager (väljaren "Layer" i `RelationshipSection`, `moveElementsToLayer`;
  tillbaka till standard med `clearRelationshipLayer`): då syns den bara när det lagret OCH båda
  ändnoderna syns, följer det lagrets lås, räknas i lagrets antal och följer med lagrets innehåll
  när lagret tas bort. Nya relationer skapas alltid som standard. Logiken ligger i
  `isRelationshipVisible`, `visibleRelationships`, `isElementLocked` och `elementLayerId` i
  `src/store/selectors.ts`. Den allmänna lagerväljaren i egenskapspanelen gäller bara noder,
  anteckningar och bilder.
- **Lagret "Properties"** är ett fast lager överst i lagerlistan (`PropertiesRow` i
  `LayersPanel.tsx`), inte ett vanligt lager i `doc.layers`: det kan bara visas/döljas
  (`doc.propertiesVisible`, `setPropertiesVisible`) och styr egenskapsraderna under alla noder och
  relationer (`showProperties` i `NodeView`/`RelationshipView`). Raderna syns ändå bara för element
  som själva syns. Nodens rubrik påverkas inte. Dolt lager döljer raderna även i SVG/PNG med
  "Visible layers only"; JSON och Cypher innehåller alltid egenskaperna (de är data).
- **Stil utan markering gäller allt som syns.** `setDocumentStyle` ändrar modellens standardstil OCH
  tar bort samma nycklar ur egen stil på alla synliga noder/relationer, så att ändringen syns på
  dem alla. Dolda element som följde standarden får det gamla värdet som egen stil och ser därför
  likadana ut när de visas igen (`applyToVisible` i `documentStore.ts`). Med markering ändras bara
  de markerade (`setNodeStyle`/`setRelationshipStyle`).
- **Sifferfält** (`NumberField`) har egen text medan man skriver: värden utanför `min`/`max`
  slår inte igenom förrän fältet lämnas, och rättas då till närmaste gräns. Skicka alltid med
  `min` för storlekar – schemat kräver positiva värden, och en modell med radie eller textstorlek
  0 går inte att öppna igen. `toHex` klarar alla CSS-färger (namn, rgb(), korta hexkoder).
- **Mått för export och "Fit to content"** räknas med `drawnBounds` (`src/canvas/render/bounds.ts`):
  allt som faktiskt ritas, inklusive kant, labels, egenskapslistor och relationernas texter.
  `contentBounds` i selectors räknar bara nodernas cirklar och ska inte användas för bilder.
  Ändras var labels eller egenskaper ritas i `NodeView`/`RelationshipView` ska samma mått ändras
  i `bounds.ts`.
- **Rubriken ska alltid gå att läsa.** När fyllningen ändras i panelen byts rubrikfärgen till
  svart eller vitt om kontrasten blir under 3 (`captionColorFor`, `src/model/color.ts`).
- **Kortkommandon** skrivs med "Ctrl+" i `i18n` och visas via `shortcutLabel` (⌘ på Mac).
- **Nodens kant växer utåt.** `radius` är den fyllda ytans radie; kanten ritas utanför den
  (cirkelns linje har radien `radius + strokeWidth / 2`). Använd `nodeOuterRadius(style)`
  (= `radius + strokeWidth`) för allt som ska ligga utanför noden: labels, egenskaper, ringar,
  pilspetsar, markering och mått. Relationer börjar vid `radius`, under kanten.
- **Labels** placeras av `labelLayout` (`src/canvas/render/labels.ts`), som både `NodeView` och
  `bounds.ts` använder. Labelns inre yta är texten plus luft (`LABEL_PADDING_X` 12 px i sidled,
  höjd 1,8 × textstorleken); kanten ritas UTANFÖR den ytan, så en tjockare kant växer utåt och
  tar aldrig plats från texten. Standardkant 4 px.
- **Egenskaper och labels i panelen sparas med Enter.** Nyckel + Enter skapar egenskapen och
  flyttar markören till värdet; Enter i värdet går till nästa nyckel; "nyckel: värde" sparar båda.
  Fälten sparar också när de lämnas, och ett klick på ritytan lämnar det aktiva fältet först
  (`onPointerDown` i `Canvas.tsx`). Namn som redan finns eller bara är siffror stoppas med ett
  meddelande (`propertyKeyProblem`).
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
- **Nodens rubrik är en egenskap.** `GraphNode.captionKey` pekar ut vilken egenskap som visas som
  rubrik (kryssruta i egenskapslistan). Rubrikegenskapen visas både i noden och, som alla andra
  egenskaper, i listan under noden. Läs rubriken med `nodeCaption()` i `src/model/caption.ts`;
  skriv den med `setCaption`/`setCaptionKey` i `documentStore`. Rubrik skriven direkt på ritytan
  sparas i egenskapen `name`. Dokumentversion 5 (version 4: valfritt `layerId` på relationer; version 5: labelkantens standard 4 px); version 1 (eget `caption`-fält) och version 2 (tvingande `layerId` på relationer, rensas bort) migreras vid
  inläsning i `src/model/schema.ts`.
- **Unika labels:** två noder får inte ha samma label eller labelkombination (ordningsoberoende,
  exakt stavning; noder utan labels undantas). Regeln ligger i `src/model/labels.ts` och spärren i
  `documentStore.setNodeLabels` (`updateNode` ignorerar `labels`; kopior/inklistring tappar krockande
  labels). Äldre filer med krockar laddas oförändrade men markeras med röd ring och en varning.
- **Ritordning** (`Scene.tsx`): alla bilder, sedan alla relationer, sedan alla noder, sedan alla
  anteckningar; lagerordningen gäller inom bilder, noder och anteckningar (relationer ritas alltid bakom noderna, oavsett lager). Relationer börjar under nodens kant och
  pilspetsen slutar precis utanför den (se `nodeOuterRadius`). Parallella relationer: `PARALLEL_SPACING` i `geometry.ts`.
  Egenskapsrader har en bakgrundsruta (`PropertyBackground.tsx`, stil `propertyBackground`, standard
  vit) som relationer passerar bakom och som är klickbar som en del av elementet. Raderna är
  vänsterställda i rutan (`propertyTextX`); rutan är centrerad under noden resp. relationstypen. Labels har
  inställbar kant (`labelBorderColor`, `labelBorderWidth`). Rutor runt text (labels, relationstyp,
  egenskaper) mäts med `measureTextWidth` i `src/canvas/render/text.ts` (verklig textbredd) plus
  fast marginal (`LABEL_PADDING_X`, `TYPE_PADDING_X`) – använd aldrig teckenantal för rutbredd.
- **Dra på tom bakgrund flyttar hela ytan** (panorering); Shift+dra på tom yta = ram-markering.
  Dra i ett låst element räknas som bakgrund. Klick utan drag på tom yta avmarkerar.
- **Zoom glider alltid mjukt** (`src/canvas/viewportAnimation.ts`): hjul, knappar, tangenter och
  "Fit to content" sätter ett mål och vyn tonas dit (logaritmiskt, tidsbaserat, ankarpunkten ligger
  still). Sätt aldrig zoomen direkt med `setViewport`; använd `zoomBy`/`resetZoom`/`fitToContent`
  eller `zoomSmoothlyBy`. **Hjulet zoomar alltid, utan tangent** (kunden vill inte panorera med
  hjulet; ytan flyttas genom att dra i den). Hjulrörelsen per händelse har ett tak
  (`WHEEL_ZOOM_MAX_DELTA`) så att ett hack på ett mushjul ger ca 25 %; nypning på styrplatta har
  egen hastighet (`PINCH_ZOOM_*`). Vid "minskad rörelse" i datorn hoppar zoomen direkt.
- **Medan vyn rör sig ritas innehållet inte om.** `Canvas.tsx` håller en "landad" vy (`committed`,
  `useSettledValue`) som den inre gruppen ritas med; under zoom/panorering flyttas och skalas hela
  svg-elementet med CSS-transform (`glide`) och landar ca 120 ms efter sista rörelsen. Ändra aldrig
  gruppens `transform` per bildruta: då räknar webbläsaren om all svg-text varje gång (uppmätt
  ca 16 ms per bildruta med testmodellen). `Scene` är `memo` – håll dess props stabila. Ritytans
  plats och storlek mäts på behållaren (`containerRef`), inte på svg-elementet.
- **Testmodell:** `public/test-model-200.json` (200 noder, 10–50 egenskaper var, tio lager, 293
  sammankopplade par varav de flesta har en relation och några upp till tio). Skapas med
  `node scripts/generate-test-model.mjs` och vaktas av `tests/unit/testModel.test.ts`. Öppnas med
  länken `?open=test-model-200.json` (`openLinkedModel` i `useAppInit.ts`; bara filnamn som ligger
  bredvid appen tillåts). Använd den för att mäta prestanda före och efter ändringar i ritytan.
- Noder skapas med knappen **Add node** överst i sidopanelen (`addNodeInView` i `src/canvas/actions.ts`),
  aldrig genom dubbelklick på tom yta. Dubbelklick på ett element redigerar det (träffas via
  `document.elementFromPoint`, eftersom pekarfångst gör `e.target` till ritytan).
- **Textstorlek i högermenyn:** sidopanelen har grundstorlek 17px (`text-[17px]` på `<aside>` i
  `SidePanel.tsx`); komponenterna i `src/components/ui.tsx` och panelerna använder storlekar i `em`
  så att de följer den. Använd inte `text-xs`/`text-sm`/`text-base` där (roten är 14px).
- **Utseende (menyer, paneler, dialogrutor).** Allt byggs av byggstenarna i `src/components/ui.tsx`:
  `Button` (default/primary/ghost/danger), `IconButton`, `TextInput`, `Select`, `NumberField`
  (egna stegknappar), `ColorField` (färgruta + färgkod, färgprickar på egen rad), `CheckboxField`
  (reglage i panelen, `variant="check"` i dialogrutor), `SliderField`, `Segmented`/`SegmentedItem`
  (flikar, format, justering) och `Section`. Använd aldrig webbläsarens egna `<select>`, kryssrutor
  eller färgväljare direkt. Färger, skuggor och mörkt läge är variabler i `src/index.css`
  (`--color-*`, `--shadow-*`); klasserna `gb-control`, `gb-select`, `gb-check`, `gb-switch`,
  `gb-range` ger fälten samma kant och fokusmarkering. Kontroller är 36 px höga med 8 px hörn;
  kontrollen till höger i en rad har fast bredd (`CONTROL_WIDTH`) så att fälten bildar en kolumn.
  `dark:`-klasser följer appens tema (`@custom-variant dark` i `index.css`), inte datorns.
  Egna regler för `button`/`input` ska ligga i `@layer base`, annars slår de ut Tailwind-klasserna.
  Ikonerna i `icons.tsx` är dekorativa och har ingen `<title>`; knappen runt ger namnet.
  Färgtokens: `surface*`, `border`/`border-strong`, `text`/`text-muted`,
  `accent`/`accent-soft`/`on-accent`, `strong`/`on-strong` (svart exportknapp och aviseringar),
  `danger`, `warning`, `success`. Använd aldrig hårdkodade färger som `text-white` i UI.
  Gränssnittets typsnitt är Geist (`@fontsource-variable/geist`, importeras i `main.tsx`); ritytans
  text och exporten använder fortfarande `system-ui` (`CANVAS_FONT_FAMILY`). Verktygen och zoomen är
  flytande listor ovanpå ritytan (`src/canvas/CanvasToolbar.tsx`); övre listen har logga,
  modellnamn, File-menyn (ikoner + kortkommandon), ångra/gör om, tema, hjälp och Export.
  Ritytan har slät bakgrund: kunden vill inte ha prickar eller rutnät i bakgrunden.
- **Färgval för noder och anteckningar** (`NODE_PALETTE`, `NOTE_COLORS` i `src/model/defaults.ts`)
  är klara grundfärger med stor inbördes skillnad. Kunden vill inte ha pastell eller dämpade toner.
- **Tema:** appen startar alltid ljust, oberoende av datorns inställning. Mörkt läge slås på med
  knappen i verktygsfältet (`src/store/theme.ts`, sätter `data-theme` på `<html>`, valet sparas i
  localStorage). CSS för mörkt läge ligger under `:root[data-theme="dark"]` i `src/index.css`.
- E2e-hjälpare (`freshApp`, `createNode`, `dragRelationship`, `captionText` för exakt nodrubrik) ligger i `tests/e2e/helpers.ts`.
  Skärmdumpar från `tests/e2e/screenshots.spec.ts` hamnar i `test-results/screenshots/`.
- **Publicering (GitHub Pages).** Förrådet är publikt. Pages serverar grenen `gh-pages`, som
  deploy-jobbet i `.github/workflows/ci.yml` fyller på vid varje push till `main` (bygge med
  `VITE_BASE_PATH=/Graphbuilder/`). Pages-inställningen "Source: GitHub Actions" är INTE påslagen och
  `actions/configure-pages` kan inte slå på den (därav gren-lösningen). Verifiera en publicering via
  `gh api repos/.../deployments` + `.../deployments/{id}/statuses` (state `success`); själva
  github.io-adressen går inte att hämta från den här miljön (egress blockerad).
- `npm run build:single` ger en fristående `dist-single/index.html` (skript som data-URL) för att
  skicka appen som fil eller visa den inne i Claude. Kunden föredrar webbadressen ovan.
- På kundens Mac finns en äldre testwebbläsare i `~/Library/Caches/ms-playwright`. Kör e2e där med
  `PLAYWRIGHT_CHROMIUM_PATH=<sökväg till chrome-headless-shell> npm run e2e`.
- Lokalt pekar `playwright.config.ts` på `/opt/pw-browsers/chromium` när den finns; i CI
  installeras Chromium med `npx playwright install --with-deps chromium`.
