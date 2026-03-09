# slapp-timetable Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Real-time departure board for Larsberg-area stops using the SL Transport API.

**Architecture:** Static site (HTML/CSS/JS) fetching from `transport.integration.sl.se/v1/sites/{id}/departures` for 4 stops, filtering to lines 206, 21, 80. Auto-refreshes every 30s. Dark theme departure board UI. PWA-capable.

**Tech Stack:** HTML, CSS, vanilla JavaScript. No build tools or dependencies.

---

### Task 1: Create index.html

**Files:**
- Create: `index.html`

**Step 1: Write the HTML**

```html
<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Avgångar">
    <meta name="theme-color" content="#0a0a1a">
    <link rel="manifest" href="manifest.json">
    <title>Avgångar</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <h1>Avgångar</h1>
        <div class="updated" id="updated"></div>
    </header>
    <main id="departures"></main>
    <script src="app.js"></script>
</body>
</html>
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add index.html skeleton"
```

---

### Task 2: Create style.css

**Files:**
- Create: `style.css`

**Step 1: Write the CSS**

Dark departure board theme. Mobile-first. Stop sections as cards. Line badges with transport-mode colors. Monospace-ish time display.

Key design tokens:
- Background: `#0a0a1a`
- Card background: `#141428`
- Text: `#e8e8f0`
- Muted: `#6b6b80`
- Bus 206: `#1e6bc9` (SL blue)
- Tram 21: `#7b4fa0` (SL tram purple/Lidingöbanan)
- Boat 80: `#00a4b7` (SL ship teal)
- "Nu" badge: `#22c55e` (green)

Structure:
- `.stop-section` — card per stop with name header
- `.departure-row` — flex row: badge, destination, time
- `.line-badge` — colored rounded badge with line number
- `.time` — right-aligned, tabular-nums
- `.transport-icon` — small icon before stop name (bus/tram/ship emoji or SVG)

**Step 2: Commit**

```bash
git add style.css
git commit -m "feat: add departure board dark theme CSS"
```

---

### Task 3: Create app.js

**Files:**
- Create: `app.js`

**Step 1: Write the JavaScript**

```javascript
// Config: stops to fetch
const STOPS = [
  { id: 2070, name: 'Larsbergsvägen', icon: '🚌', lines: [206], color: '#1e6bc9' },
  { id: 9249, name: 'Larsberg', icon: '🚃', lines: [21], color: '#7b4fa0' },
  { id: 9255, name: 'Dalénum', icon: '⛴', lines: [80], color: '#00a4b7' },
  { id: 1442, name: 'Saltsjöqvarn', icon: '⛴', lines: [80], color: '#00a4b7' },
];

const API_BASE = 'https://transport.integration.sl.se/v1/sites';
const REFRESH_MS = 30000;

async function fetchDepartures(stop) {
  const res = await fetch(`${API_BASE}/${stop.id}/departures`);
  const data = await res.json();
  return data.departures.filter(d => stop.lines.includes(d.line.id));
}

function renderDeparture(dep, stop) {
  // Returns HTML for one departure row
  // Line badge (colored), destination, display time
  // Highlight "Nu" in green
}

function renderStop(stop, departures) {
  // Returns HTML for one stop section
  // Header: icon + stop name
  // List of departure rows (max 5)
  // "Inga avgångar" if empty
}

async function update() {
  const container = document.getElementById('departures');
  const results = await Promise.all(STOPS.map(async stop => {
    const deps = await fetchDepartures(stop);
    return renderStop(stop, deps);
  }));
  container.innerHTML = results.join('');
  document.getElementById('updated').textContent =
    'Uppdaterad ' + new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

update();
setInterval(update, REFRESH_MS);
```

**Step 2: Commit**

```bash
git add app.js
git commit -m "feat: add real-time departure fetching and rendering"
```

---

### Task 4: Create manifest.json

**Files:**
- Create: `manifest.json`

**Step 1: Write the manifest**

```json
{
  "name": "Avgångar Larsberg",
  "short_name": "Avgångar",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#0a0a1a",
  "theme_color": "#0a0a1a"
}
```

**Step 2: Commit**

```bash
git add manifest.json
git commit -m "feat: add PWA manifest"
```

---

### Task 5: Initialize git repo

**Step 1: Init and initial commit**

```bash
cd slapp-timetable
git init
git add -A
git commit -m "feat: slapp-timetable — real-time departure board for Larsberg area"
```

**Step 2: Create GitHub repo and push**

```bash
gh repo create jonasjohansson/slapp-timetable --public --source=. --push
```

---

### Task 6: Test and verify

**Step 1: Open in browser and verify**

- Serve locally: `python3 -m http.server 8080`
- Open http://localhost:8080
- Verify all 4 stops show departures
- Verify auto-refresh works
- Verify mobile layout looks good

**Step 2: Fix any issues found**
