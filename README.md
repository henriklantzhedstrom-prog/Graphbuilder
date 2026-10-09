# Graphbuilder

Rita grafmodeller (noder och relationer) direkt i webbläsaren, i stil med arrows.app, med tre tillägg:

- **Lager** – lägg noder, relationer, anteckningar och bilder i lager som i ett bildredigeringsprogram.
  Visa/dölj, lås, justera opacitet och ändra ordning. Nya element hamnar i det aktiva lagret.
- **Anteckningar** – fritextlappar på ritytan med färg, textstorlek och justering.
- **Bakgrundsbilder** – lägg in bilder (knapp, drag-och-släpp eller klistra in) som underlag,
  skala dem proportionellt, ställ in opacitet och lås dem.

![Graphbuilder](docs/screenshot.png)

## Funktioner

- Skapa noder med dubbelklick, dra relationer från nodens ring (släpp på tom yta ger en ny nod).
- Rubrik, labels och egenskaper på noder; typ, riktning och egenskaper på relationer.
- Stil per element eller för hela modellen: färger, radie, kantbredd, textstorlekar, streckade linjer.
- Markera med klick, Shift+klick eller ram; flytta med drag eller piltangenter; snapplinjer.
- Ångra/gör om, duplicera, kopiera/klistra in, tangentbordsgenvägar (tryck `?` i appen).
- Modeller sparas automatiskt i webbläsaren. "Mina modeller" hanterar flera modeller.
- Spara/öppna som JSON-fil. Import av JSON från arrows.app.
- Export till JSON, Cypher (Neo4j `CREATE`-satser), SVG och PNG, valfritt bara synliga lager.
- Ljust och mörkt tema följer systeminställningen.

## Kör lokalt

```
npm install
npm run dev
```

## Kvalitetskontroll

```
npm run check   # lint, typkontroll, enhetstester
npm run e2e     # end-to-end-tester i Chromium (bygger och startar appen själv)
npm run build   # produktionsbygge till dist/
```

CI kör samma kontroller på varje push. Push till `main` publicerar appen till GitHub Pages
(kräver att Pages är aktiverat med källan "GitHub Actions" under repots inställningar).
