const STOPS = [
  { id: 2070, name: 'Larsbergsvägen', icon: '🚌', lines: [206], color: '#1e6bc9' },
  { id: 9249, name: 'Larsberg', icon: '🚃', lines: [21], color: '#7b4fa0' },
  { id: 9255, name: 'Dalénum', icon: '⛴', lines: [80], color: '#00a4b7' },
  { id: 1442, name: 'Saltsjöqvarn', icon: '⛴', lines: [80], color: '#00a4b7' },
  { id: 9191, name: 'Medborgarplatsen', icon: '🚇', lines: [17, 18, 19], directions: [1], color: '#4ca85b' },
];

const ZONES = [
  { lat: 59.356, lng: 18.130, radius: 800, stops: ['Larsbergsvägen', 'Larsberg', 'Dalénum'] },
  { lat: 59.320, lng: 18.100, radius: 500, stops: ['Saltsjöqvarn'] },
  { lat: 59.314, lng: 18.074, radius: 500, stops: ['Medborgarplatsen'] },
];

let userPosition = null;

const API_BASE = 'https://transport.integration.sl.se/v1/sites';
const MAX_DEPARTURES = 5;
const REFRESH_INTERVAL = 30000;

const departuresEl = document.getElementById('departures');
const updatedEl = document.getElementById('updated');

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

async function fetchDepartures(stop) {
  const res = await fetch(`${API_BASE}/${stop.id}/departures`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const filtered = (data.departures || []).filter((dep) =>
    stop.lines.includes(dep.line?.id) &&
    (!stop.directions || stop.directions.includes(dep.direction_code))
  );
  return { stop, departures: filtered.slice(0, MAX_DEPARTURES) };
}

function renderDeparture(dep, color) {
  const isNow = dep.display === 'Nu';
  return `
    <div class="departure-row">
      <span class="line-badge" style="background:${color}">${esc(dep.line.designation)}</span>
      <span class="destination">${esc(dep.destination)}</span>
      <span class="time${isNow ? ' now' : ''}">${esc(dep.display)}</span>
    </div>`;
}

function renderStop({ stop, departures }, dimmed) {
  const rows = departures.length
    ? departures.map((dep) => renderDeparture(dep, stop.color)).join('')
    : '<div class="no-departures">Inga avgångar</div>';

  return `
    <section class="stop-section${dimmed ? ' dimmed' : ''}">
      <div class="stop-header">${stop.icon} ${stop.name}</div>
      ${rows}
    </section>`;
}

function updateTimestamp() {
  const now = new Date();
  const time = now.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  updatedEl.textContent = `Uppdaterad ${time}`;
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getRelevantStops() {
  if (!userPosition) return null;
  for (const zone of ZONES) {
    const dist = distanceMeters(userPosition.lat, userPosition.lng, zone.lat, zone.lng);
    if (dist <= zone.radius) return zone.stops;
  }
  return null;
}

function updateGPS() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => { userPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
    () => { userPosition = null; },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

updateGPS();

async function refresh() {
  updateGPS();
  const relevant = getRelevantStops();
  const results = await Promise.allSettled(STOPS.map(fetchDepartures));
  const html = results.map((result, i) => {
    const dimmed = relevant !== null && !relevant.includes(STOPS[i].name);
    if (result.status === 'fulfilled') {
      return renderStop(result.value, dimmed);
    }
    console.error(`Failed to fetch ${STOPS[i].name}:`, result.reason);
    return `
      <section class="stop-section${dimmed ? ' dimmed' : ''}">
        <div class="stop-header">${STOPS[i].icon} ${esc(STOPS[i].name)}</div>
        <div class="no-departures">Kunde inte hämta avgångar</div>
      </section>`;
  });
  departuresEl.innerHTML = html.join('');
  updateTimestamp();
}

refresh();
setInterval(refresh, REFRESH_INTERVAL);
