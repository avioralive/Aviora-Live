import { useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, ChevronDown, CircleHelp,
  Compass, Crosshair, Globe2, Layers3, MapPin, Menu, Plane, Radio,
  Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, X
} from 'lucide-react'

type Flight = {
  callsign: string
  airline: string
  route: string
  aircraft: string
  altitude: string
  speed: string
  status: 'En route' | 'Climbing' | 'Descending'
  color: string
}

const flights: Flight[] = [
  { callsign: 'BAW287', airline: 'British Airways', route: 'LHR → SFO', aircraft: 'Boeing 787-9', altitude: '38,000 ft', speed: '492 kt', status: 'En route', color: 'blue' },
  { callsign: 'UAE4', airline: 'Emirates', route: 'DXB → JFK', aircraft: 'Airbus A380-800', altitude: '35,000 ft', speed: '518 kt', status: 'En route', color: 'violet' },
  { callsign: 'DLH401', airline: 'Lufthansa', route: 'JFK → FRA', aircraft: 'Boeing 747-8', altitude: '31,400 ft', speed: '476 kt', status: 'Descending', color: 'amber' },
  { callsign: 'AFR66', airline: 'Air France', route: 'CDG → LAX', aircraft: 'Airbus A350-900', altitude: '37,000 ft', speed: '505 kt', status: 'En route', color: 'teal' },
  { callsign: 'KLM602', airline: 'KLM Royal Dutch', route: 'LAX → AMS', aircraft: 'Boeing 787-10', altitude: '22,800 ft', speed: '421 kt', status: 'Climbing', color: 'pink' },
]

const navGroups = [
  { title: 'WORKSPACE', items: [{ label: 'Live overview', icon: Compass }, { label: 'Flight explorer', icon: Plane }, { label: 'Airports', icon: MapPin }] },
  { title: 'TOOLS', items: [{ label: 'Airspace layers', icon: Layers3 }, { label: 'Alerts & watchlist', icon: Bell }] },
]

function App() {
  const [activeNav, setActiveNav] = useState('Live overview')
  const [query, setQuery] = useState('')
  const [selectedFlight, setSelectedFlight] = useState('BAW287')
  const [mobileNav, setMobileNav] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [showRoutes, setShowRoutes] = useState(true)
  const [notifications, setNotifications] = useState(false)

  const visibleFlights = useMemo(() => flights.filter((flight) =>
    [flight.callsign, flight.airline, flight.route, flight.aircraft].some((value) => value.toLowerCase().includes(query.toLowerCase()))
  ), [query])
  const selected = flights.find((flight) => flight.callsign === selectedFlight) ?? flights[0]

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><Plane size={19} strokeWidth={2.3} /></div>
          <div className="brand-copy"><span>AVIORA<span className="brand-light"> LIVE</span></span><small>AVIATION INTELLIGENCE</small></div>
          <button className="icon-button mobile-close" aria-label="Close menu" onClick={() => setMobileNav(false)}><X size={18} /></button>
        </div>
        <div className="workspace-switcher"><div className="workspace-avatar">A</div><div className="workspace-text"><strong>Personal workspace</strong><span>Explorer plan</span></div><ChevronDown size={15} /></div>
        <div className="nav-area">
          {navGroups.map((group) => <div className="nav-group" key={group.title}>
            <div className="nav-heading">{group.title}</div>
            {group.items.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activeNav === label ? 'nav-active' : ''}`} onClick={() => { setActiveNav(label); setMobileNav(false) }}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === 'Alerts & watchlist' && <span className="nav-count">2</span>}</button>)}
          </div>)}
        </div>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={16} /></div><strong>See more of the sky.</strong><p>Unlock advanced filters and custom alerts.</p><button onClick={() => setNotifications(true)}>Explore Aviora <ArrowUpRight size={14} /></button></div>
          <button className="nav-item bottom-link" onClick={() => setNotifications(true)}><CircleHelp size={17} /><span>Help & feedback</span></button>
          <button className="nav-item bottom-link" onClick={() => setNotifications(true)}><Settings2 size={17} /><span>Settings</span></button>
          <div className="profile-row"><div className="profile-avatar">AL</div><div className="profile-text"><strong>Aviora Explorer</strong><span>Free account</span></div><MoreDots /></div>
        </div>
      </aside>

      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div className="breadcrumb">Workspace <span>/</span> <strong>{activeNav}</strong></div></div>
          <div className="topbar-actions"><div className="system-status"><span className="status-dot" /> Systems operational</div><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotifications(!notifications)}><Bell size={18} /><i /></button><div className="top-avatar">A</div></div>
        </header>

        {notifications && <div className="notice-popover"><button className="notice-close" onClick={() => setNotifications(false)} aria-label="Close"><X size={15} /></button><strong>You're all caught up</strong><p>This demo workspace doesn't have account notifications yet.</p></div>}

        <div className="page-content">
          <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> TUESDAY, OCTOBER 28, 2026</div><h1>Your window to the world.</h1><p className="page-subtitle">A clearer view of the skies, from takeoff to touchdown.</p></div><button className="outline-button" onClick={() => setLayersOpen(!layersOpen)}><SlidersHorizontal size={15} /> Customize view</button></section>

          <section className="stats-grid" aria-label="Air traffic overview">
            <StatCard label="Aircraft in view" value="24,681" change="+4.8%" trend="up" detail="vs. previous hour" icon={<Plane size={17} />} />
            <StatCard label="Flights airborne" value="18,204" change="+2.1%" trend="up" detail="globally tracked" icon={<Activity size={17} />} />
            <StatCard label="Airports active" value="3,842" change="98.2%" trend="up" detail="operational estimate" icon={<Globe2 size={17} />} />
            <StatCard label="Avg. ground delay" value="12.4 min" change="−1.6 min" trend="down" detail="across monitored hubs" icon={<Radio size={17} />} />
          </section>

          <section className="map-section">
            <div className="section-heading"><div><h2>Global airspace</h2><p>Explore the movement of aircraft across the world</p></div><div className="map-heading-actions"><span className="demo-tag"><span /> DEMO DATA</span><button className="icon-button" aria-label="Center map" onClick={() => setSelectedFlight('BAW287')}><Crosshair size={17} /></button></div></div>
            <div className="map-layout">
              <div className="map-canvas">
                <div className="map-grid" />
                <svg className="map-art" viewBox="0 0 900 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <defs><pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#2d465c" opacity=".65" /></pattern></defs>
                  <rect width="900" height="420" fill="url(#dots)" />
                  <g fill="#152a3a" stroke="#294458" strokeWidth="1.2" opacity=".9">
                    <path d="M53 74 L98 48 147 57 175 81 214 88 233 119 207 145 177 149 160 178 126 186 108 218 81 209 69 173 45 153 37 115Z" />
                    <path d="M191 222 L224 236 245 266 236 299 257 329 239 376 220 392 204 357 196 320 177 286 169 250Z" />
                    <path d="M374 81 L409 67 448 76 467 94 495 99 515 125 494 144 464 137 451 158 424 153 409 127 384 119Z" />
                    <path d="M416 167 L457 165 489 191 502 231 484 269 470 306 444 331 424 299 410 261 391 222 397 187Z" />
                    <path d="M495 78 L552 54 612 64 654 87 706 81 755 108 801 115 832 146 807 171 764 164 734 188 696 177 666 203 635 193 617 163 577 157 549 132 519 129Z" />
                    <path d="M705 245 L741 232 780 248 800 275 781 302 748 313 720 291Z" />
                    <path d="M332 60 L349 51 362 66 351 80Z" /><path d="M605 231 L621 226 633 239 620 252Z" />
                  </g>
                  {showRoutes && <g fill="none" stroke="#59b7e9" strokeWidth="1.3" strokeDasharray="4 6" opacity=".85">
                    <path d="M160 116 Q300 15 433 105" /><path d="M433 105 Q585 28 718 136" /><path d="M214 137 Q380 205 466 207" /><path d="M466 207 Q630 253 753 275" /><path d="M433 105 Q463 180 466 207" /><path d="M718 136 Q770 205 753 275" />
                  </g>}
                  {showLabels && <g fill="#86a8be" fontSize="10" fontFamily="DM Sans, sans-serif" letterSpacing="1.4"><text x="105" y="103">NORTH AMERICA</text><text x="408" y="51">EUROPE</text><text x="585" y="94">ASIA</text><text x="421" y="270">AFRICA</text><text x="695" y="330">OCEANIA</text></g>}
                  <g>
                    {[[160,116,'BAW287'],[433,105,'UAE4'],[466,207,'DLH401'],[718,136,'AFR66'],[753,275,'KLM602'],[322,145,'UAL12'],[550,180,'QTR8'],[617,119,'SIA21']].map(([x,y,label], i) => <g key={String(label)} transform={`translate(${x},${y})`}><circle r="12" fill="#48b8ec" opacity=".11" /><circle r="5" fill="#5dc5f4" opacity=".2" /><circle r="2.5" fill="#9be2ff" /><path d="M-3 -2 L0 -9 3 -2 8 1 3 2 0 7 -3 2 -8 1Z" fill="#b7ecff" transform={`rotate(${i * 41})`} /><title>{String(label)}</title></g>)}
                  </g>
                </svg>
                <div className="map-top-controls"><div className="map-search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search callsign, route, airline..." aria-label="Search flights" /><kbd>⌘ K</kbd></div><button className={`map-control ${layersOpen ? 'map-control-on' : ''}`} onClick={() => setLayersOpen(!layersOpen)}><Layers3 size={16} /> Layers</button></div>
                {layersOpen && <div className="layers-panel"><strong>Map layers</strong><label><input type="checkbox" checked={showRoutes} onChange={(e) => setShowRoutes(e.target.checked)} /> Flight routes</label><label><input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> Region labels</label><span>Changes apply to this demo map.</span></div>}
                <div className="map-legend"><span><i className="legend-plane" /> Aircraft</span><span><i className="legend-route" /> Flight path</span><span><i className="legend-dot" /> Selected flight</span></div>
                <div className="map-zoom"><button aria-label="Zoom in" onClick={() => setNotifications(true)}>+</button><button aria-label="Zoom out" onClick={() => setNotifications(true)}>−</button></div>
                <div className="map-attribution">Illustrative airspace map · Not for navigation</div>
              </div>
              <aside className="flight-detail">
                <div className="detail-header"><div><span className="detail-kicker">SELECTED FLIGHT</span><h3>{selected.callsign}</h3></div><span className="live-pill"><i /> DEMO</span></div>
                <div className="route-display"><div className="airport-code">{selected.route.split(' → ')[0]}<small>ORIGIN</small></div><div className="route-line"><Plane size={16} /><span /></div><div className="airport-code airport-end">{selected.route.split(' → ')[1]}<small>DESTINATION</small></div></div>
                <div className="detail-airline">{selected.airline}<span>{selected.aircraft}</span></div>
                <div className="detail-metrics"><div><span>ALTITUDE</span><strong>{selected.altitude}</strong></div><div><span>GROUND SPEED</span><strong>{selected.speed}</strong></div></div>
                <div className="detail-status"><span>Status</span><strong><i /> {selected.status}</strong></div>
                <button className="detail-button" onClick={() => setActiveNav('Flight explorer')}>Open flight details <ArrowUpRight size={15} /></button>
                <div className="detail-footnote"><ShieldCheck size={14} /> Illustrative flight information</div>
              </aside>
            </div>
          </section>

          <section className="activity-section"><div className="section-heading activity-heading"><div><h2>Flight activity</h2><p>A snapshot of flights in this demo workspace</p></div><button className="text-button" onClick={() => setActiveNav('Flight explorer')}>View flight explorer <ArrowUpRight size={14} /></button></div>
            <div className="table-wrap"><table><thead><tr><th>FLIGHT</th><th>ROUTE</th><th>AIRCRAFT</th><th>ALTITUDE</th><th>SPEED</th><th>STATUS</th><th /></tr></thead><tbody>
              {visibleFlights.map((flight) => <tr key={flight.callsign} className={selectedFlight === flight.callsign ? 'selected-row' : ''} onClick={() => setSelectedFlight(flight.callsign)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setSelectedFlight(flight.callsign) }}>
                <td><div className="flight-id"><span className={`airline-mark ${flight.color}`}><Plane size={14} /></span><div><strong>{flight.callsign}</strong><small>{flight.airline}</small></div></div></td><td><span className="route-cell">{flight.route}</span></td><td>{flight.aircraft}</td><td>{flight.altitude}</td><td>{flight.speed}</td><td><span className={`flight-status status-${flight.status.toLowerCase()}`}><i />{flight.status}</span></td><td><ArrowUpRight size={15} className="row-arrow" /></td>
              </tr>)}
              {visibleFlights.length === 0 && <tr><td colSpan={7} className="empty-state">No demo flights match “{query}”. Try an airline, callsign, or route.</td></tr>}
            </tbody></table></div>
            <div className="table-footer"><span>Showing {visibleFlights.length} of {flights.length} demo flights</span><span><span className="footer-dot" /> Sample data only</span></div>
          </section>
          <footer className="page-footer"><span>© 2026 Aviora Live</span><span>Built for a clearer view of the skies.</span><a href="https://github.com/avioralive/Aviora-Live" target="_blank" rel="noreferrer">Project repository <ArrowUpRight size={12} /></a></footer>
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, change, trend, detail, icon }: { label: string; value: string; change: string; trend: 'up' | 'down'; detail: string; icon: React.ReactNode }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-bottom"><span className={`stat-change ${trend === 'down' ? 'change-good' : ''}`}>{trend === 'down' ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}{change}</span><span>{detail}</span></div><div className="stat-spark"><svg viewBox="0 0 100 25" preserveAspectRatio="none"><path d={trend === 'down' ? 'M0 19 L12 17 L22 20 L35 10 L45 15 L57 8 L70 13 L83 4 L100 7' : 'M0 21 L12 17 L22 19 L35 10 L45 14 L57 6 L70 11 L83 3 L100 5'} fill="none" stroke="currentColor" strokeWidth="1.5" /></svg></div></div>
}

function MoreDots() {
  return <span className="more-dots" aria-hidden="true"><i /><i /><i /></span>
}

export default App