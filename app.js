const STOPS = [
  { id: 2070, name: 'Larsbergsvägen', icon: '🚌', lines: [206], color: '#1e6bc9' },
  { id: 9249, name: 'Larsberg', icon: '🚃', lines: [21], color: '#7b4fa0' },
  { id: 9255, name: 'Dalénum', icon: '⛴', lines: [80], color: '#00a4b7' },
  { id: 1442, name: 'Saltsjöqvarn', icon: '⛴', lines: [80], color: '#00a4b7' },
];

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
    stop.lines.includes(dep.line?.id)
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

function renderStop({ stop, departures }) {
  const rows = departures.length
    ? departures.map((dep) => renderDeparture(dep, stop.color)).join('')
    : '<div class="no-departures">Inga avgångar</div>';

  return `
    <section class="stop-section">
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

async function refresh() {
  const results = await Promise.allSettled(STOPS.map(fetchDepartures));
  const html = results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return renderStop(result.value);
    }
    console.error(`Failed to fetch ${STOPS[i].name}:`, result.reason);
    return `
      <section class="stop-section">
        <div class="stop-header">${STOPS[i].icon} ${esc(STOPS[i].name)}</div>
        <div class="no-departures">Kunde inte hämta avgångar</div>
      </section>`;
  });
  departuresEl.innerHTML = html.join('');
  updateTimestamp();
}

refresh();
setInterval(refresh, REFRESH_INTERVAL);
