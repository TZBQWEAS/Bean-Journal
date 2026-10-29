<p align="center">
  <img src="docs/images/logo.svg" width="88" height="88" alt="Bean Journal · 豆间" />
</p>
<h1 align="center">Bean Journal · 豆间</h1>
<p align="center">
  <a href="README.md">[ 简体中文 ]</a> | <a href="README.en.md">[ English ]</a>
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

## Docker deployment

From the project directory, with Docker Desktop or Docker Engine and Compose installed:

```sh
docker compose up -d --build
```

Open **http://localhost:8080**. Stop the service with `docker compose down`.

Alternatively, build and run the image directly:

```sh
docker build -t bean-journal:1.0 .
docker run -d --name bean-journal -p 127.0.0.1:8080:8080 --restart unless-stopped bean-journal:1.0
```

The image uses a version- and digest-pinned [official Nginx Alpine image](https://hub.docker.com/_/nginx), runs as a non-root user, listens on container port `8080`, and provides `/healthz`. It includes only static site files and server configuration, without development dependencies, screenshots or payment QR codes. See the [Dockerfile reference](https://docs.docker.com/reference/dockerfile/) for build instructions.

The published port is bound to localhost by default. For a server deployment, place an HTTPS reverse proxy in front of it. Plain HTTP on a LAN IP may lack the secure context required for Web Locks and saving. To change the host port, change only the left side, for example `127.0.0.1:8088:8080`.

**Docker does not move your data to the server.** Beans, photos and brews remain in browser storage; no data volume is needed. Export a backup before changing the domain, protocol or port, then import it at the new address.

Export and load an image for offline deployment:

```sh
docker save -o bean-journal-1.0.tar bean-journal:1.0
docker load -i bean-journal-1.0.tar
```

The exported image must match the target architecture. This local build targets `linux/amd64`; build from source on the target machine for another architecture.

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
README.md              Simplified Chinese documentation (default)
README.en.md           English documentation
README.zh-CN.md         Simplified Chinese compatibility copy
```

## Storage & deployment

All records and photos are stored in **this browser's localStorage**. **There is no cloud sync.** To move to another browser or domain, export a backup from Settings and import it at the destination. Browser cleanup and storage limits can affect your data; keep regular backups.

Use a modern browser supporting **Web Locks**. Deploy over **HTTPS**; use localhost or 127.0.0.1 for development. Independent additions from multiple tabs are merged, while conflicting edits to the same record are rejected with a prompt to reopen it.

Deploy `dist/` as the static site directory. No API keys or server environment variables are needed. This repository excludes Sites hosting identity, deployment credentials and personal backup files.

Map markers indicate approximate countries or regions, not individual farms. Unrecognized origins are listed for clarification. Photos are compressed locally and displayed only in bean details. Google Fonts falls back to local fonts when unavailable; the map does not need an online map API.

## Support the project

If Bean Journal helps you enjoy your coffee routine, you can buy me a coffee to support its maintenance and development. Thank you!

**[☕ Buy Me a Coffee](https://buymeacoffee.com/tzbqweas)**

You can also scan a WeChat Pay or Alipay code below. Click an image to view the original.

<table>
  <tr><th align="center">WeChat Pay</th><th align="center">Alipay</th></tr>
  <tr>
    <td align="center"><a href="docs/donate/wechat.jpg"><img src="docs/donate/wechat.jpg" width="240" alt="WeChat Pay donation QR code" /></a></td>
    <td align="center"><a href="docs/donate/alipay.jpg"><img src="docs/donate/alipay.jpg" width="240" alt="Alipay donation QR code" /></a></td>
  </tr>
</table>

Donations are entirely optional and do not affect access to any features.

## Version & credits

Current version: **v1.0**. See [CHANGELOG.md](CHANGELOG.md) for the release notes and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party resources and licenses.
