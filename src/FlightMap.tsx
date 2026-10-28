import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import type { LatLngExpression } from 'leaflet'

type MapFlight = {
  callsign: string
  airline: string
  position: [number, number]
  destination: [number, number]
}

const demoAircraft: MapFlight[] = [
  { callsign: 'BAW287', airline: 'British Airways', position: [51.47, -20], destination: [37.62, -122.38] },
  { callsign: 'UAE4', airline: 'Emirates', position: [42, 35], destination: [40.64, -73.78] },
  { callsign: 'DLH401', airline: 'Lufthansa', position: [48, 15], destination: [50.03, 8.57] },
  { callsign: 'AFR66', airline: 'Air France', position: [48.5, -15], destination: [33.94, -118.4] },
  { callsign: 'KLM602', airline: 'KLM Royal Dutch', position: [35, -35], destination: [52.31, 4.76] },
]

function ResizeMap() {
  const map = useMap()
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 150)
    return () => window.clearTimeout(timer)
  }, [map])
  return null
}

function MapZoomButtons() {
  const map = useMap()
  return <div className="leaflet-demo-zoom" aria-label="Map zoom controls">
    <button type="button" aria-label="Zoom in" onClick={() => map.zoomIn()}>+</button>
    <button type="button" aria-label="Zoom out" onClick={() => map.zoomOut()}>−</button>
  </div>
}

export default function FlightMap({ showRoutes, showLabels, onSelectFlight }: {
  showRoutes: boolean
  showLabels: boolean
  onSelectFlight: (callsign: string) => void
}) {
  return <MapContainer className="real-flight-map" center={[25, 0] as LatLngExpression} zoom={2} minZoom={2} maxZoom={8} worldCopyJump zoomControl={false}>
    <ResizeMap />
    <MapZoomButtons />
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {showRoutes && demoAircraft.map((flight) => <Polyline key={flight.callsign} positions={[flight.position, flight.destination]} pathOptions={{ color: '#55bde9', weight: 1.5, opacity: 0.75, dashArray: '5 7' }} />)}
    {demoAircraft.map((flight) => <CircleMarker key={flight.callsign} center={flight.position} radius={5} pathOptions={{ color: '#b9ecff', weight: 2, fillColor: '#53bce9', fillOpacity: 0.95 }} eventHandlers={{ click: () => onSelectFlight(flight.callsign) }}>
      <Tooltip direction="top" offset={[0, -6]}>{showLabels ? <><strong>{flight.callsign}</strong><br />{flight.airline} · Demo position</> : flight.callsign}</Tooltip>
    </CircleMarker>)}
  </MapContainer>
}
