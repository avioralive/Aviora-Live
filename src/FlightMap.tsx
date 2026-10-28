import 'leaflet/dist/leaflet.css'
import { Marker, MapContainer, TileLayer, Tooltip, useMapEvents } from 'react-leaflet'
import { divIcon } from 'leaflet'
import type { LatLngExpression } from 'leaflet'

function planeIcon(track: number | undefined, selected: boolean) {
  const rotation = typeof track === 'number' ? track : 0
  const color = selected ? '#f4b942' : '#b9ecff'
  return divIcon({
    className: 'aircraft-map-icon',
    html: '<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;color:' + color + ';filter:drop-shadow(0 1px 2px #07111f);transform:rotate(' + rotation + 'deg)"><svg viewBox="0 0 24 24" width="' + (selected ? '25' : '21') + '" height="' + (selected ? '25' : '21') + '" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

export type LiveAircraft = {
  hex: string
  flight?: string
  r?: string
  t?: string
  lat: number
  lon: number
  alt_baro?: number | string
  gs?: number
  track?: number
  seen_pos?: number
  seen?: number
  squawk?: string
  category?: string
}

function MapCenterReporter({ onCenterChange }: { onCenterChange: (center: [number, number]) => void }) {
  useMapEvents({
    moveend(event) {
      const center = event.target.getCenter()
      onCenterChange([center.lat, center.lng])
    },
  })
  return null
}

export default function FlightMap({ aircraft, selectedHex, onSelectAircraft, onCenterChange }: {
  aircraft: LiveAircraft[]
  selectedHex: string | null
  onSelectAircraft: (hex: string) => void
  onCenterChange: (center: [number, number]) => void
}) {
  return <MapContainer className="real-flight-map" center={[51.5, -0.12] as LatLngExpression} zoom={5} minZoom={2} maxZoom={12} worldCopyJump zoomControl>
    <MapCenterReporter onCenterChange={onCenterChange} />
    <TileLayer attribution='Aircraft data: <a href="https://www.adsb.lol/docs/open-data/api/" target="_blank" rel="noreferrer">adsb.lol</a> · Map: &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {aircraft.map((plane) => <Marker
      key={plane.hex}
      position={[plane.lat, plane.lon]}
      icon={planeIcon(plane.track, plane.hex === selectedHex)}
      eventHandlers={{ click: () => onSelectAircraft(plane.hex) }}
    >
      <Tooltip direction="top" offset={[0, -10]}>
        <strong>{(plane.flight || plane.hex).trim()}</strong><br />
        {(plane.t || 'Aircraft type unknown') + ' · ' + (typeof plane.alt_baro === 'number' ? plane.alt_baro.toLocaleString() + ' ft' : plane.alt_baro === 'ground' ? 'On ground' : 'Altitude unavailable')}
      </Tooltip>
    </Marker>)}
  </MapContainer>
}
