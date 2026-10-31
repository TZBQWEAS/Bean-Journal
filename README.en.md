<p align="center">
  <img src="docs/images/logo.svg" width="88" height="88" alt="Bean Journal · 豆间" />
</p>
<h1 align="center">Bean Journal · 豆间</h1>
<p align="center">
  <a href="README.md">[ 简体中文 ]</a> | <a href="README.en.md">[ English ]</a>
</p>

<p align="center">A little ritual, every day. Keep your beans, brews and favorite recipes in one place.</p>
<p align="center"><strong>v1.3 · SQLite synchronization · English / 简体中文 · Light & dark themes</strong></p>

Bean Journal is a personal coffee notebook built with plain HTML, CSS and JavaScript. Collect bean cards, record each cup and keep reusable recipes. The current source supports an integrated Node.js / SQLite deployment as well as static hosting.

## v1.3

Self-hosted SQLite synchronization, expanded equipment information and consistent date inputs. Read the [bilingual release notes](docs/releases/v1.3.md) and [changelog](CHANGELOG.md).

**Upgrade from v1.2:** export a JSON backup from each old browser before upgrading. Import the chosen backup into v1.3; import replaces the shared journal. Other devices then access the same instance. Legacy browser data is retained, not automatically merged or continuously synchronized.

## Screenshots

Real screenshots provided by the project owner. Desktop and phone screenshots show the English interface. All three desktop images use matching 2548 × 1351 canvases, with their full content preserved. Click any image to view it in full.

### Dashboard & brew calendar

Track your brewing days, monthly coffee usage and recent cups.

[![Dashboard with a brew calendar and monthly overview](docs/images/dashboard-en.png)](docs/images/dashboard-en.png)

### Bean collection

Keep origins, roast levels, processing methods and flavor notes together. Uploaded photos appear in bean details.

[![Bean cards with distinct roast illustrations](docs/images/bean-cards-en.png)](docs/images/bean-cards-en.png)

### Origin map

Explore bean origins on the map and hover over a marker to see the associated bean cards.

[![Origin map with a bean-card tooltip](docs/images/origin-map-en.png)](docs/images/origin-map-en.png)

### On a phone

Real phone screenshots provided by the project owner. Both images are 670 × 1280 pixels and displayed at the same size. Click either image to view it in full.

<table>
  <tr>
    <th>Dashboard & brew calendar</th>
    <th>Origin map & bean cards</th>
  </tr>
  <tr>
    <td align="center"><a href="docs/images/mobile-dashboard-en.jpg"><img src="docs/images/mobile-dashboard-en.jpg" width="335" height="640" alt="Phone dashboard with collapsible navigation and brew calendar" /></a></td>
    <td align="center"><a href="docs/images/mobile-origin-map-en.jpg"><img src="docs/images/mobile-origin-map-en.jpg" width="335" height="640" alt="Phone origin map with bean cards" /></a></td>
  </tr>
</table>

## Features

- **Dashboard:** overview, brew calendar, daily records, monthly summaries and recent brews.
- **Bean cards:** origin, roast level, processing method, single origin or blend, flavor notes and detail photos.
- **Brew journal:** actual grind setting, dose, yield or water weight, extraction time, temperature, rating and tasting notes for each cup.
- **Favorite recipes:** reusable target parameters, equipment and instructions. Select a recipe while brewing, view its steps and adjust the actual values independently.
- **Equipment:** add, rename or deactivate coffee machines and grinders. Historical brews retain their equipment-name snapshots.
- **Origin map:** group bean cards by recognized countries and regions, with hover details.
- **Preferences & backup:** English and Simplified Chinese, light and dark themes, JSON import and export including photos.
- **History preservation:** deleting a bean card keeps its associated brew records. Legacy favorites migrate to recipes.

## Docker deployment

Public image: [tzbqweas/bean-journal](https://hub.docker.com/r/tzbqweas/bean-journal). Tags `1.3` and `latest` point to v1.3 at release; `1.3` pins this version. Platform: `linux/amd64`.

```sh
docker pull tzbqweas/bean-journal:1.3
docker run -d --name bean-journal -p 8080:8080 -v bean-journal-data:/data --restart unless-stopped tzbqweas/bean-journal:1.3
```

Open `http://localhost:8080` locally or `http://SERVER_LAN_IP:8080` from other devices. All devices must reach the same instance. Allow the port on your host. There is **no login**: anyone who can reach it can read and modify the shared journal.

### Docker Compose

Use the repository's `compose.yaml`, or create one with:

```yaml
services:
  bean-journal:
    image: tzbqweas/bean-journal:1.3
    ports:
      - "8080:8080"
    volumes:
      - bean-journal-data:/data
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=16m,mode=1777
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
volumes:
  bean-journal-data:

```

```sh
docker compose pull
docker compose up -d
```

Keep the same Compose project name and named volume on upgrades. Data and photos live in `/data/journal.sqlite`; **do not run `docker compose down -v`**, which deletes the volume. Settings JSON export includes photos. Stop the service before copying the complete data directory for file-level backups.

### Build or archive the image

```sh
docker build -t bean-journal:1.3 .
docker save -o bean-journal-1.3.tar tzbqweas/bean-journal:1.3
docker load -i bean-journal-1.3.tar
```

The image contains the app, Node.js and SQLite, without developer dependencies or private data. To run an imported image, use the command above with a persistent volume. Source builds are possible on other supported host architectures; this published image is amd64.

## Run from source

Use Node.js 24.14 or later in the 24.x line:

```sh
npm start
```

Open `http://localhost:8080`. Built-in modules provide the runtime; no npm dependencies are required just to run it. The database defaults to `data/`; `DATA_DIR`, `PORT` and `HOST` can override defaults. `npm run start:static` preserves browser-local static mode, without multi-device sync.

## Storage and synchronization

Pages check for changes about every 5 seconds and on focus. Editing pauses automatic refresh; saves check for conflicts. Historical equipment links remain intact. Language and theme are local preferences. There are no multiple accounts or offline queues. See [storage details](docs/self-hosted-sync.md).

## Development

```sh
npm ci
npm test
```

Tests cover UI behavior, legacy data, equipment, backup validation, HTTP/SQLite persistence, concurrent saves, stale edits, configuration failure and server restoration. Automated tests do not replace all real-device checks.

```text
dist/          Frontend and shared data validation
server/        HTTP API and SQLite storage
scripts/       Optional static server
tests/         Regression tests
docs/          Screenshots, deployment and release notes
compose.yaml   Persistent Docker Hub deployment
```

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

Current version: **v1.3**  See [CHANGELOG.md](CHANGELOG.md) for the release notes and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party resources and licenses.

