# slapp-timetable Design

## Goal

Real-time departure board for Larsberg-area stops (bus 206, tram 21, boat 80), showing the next departures when you visit the page.

## Architecture

Static single-page app (HTML + CSS + vanilla JS). Fetches from the SL Transport API (`transport.integration.sl.se/v1`) which requires no API key. Each stop is fetched independently, results filtered to relevant lines, and rendered as a departure board. Auto-refreshes every 30 seconds.

## Stops

| Section | Site ID | Lines | Filter |
|---------|---------|-------|--------|
| Larsbergsvägen (Vändslingan) | 2070 | Bus 206 | line 206 only |
| Larsberg (Lidingöbanan) | 9249 | Tram 21 | line 21 only |
| Dalénum (Pendelbåt) | 9255 | Boat 80 | line 80 only |
| Saltsjöqvarn (Pendelbåt) | 1442 | Boat 80 | line 80 only |

## UI

- Dark background (#1a1a2e or similar dark departure board look)
- Each stop as a card/section with header showing stop name + transport icon
- Departures: colored line badge, destination, time display (from API `display` field — "Nu", "4 min", "12:28")
- Line colors: Bus 206 = SL blue (#2563eb), Tram 21 = SL tram color, Boat 80 = SL ship color
- Last updated timestamp + auto-refresh indicator
- Mobile-first, no scroll needed for typical departures
- PWA manifest for home screen install

## Tech

- No build step, no dependencies
- `index.html`, `style.css`, `app.js`
- `manifest.json` for PWA
- GitHub Pages deployment
