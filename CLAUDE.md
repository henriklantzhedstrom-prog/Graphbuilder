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
npm run check      # lint + typecheck + enhetstester – ska vara grönt före varje commit
npm run e2e        # Playwright (bygger och startar preview själv)
npm run build      # produktionsbygge till dist/
```

Chromium för Playwright finns i `/opt/pw-browsers`; kör aldrig `playwright install`.

## Konventioner

- Mappstruktur: `src/model` (typer, schema, geometri), `src/store` (Zustand-stores, selectors,
  persistence), `src/canvas` (SVG-rityta och interaktioner), `src/panels` (UI-paneler),
  `src/export` (import/export), `src/components` (små UI-byggstenar), `src/i18n/sv.ts` (alla texter).
- **Alla ändringar av dokumentet går via `documentStore`** så att ångra/gör om och autospar täcker allt.
- **Alla UI-texter ligger i `src/i18n/sv.ts`.** Inga hårdkodade strängar i komponenter.
- Varje element (nod, relation, anteckning, bild) hör till exakt ett lager. Nya element skapas i
  aktivt lager. Dolda lager renderas inte; låsta lager kan inte markeras eller flyttas.
- Varje ny funktion levereras med enhetstest (`tests/unit`) och, när den har UI, e2e-test (`tests/e2e`).
- Commit-meddelanden: en kort rad i imperativ på engelska (`Add layers panel`), sedan valfri brödtext.
- Importera med alias `@/` för `src/`.
