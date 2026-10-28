import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMapEvents } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'

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
    {aircraft.map((plane) => <CircleMarker
      key={plane.hex}
      center={[plane.lat, plane.lon]}
      radius={plane.hex === selectedHex ? 7 : 4}
      pathOptions={{ color: plane.hex === selectedHex ? '#ffffff' : '#b9ecff', weight: plane.hex === selectedHex ? 3 : 1.5, fillColor: plane.hex === selectedHex ? '#f3b64b' : '#53bce9', fillOpacity: 0.95 }}
      eventHandlers={{ click: () => onSelectAircraft(plane.hex) }}
    >
      <Tooltip direction="top" offset={[0, -5]}>
        <strong>{(plane.flight || plane.hex).trim()}</strong><br />
        {(plane.t || 'Aircraft type unknown') + ' · ' + (typeof plane.alt_baro === 'number' ? plane.alt_baro.toLocaleString() + ' ft' : plane.alt_baro === 'ground' ? 'On ground' : 'Altitude unavailable')}
      </Tooltip>
    </CircleMarker>)}
  </MapContainer>
}
