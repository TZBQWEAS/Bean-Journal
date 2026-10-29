# Third-party resources

## Natural Earth

World outlines and label positions in `dist/map-data.js` were derived from Natural Earth's 1:110m Admin 0 Countries data.

- Project: https://www.naturalearthdata.com/
- Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson
- Natural Earth data is public domain: https://www.naturalearthdata.com/about/terms-of-use/

The source is converted into a simplified display dataset with names, label positions and SVG paths. Antarctica is omitted. Boundaries are for visual orientation only.

## Fonts

The stylesheet requests Noto Serif SC via Google Fonts. Font files are not bundled in this repository. Noto fonts use the SIL Open Font License.

## Development dependencies

jsdom and Prettier are used only for testing and formatting. Their licenses are included in their npm packages.

## GitHub Octicons

The GitHub mark uses the Octicons mark-github icon, under the MIT license. The bundled license is [dist/licenses/octicons.txt](dist/licenses/octicons.txt). Source: https://github.com/primer/octicons
