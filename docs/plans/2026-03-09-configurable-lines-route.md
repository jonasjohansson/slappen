# Configurable Lines & Route Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make lines add/removable via UI and replace hardcoded route with SL Journey Planner API, all persisted in localStorage.

**Architecture:** Config (lines array + route addresses) lives in localStorage, seeded with current defaults on first visit. Lines are managed via "−"/"+" buttons. Route uses the SL Journey Planner v2 `/trips` endpoint instead of manual connection matching. Stop discovery uses `/stop-finder` + `/departures` APIs.

**Tech Stack:** Vanilla JS, SL Transport API (departures), SL Journey Planner v2 API (trips, stop-finder), localStorage.

**APIs:**
- Departures: `https://transport.integration.sl.se/v1/sites/{id}/departures`
- Stop finder: `https://journeyplanner.integration.sl.se/v2/stop-finder?name_sf={name}&type_sf=any&any_obj_filter_sf=2`
- Trips: `https://journeyplanner.integration.sl.se/v2/trips?type_origin=any&name_origin={addr}&type_destination=any&name_destination={addr}&calc_number_of_trips=3`
- Lines: `https://transport.integration.sl.se/v1/lines?transport_authority_id=1`

---

### Task 1: Extract config to localStorage

**Files:**
- Modify: `app.js`

**Step 1: Add config load/save functions**

At the top of `app.js`, replace the hardcoded `LINES` const with a config system:

```js
/* ---- Config ---- */

const DEFAULT_LINES = [
  {
    name: '206',
    color: '#1e6bc9',
    url: 'https://kund.printhuset-sthlm.se/sl/v206.pdf',
    sources: [
      { id: 2070, lines: [206], stop: 'Larsberg' },
      { id: 9220, lines: [206], directions: [1], stop: 'Ropsten' },
    ],
  },
  {
    name: '21',
    color: '#7b4fa0',
    url: 'https://kund.printhuset-sthlm.se/sl/v21.pdf',
    sources: [
      { id: 9249, lines: [21], directions: [2], stop: 'Larsberg', dest: 'Ropsten' },
    ],
  },
  {
    name: '80',
    color: '#00a4b7',
    url: 'https://kund.printhuset-sthlm.se/sl/v80.pdf',
    sources: [
      { id: 9255, lines: [80], directions: [2], stop: 'Dalénum', dest: 'Nacka Strand' },
      { id: 1442, lines: [80], directions: [1], stop: 'Saltsjöqvarn' },
    ],
  },
];

const DEFAULT_ROUTE = {
  origin: 'Åsögatan 122',
  destination: 'Larsbergsvägen 27',
};

function loadConfig() {
  try {
    const raw = localStorage.getItem('slapp-config');
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { lines: DEFAULT_LINES, route: DEFAULT_ROUTE };
}

function saveConfig(config) {
  localStorage.setItem('slapp-config', JSON.stringify(config));
}

let config = loadConfig();
```

Replace all references to `LINES` with `config.lines`. Replace hardcoded route addresses with `config.route.origin` / `config.route.destination`.

**Step 2: Update refresh() to use config.lines**

```js
async function refresh() {
  updateGPS();
  const relevant = getRelevantLines();
  const [, ...lineResults] = await Promise.allSettled([
    refreshRoute(),
    ...config.lines.map(fetchLine),
  ]);
  const html = lineResults.map((result, i) => {
    const dimmed = relevant !== null && !relevant.includes(config.lines[i].name);
    if (result.status === 'fulfilled') {
      return renderLine(result.value, dimmed);
    }
    return `
      <section class="stop-section${dimmed ? ' dimmed' : ''}">
        <div class="stop-header" style="background:${config.lines[i].color}">
          <span class="line-badge">${esc(config.lines[i].name)}</span>
        </div>
        <div class="no-departures">Kunde inte hämta avgångar</div>
      </section>`;
  });
  departuresEl.innerHTML = html.join('');
  updateTimestamp();
}
```

**Step 3: Commit**

```bash
git add app.js
git commit -m "refactor: extract config to localStorage with defaults"
```

---

### Task 2: Add remove line UI ("−" button)

**Files:**
- Modify: `app.js`
- Modify: `style.css`

**Step 1: Add "−" button to renderLine**

In the `renderLine` function, add a remove button to the header:

```js
function renderLine({ line, departures }, dimmed, index) {
  const rows = departures.length
    ? departures.map(renderDeparture).join('')
    : '<div class="no-departures">Inga avgångar</div>';

  return `
    <section class="stop-section${dimmed ? ' dimmed' : ''}">
      <div class="stop-header" style="background:${line.color}">
        <span class="line-badge">${esc(line.name)}</span>
        ${line.url ? `<a href="${line.url}" target="_blank" class="timetable-link">(PDF)</a>` : ''}
        <button class="remove-line" data-index="${index}">−</button>
      </div>
      ${rows}
    </section>`;
}
```

Pass `index` through from the `refresh()` render loop.

**Step 2: Style the remove button**

```css
.remove-line {
  margin-left: auto;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
```

**Step 3: Add event listener for remove**

After rendering, attach click handlers:

```js
document.querySelectorAll('.remove-line').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const idx = parseInt(e.target.dataset.index);
    config.lines.splice(idx, 1);
    saveConfig(config);
    refresh();
  });
});
```

**Step 4: Commit**

```bash
git add app.js style.css
git commit -m "feat: add remove line button (−) to each line header"
```

---

### Task 3: Add "+" button to add new lines

**Files:**
- Modify: `app.js`
- Modify: `style.css`

**Step 1: Render "+" bar after all lines**

At the end of the departures HTML in `refresh()`:

```js
departuresEl.innerHTML = html.join('') + `
  <section class="stop-section add-line-section">
    <div class="stop-header add-line-header">
      <button class="add-line">+</button>
    </div>
  </section>`;
```

**Step 2: Style the add bar**

```css
.add-line-header {
  justify-content: center;
}

.add-line {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 1.4rem;
  cursor: pointer;
  padding: 4px 16px;
  line-height: 1;
}
```

**Step 3: Add line discovery flow**

```js
async function addLineFlow() {
  const lineNum = prompt('Linjenummer?');
  if (!lineNum) return;

  const lineId = parseInt(lineNum);
  if (isNaN(lineId)) return;

  // Ask for stop name
  const stopName = prompt('Hållplats?');
  if (!stopName) return;

  // Resolve stop via stop-finder API
  const sfRes = await fetch(
    `https://journeyplanner.integration.sl.se/v2/stop-finder?name_sf=${encodeURIComponent(stopName)}&type_sf=any&any_obj_filter_sf=2`
  );
  if (!sfRes.ok) { alert('Kunde inte söka hållplats'); return; }
  const sfData = await sfRes.json();

  const stops = sfData.locations || [];
  if (!stops.length) { alert('Ingen hållplats hittades'); return; }

  // Use first match — extract site ID (remove leading "18" and "00" prefix)
  const stop = stops[0];
  const rawId = stop.id?.replace(/^A=1@O=.*@X=\d+@Y=\d+@U=\d+@L=1(\d+)@/, '$1');
  // The stop ID format from stop-finder is like "18002070" — the site ID is the middle digits
  // We need to extract the SL site ID from the global ID
  const siteId = parseInt(rawId);

  // Fetch departures from this site to verify line exists and get directions
  const depRes = await fetch(`${API_BASE}/${siteId}/departures`);
  if (!depRes.ok) { alert('Kunde inte hämta avgångar från hållplatsen'); return; }
  const depData = await depRes.json();

  const lineDeps = (depData.departures || []).filter((d) => d.line?.id === lineId);
  if (!lineDeps.length) { alert(`Linje ${lineNum} hittades inte vid ${stop.name}`); return; }

  // Get transport mode for color
  const mode = lineDeps[0].line?.transport_mode;
  const defaultColors = {
    BUS: '#1e6bc9',
    METRO: '#e32d22',
    TRAM: '#7b4fa0',
    SHIP: '#00a4b7',
    TRAIN: '#f47d30',
  };
  const color = defaultColors[mode] || '#888';

  // Determine short stop name
  const shortStop = stop.disassembledName || stop.name?.split(',')[0] || stopName;

  // Add line to config
  config.lines.push({
    name: lineNum,
    color,
    sources: [{ id: siteId, lines: [lineId], stop: shortStop }],
  });
  saveConfig(config);
  refresh();
}
```

Attach to the "+" button:

```js
document.querySelector('.add-line')?.addEventListener('click', addLineFlow);
```

**Step 4: Commit**

```bash
git add app.js style.css
git commit -m "feat: add new lines via + button with stop discovery"
```

---

### Task 4: Replace route with SL Journey Planner API

**Files:**
- Modify: `app.js`

**Step 1: Remove old connection matching code**

Delete the entire `CONNECTIONS` object, `fetchConnections()`, `LINE_COLORS`, and `renderConnection()` functions.

**Step 2: Add Journey Planner fetch**

```js
const JP_BASE = 'https://journeyplanner.integration.sl.se/v2';

async function fetchTrips() {
  const { origin, destination } = config.route;
  if (!origin || !destination) return [];

  const params = new URLSearchParams({
    type_origin: 'any',
    name_origin: origin,
    type_destination: 'any',
    name_destination: destination,
    calc_number_of_trips: '3',
  });

  const res = await fetch(`${JP_BASE}/trips?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.journeys || [];
}
```

**Step 3: Add Journey Planner renderer**

```js
const PRODUCT_ICONS = {
  'Tunnelbana': '🚇',
  'Spårvagn': '🚃',
  'Buss': '🚌',
  'Pendelbåt': '⛴',
  'footpath': '🚶',
};

const PRODUCT_COLORS = {
  'Tunnelbana tunnelbanans röda linje': '#e32d22',
  'Tunnelbana tunnelbanans blå linje': '#0d6eb8',
  'Tunnelbana tunnelbanans gröna linje': '#4ca85b',
  'Spårvagn': '#7b4fa0',
  'Buss': '#1e6bc9',
  'Pendelbåt': '#00a4b7',
};

function getProductColor(transportation) {
  const name = transportation?.name || '';
  for (const [key, color] of Object.entries(PRODUCT_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#888';
}

function parseTime(isoString) {
  return new Date(isoString);
}

function renderTrip(journey) {
  const legs = journey.legs || [];
  const firstLeg = legs[0];
  const lastLeg = legs[legs.length - 1];
  if (!firstLeg || !lastLeg) return '';

  const depTime = parseTime(firstLeg.origin.departureTimePlanned);
  const arrTime = parseTime(lastLeg.destination.arrivalTimePlanned);
  const totalMin = Math.round((arrTime - depTime) / 60000);

  const legsHtml = legs
    .filter((leg) => {
      // Skip internal transfers (class 99)
      const cls = leg.transportation?.product?.class;
      return cls !== 99;
    })
    .map((leg) => {
      const t = leg.transportation;
      const isWalk = t?.product?.name === 'footpath';
      if (isWalk) {
        const walkMin = Math.round(leg.duration / 60);
        return `<span class="route-leg walk">🚶 ${walkMin}m</span>`;
      }
      const icon = PRODUCT_ICONS[t?.product?.name] || '🚌';
      const color = getProductColor(t);
      const lineNum = t?.name?.match(/\d+$/)?.[0] || '';
      const stopName = leg.origin.name?.split(',')[0] || '';
      const time = fmtTime(parseTime(leg.origin.departureTimePlanned));
      return `<span class="route-leg transit" style="background:${color}">${icon} ${lineNum} ${stopName} ${time}</span>`;
    })
    .join('<span class="route-arrow">→</span>');

  return `
    <div class="route-journey">
      <div class="route-times">
        <span class="route-dep">${fmtTime(depTime)}</span>
        <span class="route-dur">${totalMin} min</span>
        <span class="route-arr">${fmtTime(arrTime)}</span>
      </div>
      <div class="route-legs">${legsHtml}</div>
    </div>`;
}
```

**Step 4: Update refreshRoute()**

```js
async function refreshRoute() {
  try {
    const journeys = await fetchTrips();
    if (!journeys.length) {
      routeCardEl.innerHTML = '';
      return;
    }
    const html = journeys.map(renderTrip).join('');
    routeCardEl.innerHTML = `
      <div class="route-card">
        <div class="route-header" id="route-header-text">
          ${esc(config.route.origin)} → ${esc(config.route.destination)}
        </div>
        ${html}
      </div>`;
  } catch (err) {
    console.error('Failed to fetch trips:', err);
    routeCardEl.innerHTML = '';
  }
}
```

**Step 5: Commit**

```bash
git add app.js
git commit -m "feat: replace manual connection matching with SL Journey Planner API"
```

---

### Task 5: Add route address editing

**Files:**
- Modify: `app.js`
- Modify: `style.css`

**Step 1: Make route header tappable**

Add a click handler after rendering the route card. In `refreshRoute()`, after setting innerHTML:

```js
document.getElementById('route-header-text')?.addEventListener('click', editRoute);
```

**Step 2: Add editRoute function**

```js
function editRoute() {
  const newOrigin = prompt('Från?', config.route.origin);
  if (newOrigin === null) return;
  const newDest = prompt('Till?', config.route.destination);
  if (newDest === null) return;

  config.route.origin = newOrigin;
  config.route.destination = newDest;
  saveConfig(config);
  refresh();
}
```

**Step 3: Add "−" to route card and removability**

Add a remove button to the route header, and handle re-adding via the "+" button:

```js
// In refreshRoute render:
<div class="route-header">
  <span id="route-header-text">${esc(config.route.origin)} → ${esc(config.route.destination)}</span>
  <button class="remove-route">−</button>
</div>

// Handler:
document.querySelector('.remove-route')?.addEventListener('click', () => {
  config.route = { origin: '', destination: '' };
  saveConfig(config);
  refresh();
});
```

**Step 4: Style route header as clickable**

```css
#route-header-text {
  cursor: pointer;
}
```

**Step 5: Commit**

```bash
git add app.js style.css
git commit -m "feat: editable route addresses via tap, removable route"
```

---

### Task 6: Handle adding a route from the "+" button

**Files:**
- Modify: `app.js`

**Step 1: Update "+" button to offer line or route**

When no route exists and user clicks "+", give the option to add a route:

```js
async function addFlow() {
  const choice = prompt('Lägg till:\n1 = Linje\n2 = Resväg');
  if (choice === '1') {
    await addLineFlow();
  } else if (choice === '2') {
    const origin = prompt('Från?');
    if (!origin) return;
    const dest = prompt('Till?');
    if (!dest) return;
    config.route = { origin, destination: dest };
    saveConfig(config);
    refresh();
  }
}
```

If a route already exists, the "+" only offers adding a line (skip the choice prompt).

**Step 2: Commit**

```bash
git add app.js
git commit -m "feat: add route or line from + button"
```

---

### Task 7: Clean up removed code

**Files:**
- Modify: `app.js`

**Step 1: Remove dead code**

- Remove `CONNECTIONS` object
- Remove `DESTINATION_NAMES` and `cleanDestination()` (new lines use API names; existing config has `dest` overrides)
- Remove `LINE_COLORS`
- Remove `ZONES` (GPS dimming can use a simpler approach or be removed for now — it was tightly coupled to hardcoded line names)

**Step 2: Commit**

```bash
git add app.js
git commit -m "chore: remove dead code from manual connection matching"
```

---

### Task 8: Final integration test

**Step 1: Test default state**
- Clear localStorage, reload — should show 206, 21, 80 and route card
- Verify departures load and route shows Journey Planner results

**Step 2: Test line management**
- Click "−" on line 21 — it disappears, persists on reload
- Click "+" → enter "201" → enter "Ropsten" → line 201 appears with departures
- Reload — line 201 still there

**Step 3: Test route editing**
- Tap route header → change addresses → route updates
- Click "−" on route → route disappears
- Click "+" → add route back

**Step 4: Commit**

```bash
git add -A
git commit -m "test: verify configurable lines and route"
```
