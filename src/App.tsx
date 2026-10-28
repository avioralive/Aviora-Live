import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Activity, AlertCircle, ArrowUpRight, CheckCircle2, Clock3, Plane, Radio, RefreshCw, Search, Wifi } from 'lucide-react'
import FlightMap, { type LiveAircraft } from './FlightMap'

type FeedResponse = { ac?: LiveAircraft[]; total?: number; now?: number; source?: string; error?: string }

function formatAltitude(value: number | string | undefined) {
  if (value === 'ground') return 'On ground'
  return typeof value === 'number' ? value.toLocaleString() + ' ft' : '—'
}
function formatSpeed(value: number | undefined) {
  return typeof value === 'number' ? Math.round(value) + ' kt' : '—'
}
function callsign(plane: LiveAircraft) {
  return (plane.flight || plane.hex).trim() || plane.hex
}

export default function App() {
  const [aircraft, setAircraft] = useState<LiveAircraft[]>([])
  const [selectedHex, setSelectedHex] = useState<string | null>(null)
  const [center, setCenter] = useState<[number, number]>([51.5, -0.12])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const updateCenter = useCallback((next: [number, number]) => {
    setCenter((current) => Math.abs(current[0] - next[0]) < 0.25 && Math.abs(current[1] - next[1]) < 0.25 ? current : next)
  }, [])

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const url = '/api/aircraft.php?lat=' + encodeURIComponent(center[0].toFixed(4)) + '&lon=' + encodeURIComponent(center[1].toFixed(4)) + '&dist=250'
      const response = await fetch(url, { signal, cache: 'no-store' })
      const data = await response.json() as FeedResponse
      if (!response.ok) throw new Error(data.error || 'Live aircraft feed request failed (' + response.status + ').')
      if (!Array.isArray(data.ac)) throw new Error('The live provider returned an invalid response.')
      const positioned = data.ac.filter((plane) => Number.isFinite(plane.lat) && Number.isFinite(plane.lon) && (plane.seen_pos == null || plane.seen_pos < 90))
      setAircraft(positioned)
      setLastUpdated(Date.now())
      setError('')
      setSelectedHex((current) => current && positioned.some((plane) => plane.hex === current) ? current : positioned[0]?.hex ?? null)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Could not load live aircraft.')
      setAircraft([])
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [center])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    const timer = window.setInterval(() => void refresh(), 30000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [refresh])

  const visibleAircraft = useMemo(() => aircraft.filter((plane) => [
    callsign(plane), plane.hex, plane.r || '', plane.t || '', plane.squawk || ''
  ].some((value) => value.toLowerCase().includes(query.toLowerCase().trim()))), [aircraft, query])
  const selected = aircraft.find((plane) => plane.hex === selectedHex) || null
  const airborne = aircraft.filter((plane) => plane.alt_baro !== 'ground').length
  const averageAltitude = aircraft.filter((plane) => typeof plane.alt_baro === 'number')
  const statusText = error ? 'Feed unavailable' : loading && !lastUpdated ? 'Connecting to live feed' : 'Live ADS-B feed'

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-row">
        <div className="brand-mark"><Plane size={19} strokeWidth={2.3} /></div>
        <div className="brand-copy"><span>AVIORA<span className="brand-light"> LIVE</span></span><small>LIVE AIRCRAFT TRACKING</small></div>
      </div>
      <div className="workspace-switcher"><div className="workspace-avatar">A</div><div className="workspace-text"><strong>Live airspace</strong><span>Real ADS-B data</span></div><Wifi size={15} /></div>
      <div className="nav-area">
        <div className="nav-group"><div className="nav-heading">TRACKING</div>
          <div className="nav-item nav-active"><Activity size={17} /><span>Live overview</span></div>
          <div className="nav-item"><Plane size={17} /><span>Aircraft explorer</span></div>
        </div>
      </div>
      <div className="sidebar-bottom">
        <div className="upgrade-card"><div className="upgrade-icon"><Radio size={16} /></div><strong>Real aircraft positions</strong><p>Positions are received from community ADS-B receivers. Coverage varies by location.</p><a href="https://www.adsb.lol/docs/open-data/api/" target="_blank" rel="noreferrer">About the live feed <ArrowUpRight size={14} /></a></div>
        <div className="profile-row"><div className="profile-avatar">AL</div><div className="profile-text"><strong>Aviora Live</strong><span>Live data mode</span></div></div>
      </div>
    </aside>

    <main className="main-content">
      <header className="topbar">
        <div className="breadcrumb">Aviora Live <span>/</span> <strong>Live overview</strong></div>
        <div className="topbar-actions"><div className="system-status"><span className={error ? '' : 'status-dot'} /> {statusText}</div><button className="icon-button" aria-label="Refresh live aircraft" title="Refresh live aircraft" onClick={() => void refresh()}><RefreshCw size={17} /></button><div className="top-avatar">A</div></div>
      </header>

      <div className="page-content">
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> LIVE AIR TRAFFIC · ADS-B</div><h1>Your window to the real skies.</h1><p className="page-subtitle">Aircraft positions reported by live ADS-B receivers. Pan the map to load traffic in another area.</p></div><div className="demo-tag"><span /> REAL DATA</div></section>

        {error && <div className="notice-popover" role="alert" style={{ position: 'relative', inset: 'auto', width: '100%', marginBottom: 18 }}><strong><AlertCircle size={15} style={{ verticalAlign: 'middle', marginRight: 7 }} /> Live feed unavailable</strong><p>{error}</p><p>No invented aircraft are shown. Try refreshing in a moment.</p><button className="outline-button" onClick={() => void refresh()}><RefreshCw size={14} /> Retry live feed</button></div>}

        <section className="stats-grid" aria-label="Live aircraft statistics">
          <StatCard label="Aircraft in area" value={loading && !lastUpdated ? '…' : aircraft.length.toLocaleString()} detail="positioned aircraft returned" icon={<Plane size={17} />} />
          <StatCard label="Not on ground" value={loading && !lastUpdated ? '…' : airborne.toLocaleString()} detail="from current live snapshot" icon={<Activity size={17} />} />
          <StatCard label="Aircraft with altitude" value={averageAltitude.length.toLocaleString()} detail="valid altitude reports" icon={<Radio size={17} />} />
          <StatCard label="Refresh interval" value="30 sec" detail={lastUpdated ? 'last update ' + new Date(lastUpdated).toLocaleTimeString() : 'waiting for first response'} icon={<Clock3 size={17} />} />
        </section>

        <section className="map-section">
          <div className="section-heading"><div><h2>Live airspace</h2><p>Showing aircraft within 250 nautical miles of the map centre</p></div><div className="map-heading-actions"><span className="demo-tag"><span /> {loading ? 'UPDATING' : error ? 'OFFLINE' : 'LIVE ADS-B'}</span></div></div>
          <div className="map-layout">
            <div className="map-canvas">
              <FlightMap aircraft={aircraft} selectedHex={selectedHex} onSelectAircraft={setSelectedHex} onCenterChange={updateCenter} />
              <div className="map-top-controls"><div className="map-search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search callsign, registration, type, ICAO..." aria-label="Search live aircraft" /></div></div>
              <div className="map-legend"><span><i className="legend-plane" /> Live aircraft</span><span><i className="legend-dot" /> Selected aircraft</span></div>
              <div className="map-attribution">Live positions · Not for navigation</div>
            </div>
            <aside className="flight-detail">
              {selected ? <>
                <div className="detail-header"><div><span className="detail-kicker">LIVE AIRCRAFT</span><h3>{callsign(selected)}</h3></div><span className="live-pill"><i /> LIVE</span></div>
                <div className="route-display"><div className="airport-code">{selected.hex.toUpperCase()}<small>ICAO HEX</small></div><div className="route-line"><Plane size={16} /><span /></div><div className="airport-code airport-end">{selected.r || 'Unknown'}<small>REGISTRATION</small></div></div>
                <div className="detail-airline">{selected.t || 'Aircraft type not reported'}<span>{selected.category ? 'Category ' + selected.category : 'Type data supplied when available'}</span></div>
                <div className="detail-metrics"><div><span>ALTITUDE</span><strong>{formatAltitude(selected.alt_baro)}</strong></div><div><span>GROUND SPEED</span><strong>{formatSpeed(selected.gs)}</strong></div><div><span>HEADING</span><strong>{typeof selected.track === 'number' ? Math.round(selected.track) + '°' : '—'}</strong></div><div><span>SQUAWK</span><strong>{selected.squawk || '—'}</strong></div></div>
                <div className="detail-status"><span>Position age</span><strong><i /> {typeof selected.seen_pos === 'number' ? Math.round(selected.seen_pos) + ' sec' : 'Unknown'}</strong></div>
                <div className="detail-footnote"><CheckCircle2 size={14} /> Position reported by ADS-B receivers</div>
              </> : <div className="empty-state" style={{ padding: 24 }}>{loading ? 'Loading real aircraft…' : 'No aircraft selected. Pan the map to another area.'}</div>}
            </aside>
          </div>
        </section>

        <section className="activity-section"><div className="section-heading activity-heading"><div><h2>Aircraft in this area</h2><p>Live transponder reports · search or select a row for details</p></div><span className="text-button">{visibleAircraft.length.toLocaleString()} aircraft</span></div>
          <div className="table-wrap"><table><thead><tr><th>CALLSIGN / ICAO</th><th>REGISTRATION</th><th>TYPE</th><th>ALTITUDE</th><th>SPEED</th><th>HEADING</th></tr></thead><tbody>
            {visibleAircraft.slice(0, 100).map((plane) => <tr key={plane.hex} className={selectedHex === plane.hex ? 'selected-row' : ''} onClick={() => setSelectedHex(plane.hex)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') setSelectedHex(plane.hex) }}>
              <td><div className="flight-id"><span className="airline-mark blue"><Plane size={14} /></span><div><strong>{callsign(plane)}</strong><small>{plane.hex.toUpperCase()}</small></div></div></td><td>{plane.r || '—'}</td><td>{plane.t || '—'}</td><td>{formatAltitude(plane.alt_baro)}</td><td>{formatSpeed(plane.gs)}</td><td>{typeof plane.track === 'number' ? Math.round(plane.track) + '°' : '—'}</td>
            </tr>)}
            {!loading && visibleAircraft.length === 0 && <tr><td colSpan={6} className="empty-state">{error ? 'Live data could not be loaded.' : query ? 'No live aircraft match that search.' : 'No aircraft positions reported in this area. Pan the map or zoom out.'}</td></tr>}
          </tbody></table></div>
          <div className="table-footer"><span>Showing {Math.min(visibleAircraft.length, 100)} of {visibleAircraft.length} returned aircraft · 250 NM radius</span><span><span className="footer-dot" /> {lastUpdated ? 'Updated ' + new Date(lastUpdated).toLocaleTimeString() : 'Waiting for live feed'}</span></div>
        </section>
        <footer className="page-footer"><span>© 2026 Aviora Live</span><span>Live aircraft data: adsb.lol · Map data: OpenStreetMap</span><a href="https://github.com/avioralive/Aviora-Live" target="_blank" rel="noreferrer">Project repository <ArrowUpRight size={12} /></a></footer>
      </div>
    </main>
  </div>
}

function StatCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-bottom"><span>{detail}</span></div></div>
}
