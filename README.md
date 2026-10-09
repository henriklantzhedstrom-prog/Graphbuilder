# Graphbuilder

Rita grafmodeller (noder och relationer) direkt i webbläsaren, i stil med arrows.app, med tre tillägg:

- **Lager** – lägg noder, relationer, anteckningar och bilder i lager som i ett bildredigeringsprogram.
  Visa/dölj, lås, justera opacitet och ändra ordning.
- **Anteckningar** – fritextlappar på ritytan.
- **Bakgrundsbilder** – lägg in bilder som underlag och skala dem fritt.

Modeller sparas automatiskt i webbläsaren och kan sparas som JSON-filer. Export till JSON, Cypher
(Neo4j), SVG och PNG. Import av JSON från arrows.app.

## Kör lokalt

```
npm install
npm run dev
```

## Kvalitetskontroll

```
npm run check   # lint, typkontroll, enhetstester
npm run e2e     # end-to-end-tester i Chromium
npm run build   # produktionsbygge
```

CI kör samma kontroller på varje push och publicerar `main` till GitHub Pages.
