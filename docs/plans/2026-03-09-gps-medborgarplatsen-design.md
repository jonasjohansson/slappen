# GPS-aware stops + Medborgarplatsen Design

## Goal

Add Medborgarplatsen metro (northbound towards Ropsten via Gamla Stan) and GPS-based highlighting that dims irrelevant stops based on user location.

## New stop

- Medborgarplatsen (site ID 9191), Metro lines 17/18/19, direction_code 1 (northbound)
- Color: #4ca85b (green line)

## Direction filtering

Add optional `directions` array to STOPS config. If set, filter departures by `direction_code`. Backwards compatible — existing stops without `directions` show all directions.

## GPS highlighting

Zones:
- Larsberg: 59.356, 18.130, radius 800m → Larsbergsvägen, Larsberg, Dalénum
- Saltsjöqvarn: 59.320, 18.100, radius 500m → Saltsjöqvarn
- Medborgarplatsen: 59.314, 18.074, radius 500m → Medborgarplatsen

Behavior:
- Request geolocation on load
- If in a zone: dim all stops not in that zone's relevant list
- If not in any zone or GPS denied: show all normally
- Recalculate every refresh (30s)
- CSS: `.stop-section.dimmed { opacity: 0.4; transition: opacity 0.3s; }`
