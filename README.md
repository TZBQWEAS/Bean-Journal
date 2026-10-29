<p align="center">
  <img src="docs/images/logo.svg" width="88" height="88" alt="Bean Journal · 豆间" />
</p>
<h1 align="center">Bean Journal · 豆间</h1>
<p align="center">
  <a href="README.zh-CN.md">[ 简体中文 ]</a> | <a href="README.md">[ English ]</a>
</p>

<p align="center">A little ritual, every day. Keep your beans, brews and favorite recipes in one place.</p>
<p align="center"><strong>v1.0 · English / 简体中文 · Light & dark themes · Browser-local storage</strong></p>

Bean Journal is a personal coffee notebook built with plain HTML, CSS and JavaScript. Collect bean cards, record each cup and keep reusable recipes—without a backend or build step.

## Screenshots

Real screenshots provided by the project owner, showing the Chinese interface with sample bean cards. Click any image to view the original resolution.

### Dashboard & brew calendar

Track your brewing days, monthly coffee usage and recent cups.

[![Dashboard with a brew calendar and monthly overview](docs/images/dashboard.png)](docs/images/dashboard.png)

### Bean collection

Keep origins, roast levels, processing methods and flavor notes together. Uploaded photos appear in bean details.

[![Bean cards with distinct roast illustrations](docs/images/bean-cards.png)](docs/images/bean-cards.png)

### Origin map

Explore bean origins on the map and hover over a marker to see the associated bean cards.

[![Origin map with a bean-card tooltip](docs/images/origin-map.png)](docs/images/origin-map.png)

## Features

- **Dashboard:** overview, brew calendar, daily records, monthly summaries and recent brews.
- **Bean cards:** origin, roast level, processing method, single origin or blend, flavor notes and detail photos.
- **Brew journal:** actual grind setting, dose, yield or water weight, extraction time, temperature, rating and tasting notes for each cup.
- **Favorite recipes:** reusable target parameters, equipment and instructions. Select a recipe while brewing, view its steps and adjust the actual values independently.
- **Equipment:** add, rename or deactivate coffee machines and grinders. Historical brews retain their equipment-name snapshots.
- **Origin map:** group bean cards by recognized countries and regions, with hover details.
- **Preferences & backup:** English and Simplified Chinese, light and dark themes, JSON import and export including photos.
- **History preservation:** deleting a bean card keeps its associated brew records. Legacy favorites migrate to recipes.

## Quick start

Install **Node.js 22 or later**, then run from the project directory:

```sh
npm start
```

Open **http://127.0.0.1:8080**. The local server uses only built-in Node.js modules, so dependencies are not required just to run the app. Use the HTTP server instead of opening the HTML file directly.

## Development

```sh
npm ci
npm test
npm run format
```

The jsdom regression tests cover settings, translations, photos, legacy data, maps, calendars, equipment, recipes, backup validation, preserved history and concurrent-tab conflicts. They do not replace real-browser visual or file-upload checks.

## Project layout

```text
dist/                  Deployable static source; no build step
  index.html           Page structure
  style.css            Base styles
  enhancements.css     Themes, maps and dashboard styles
  app.js               Bean forms, persistence and backups
  preferences.js       Language, theme and photo handling
  samples.js           Localized sample bean cards
  map-data.js          Natural Earth map data
  origin-map.js        Origin matching and map interaction
  dashboard.js         Calendar, summaries and recent brews
  workbench.js         Equipment, recipes, brew records and migration
  licenses/            Bundled third-party licenses
docs/images/           Project logo and original screenshots
scripts/serve.cjs      Local HTTP server
tests/                 Regression tests
README.md              English documentation (default)
README.zh-CN.md         Simplified Chinese documentation
```

## Storage & deployment

All records and photos are stored in **this browser's localStorage**. **There is no cloud sync.** To move to another browser or domain, export a backup from Settings and import it at the destination. Browser cleanup and storage limits can affect your data; keep regular backups.

Use a modern browser supporting **Web Locks**. Deploy over **HTTPS**; use localhost or 127.0.0.1 for development. Independent additions from multiple tabs are merged, while conflicting edits to the same record are rejected with a prompt to reopen it.

Deploy `dist/` as the static site directory. No API keys or server environment variables are needed. This repository excludes Sites hosting identity, deployment credentials and personal backup files.

Map markers indicate approximate countries or regions, not individual farms. Unrecognized origins are listed for clarification. Photos are compressed locally and displayed only in bean details. Google Fonts falls back to local fonts when unavailable; the map does not need an online map API.

## Version & credits

Current version: **v1.0**. See [CHANGELOG.md](CHANGELOG.md) for the release notes and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party resources and licenses.
