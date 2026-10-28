import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Activity, AlertCircle, ArrowDownUp, ArrowUpRight, CheckCircle2, Clock3, Download, Plane, Radio, RefreshCw, Search, Star, UserRound, Wifi } from 'lucide-react'
import FlightMap, { type LiveAircraft } from './FlightMap'
import { createClient, type User } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

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

const AIRLINE_BY_PREFIX: Record<string, { name: string; domain: string }> = {
  EZY: { name: 'easyJet', domain: 'easyjet.com' },
  BAW: { name: 'British Airways', domain: 'britishairways.com' },
  RYR: { name: 'Ryanair', domain: 'ryanair.com' },
  AFR: { name: 'Air France', domain: 'airfrance.com' },
  DLH: { name: 'Lufthansa', domain: 'lufthansa.com' },
  KLM: { name: 'KLM', domain: 'klm.com' },
  UAE: { name: 'Emirates', domain: 'emirates.com' },
  QTR: { name: 'Qatar Airways', domain: 'qatarairways.com' },
  THY: { name: 'Turkish Airlines', domain: 'turkishairlines.com' },
  UAL: { name: 'United Airlines', domain: 'united.com' },
  AAL: { name: 'American Airlines', domain: 'aa.com' },
  DAL: { name: 'Delta Air Lines', domain: 'delta.com' },
  WZZ: { name: 'Wizz Air', domain: 'wizzair.com' },
  EIN: { name: 'Aer Lingus', domain: 'aerlingus.com' },
  VLG: { name: 'Vueling', domain: 'vueling.com' },
  VIR: { name: 'Virgin Atlantic', domain: 'virginatlantic.com' },
  SAS: { name: 'Scandinavian Airlines', domain: 'flysas.com' },
  TUI: { name: 'TUI Airways', domain: 'tui.co.uk' },
}
function airlineFor(plane: LiveAircraft) {
  const flight = callsign(plane).toUpperCase()
  const prefix = flight.match(/^[A-Z]{3}/)?.[0]
  return prefix ? AIRLINE_BY_PREFIX[prefix] : undefined
}


export default function App() {
  const [aircraft, setAircraft] = useState<LiveAircraft[]>([])
  const [selectedHex, setSelectedHex] = useState<string | null>(null)
  const [center, setCenter] = useState<[number, number]>([51.5, -0.12])
  const [query, setQuery] = useState('')
  const [trafficFilter, setTrafficFilter] = useState<'all' | 'airborne' | 'ground' | 'favorites'>('all')
  const [sortBy, setSortBy] = useState<'callsign' | 'altitude' | 'speed'>('callsign')
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('aviora-favorite-aircraft') || '[]') as string[] } catch { return [] }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [accountPage, setAccountPage] = useState(false)
  const [accountEmail, setAccountEmail] = useState('')
  const [accountCode, setAccountCode] = useState('')
  const [accountStage, setAccountStage] = useState<'email' | 'code'>('email')
  const [accountMessage, setAccountMessage] = useState('')
  const [accountBusy, setAccountBusy] = useState(false)
  const [accountUser, setAccountUser] = useState<User | null>(null)
  const requestInFlight = useRef(false)
  const nextRetryAt = useRef(0)
  const failureCount = useRef(0)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getUser().then(({ data }) => setAccountUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setAccountUser(session?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  const requestAccountCode = useCallback(async () => {
    if (!supabase) { setAccountMessage('Account sign-in is not configured yet. Please try again later.'); return }
    if (!accountEmail.trim()) { setAccountMessage('Enter your email address first.'); return }
    setAccountBusy(true); setAccountMessage('')
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: accountEmail.trim(), options: { shouldCreateUser: true } })
      if (error) throw error
      setAccountStage('code')
      setAccountMessage('We sent a verification code to your email. Check your inbox and spam folder.')
    } catch (err) { setAccountMessage(err instanceof Error ? err.message : 'Could not send the verification code.') }
    finally { setAccountBusy(false) }
  }, [accountEmail])

  const verifyAccountCode = useCallback(async () => {
    if (!supabase) { setAccountMessage('Account sign-in is not configured yet. Please try again later.'); return }
    if (!accountCode.trim()) { setAccountMessage('Enter the verification code from your email.'); return }
    setAccountBusy(true); setAccountMessage('')
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: accountEmail.trim(), token: accountCode.trim(), type: 'email' })
      if (error) throw error
      setAccountUser(data.user)
      setAccountMessage('You are signed in.')
      setAccountCode('')
    } catch (err) { setAccountMessage(err instanceof Error ? err.message : 'That code could not be verified. Try again.') }
    finally { setAccountBusy(false) }
  }, [accountEmail, accountCode])

  const signOutAccount = useCallback(async () => {
    if (!supabase) return
    setAccountBusy(true)
    const { error } = await supabase.auth.signOut()
    setAccountMessage(error ? error.message : 'You have signed out.')
    setAccountBusy(false)
  }, [])

  const updateCenter = useCallback((next: [number, number]) => {
    setCenter((current) => Math.abs(current[0] - next[0]) < 0.25 && Math.abs(current[1] - next[1]) < 0.25 ? current : next)
  }, [])

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (requestInFlight.current || Date.now() < nextRetryAt.current) return
    requestInFlight.current = true
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
      failureCount.current = 0
      nextRetryAt.current = 0
      setError('')
      setSelectedHex((current) => current && positioned.some((plane) => plane.hex === current) ? current : positioned[0]?.hex ?? null)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      failureCount.current += 1
      const retryDelay = Math.min(30000, 5000 * Math.pow(2, failureCount.current - 1))
      nextRetryAt.current = Date.now() + retryDelay
      setError((err instanceof Error ? err.message : 'Could not load live aircraft.') + ' Retrying in ' + Math.round(retryDelay / 1000) + 's.')
    } finally {
      requestInFlight.current = false
      if (!signal?.aborted) setLoading(false)
    }
  }, [center])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    const timer = window.setInterval(() => void refresh(), 2000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [refresh])

  useEffect(() => {
    try { localStorage.setItem('aviora-favorite-aircraft', JSON.stringify(favorites)) } catch { /* Storage may be unavailable in private browsing. */ }
  }, [favorites])

  const toggleFavorite = useCallback((hex: string) => {
    setFavorites((current) => current.includes(hex) ? current.filter((item) => item !== hex) : [...current, hex])
  }, [])

  const visibleAircraft = useMemo(() => aircraft.filter((plane) => {
    const matchesQuery = [callsign(plane), plane.hex, plane.r || '', plane.t || '', plane.squawk || '']
      .some((value) => value.toLowerCase().includes(query.toLowerCase().trim()))
    const matchesFilter = trafficFilter === 'all' ||
      (trafficFilter === 'airborne' && plane.alt_baro !== 'ground') ||
      (trafficFilter === 'ground' && plane.alt_baro === 'ground') ||
      (trafficFilter === 'favorites' && favorites.includes(plane.hex))
    return matchesQuery && matchesFilter
  }).sort((a, b) => {
    if (sortBy === 'altitude') return (typeof b.alt_baro === 'number' ? b.alt_baro : -1) - (typeof a.alt_baro === 'number' ? a.alt_baro : -1)
    if (sortBy === 'speed') return (b.gs ?? -1) - (a.gs ?? -1)
    return callsign(a).localeCompare(callsign(b))
  }), [aircraft, query, trafficFilter, favorites, sortBy])

  const exportCsv = useCallback(() => {
    const fields = ['callsign', 'icao_hex', 'registration', 'type', 'latitude', 'longitude', 'altitude_ft', 'ground_speed_kt', 'heading_deg', 'squawk', 'position_age_seconds']
    const rows = visibleAircraft.map((plane) => [callsign(plane), plane.hex, plane.r || '', plane.t || '', plane.lat, plane.lon, plane.alt_baro ?? '', plane.gs ?? '', plane.track ?? '', plane.squawk || '', plane.seen_pos ?? ''])
    const csvCell = (value: string | number) => '"' + String(value).replace(/"/g, '""') + '"'
    const csv = [fields, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'aviora-live-aircraft-' + new Date().toISOString().slice(0, 10) + '.csv'
    link.click()
    URL.revokeObjectURL(url)
  }, [visibleAircraft])
  const selected = aircraft.find((plane) => plane.hex === selectedHex) || null
  const airborne = aircraft.filter((plane) => plane.alt_baro !== 'ground').length
  const averageAltitude = aircraft.filter((plane) => typeof plane.alt_baro === 'number')
  const statusText = error ? (lastUpdated && aircraft.length ? 'Retrying feed · showing last data' : 'Feed unavailable') : loading && !lastUpdated ? 'Connecting to live feed' : 'Live ADS-B feed'

  if (accountPage) return <main className="main-content" style={{ minHeight: '100vh', background: '#f5f7fb', padding: '28px 20px', boxSizing: 'border-box' }}>
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 44, flexWrap: 'wrap' }}>
        <div className="brand-row"><div className="brand-mark"><Plane size={19} strokeWidth={2.3} /></div><div className="brand-copy"><span>AVIORA<span className="brand-light"> LIVE</span></span><small>YOUR PERSONAL FLIGHT DESK</small></div></div>
        <button className="outline-button" onClick={() => setAccountPage(false)}><ArrowUpRight size={14} /> Back to live tracker</button>
      </header>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 28, alignItems: 'stretch' }}>
        <div style={{ background: '#101b31', color: 'white', borderRadius: 20, padding: 32, minHeight: 320, boxSizing: 'border-box' }}>
          <div style={{ color: '#91b8ff', fontSize: 11, letterSpacing: 2, fontWeight: 700, marginBottom: 20 }}>AVIORA LIVE · ACCOUNT</div>
          <h1 style={{ fontSize: 'clamp(30px, 5vw, 44px)', lineHeight: 1.08, margin: '0 0 18px' }}>Your skies.<br />Your favourites.</h1>
          <p style={{ color: '#c2ccdc', lineHeight: 1.7 }}>Sign in to your Aviora Live account to make your flight-tracking experience personal. Your live aircraft tracker remains available whether you sign in or not.</p>
          <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 10, color: '#dce7f8', fontSize: 13 }}><CheckCircle2 size={17} /> Email verification for account security</div>
        </div>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 20, padding: 30, boxSizing: 'border-box', boxShadow: '0 12px 36px rgba(20,35,60,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}><span className="account-popover-icon"><UserRound size={22} /></span><div><h2 style={{ margin: 0, fontSize: 23, color: '#142039' }}>{accountUser ? 'Your account' : 'Welcome to Aviora'}</h2><p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 13 }}>{accountUser ? 'You are signed in' : 'Sign in or create an account with email'}</p></div></div>
          {accountUser ? <><div style={{ padding: 16, borderRadius: 12, background: '#f5f7fb', marginBottom: 18 }}><div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>SIGNED IN AS</div><strong style={{ color: '#142039', overflowWrap: 'anywhere' }}>{accountUser.email}</strong></div><button className="outline-button" disabled={accountBusy} onClick={() => void signOutAccount()}>{accountBusy ? 'Please wait…' : 'Sign out'}</button></> : <form onSubmit={(event) => { event.preventDefault(); void (accountStage === 'email' ? requestAccountCode() : verifyAccountCode()) }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 7 }} htmlFor="account-page-email">Email address</label>
            <input id="account-page-email" type="email" autoComplete="email" required value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} disabled={accountBusy || accountStage === 'code'} placeholder="you@example.com" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 16, padding: '13px 14px', borderRadius: 10, border: '1px solid #d6dce5', background: 'white', color: '#172033', fontSize: 15 }} />
            {accountStage === 'code' && <><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 7 }} htmlFor="account-page-code">Email verification code</label><input id="account-page-code" inputMode="numeric" autoComplete="one-time-code" required value={accountCode} onChange={(event) => setAccountCode(event.target.value)} placeholder="Enter the code from your email" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 16, padding: '13px 14px', borderRadius: 10, border: '1px solid #d6dce5', background: 'white', color: '#172033', fontSize: 15 }} /></>}
            <button className="outline-button" type="submit" disabled={accountBusy} style={{ width: '100%', justifyContent: 'center', padding: '13px 16px' }}>{accountBusy ? 'Please wait…' : accountStage === 'email' ? 'Email me a verification code' : 'Verify code and sign in'}</button>
            {accountStage === 'code' && <button type="button" className="outline-button" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={() => { setAccountStage('email'); setAccountCode(''); setAccountMessage('') }}>Use a different email</button>}
          </form>}
          {accountMessage && <p role="status" style={{ color: '#334155', background: '#f5f7fb', padding: 12, borderRadius: 9, fontSize: 13, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{accountMessage}</p>}
          <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, marginTop: 22 }}>New here? Enter your email and we’ll send a code. Existing users can use the same process to sign in.</p>
        </div>
      </section>
      <footer style={{ color: '#64748b', fontSize: 12, marginTop: 32, textAlign: 'center' }}>© 2026 Aviora Live · Live aircraft tracking remains free to browse</footer>
    </div>
  </main>

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
        <div className="topbar-actions"><div className="system-status"><span className={error ? '' : 'status-dot'} /> {statusText}</div><button className="icon-button" aria-label="Refresh live aircraft" title="Refresh live aircraft" onClick={() => void refresh()}><RefreshCw size={17} /></button><button className="account-button" aria-label="Account" title="Account" aria-expanded={accountOpen} onClick={() => { setAccountOpen(false); setAccountPage(true) }}><UserRound size={18} /><span>Account</span></button>{accountOpen && <div className="account-popover" role="dialog" aria-label="Account information"><div className="account-popover-heading"><span className="account-popover-icon"><UserRound size={20} /></span><div><strong>Aviora account</strong><small>{accountUser ? "Signed in" : "Sign in or create an account"}</small></div></div>{accountUser ? <><p>Signed in as <strong>{accountUser.email}</strong></p><button className="outline-button" disabled={accountBusy} onClick={() => void signOutAccount()}>{accountBusy ? "Please wait…" : "Sign out"}</button></> : <><p>Use your email to receive a one-time verification code.</p><form onSubmit={(event) => { event.preventDefault(); void (accountStage === "email" ? requestAccountCode() : verifyAccountCode()) }}><label style={{ display: "block", fontSize: 12, marginBottom: 5 }} htmlFor="account-email">Email address</label><input id="account-email" type="email" autoComplete="email" required value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} disabled={accountBusy || accountStage === "code"} style={{ width: "100%", boxSizing: "border-box", marginBottom: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid #d6dce5", background: "white", color: "#172033" }} />{accountStage === "code" && <><label style={{ display: "block", fontSize: 12, marginBottom: 5 }} htmlFor="account-code">Verification code</label><input id="account-code" inputMode="numeric" autoComplete="one-time-code" required value={accountCode} onChange={(event) => setAccountCode(event.target.value)} style={{ width: "100%", boxSizing: "border-box", marginBottom: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid #d6dce5", background: "white", color: "#172033" }} /></>}<button className="outline-button" type="submit" disabled={accountBusy} style={{ width: "100%", justifyContent: "center" }}>{accountBusy ? "Please wait…" : accountStage === "email" ? "Email me a code" : "Verify and sign in"}</button>{accountStage === "code" && <button type="button" className="outline-button" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={() => { setAccountStage("email"); setAccountCode(""); setAccountMessage("") }}>Use a different email</button>}</form></>}{accountMessage && <p role="status" style={{ fontSize: 12, overflowWrap: "anywhere" }}>{accountMessage}</p>}<button className="outline-button" onClick={() => { setAccountOpen(false); setTrafficFilter("favorites"); document.querySelector(".activity-section")?.scrollIntoView({ behavior: "smooth", block: "start" }) }}><Star size={14} /> View saved aircraft</button></div>}</div>
      </header>

      <div className="page-content">
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> LIVE AIR TRAFFIC · ADS-B</div><h1>Your window to the real skies.</h1><p className="page-subtitle">Aircraft positions reported by live ADS-B receivers. Pan the map to load traffic in another area.</p></div><div className="demo-tag"><span /> REAL DATA</div></section>

        {error && <div className="notice-popover" role="alert" style={{ position: 'relative', inset: 'auto', width: '100%', marginBottom: 18 }}><strong><AlertCircle size={15} style={{ verticalAlign: 'middle', marginRight: 7 }} /> Live feed unavailable</strong><p>{error}</p><p>No invented aircraft are shown. Try refreshing in a moment.</p><button className="outline-button" onClick={() => void refresh()}><RefreshCw size={14} /> Retry live feed</button></div>}

        <section className="stats-grid" aria-label="Live aircraft statistics">
          <StatCard label="Aircraft in area" value={loading && !lastUpdated ? '…' : aircraft.length.toLocaleString()} detail="positioned aircraft returned" icon={<Plane size={17} />} />
          <StatCard label="Not on ground" value={loading && !lastUpdated ? '…' : airborne.toLocaleString()} detail="from current live snapshot" icon={<Activity size={17} />} />
          <StatCard label="Aircraft with altitude" value={averageAltitude.length.toLocaleString()} detail="valid altitude reports" icon={<Radio size={17} />} />
          <StatCard label="Feed check" value="2 sec" detail={lastUpdated ? 'last update ' + new Date(lastUpdated).toLocaleTimeString() : 'waiting for first response'} icon={<Clock3 size={17} />} />
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
                <div className="detail-header"><div className="detail-airline-heading">{airlineFor(selected) && <img className="airline-logo-large" src={"https://www.google.com/s2/favicons?domain=" + airlineFor(selected)!.domain + "&sz=64"} alt={airlineFor(selected)!.name + " logo"} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none" }} />}<div><span className="detail-kicker">LIVE AIRCRAFT</span><h3>{callsign(selected)}</h3>{airlineFor(selected) && <span className="airline-name">{airlineFor(selected)!.name}</span>}</div></div><span className="live-pill"><i /> LIVE</span></div>
                <div className="detail-actions"><button className={'outline-button favorite-button' + (favorites.includes(selected.hex) ? ' is-favorite' : '')} onClick={() => toggleFavorite(selected.hex)} aria-pressed={favorites.includes(selected.hex)}><Star size={14} fill={favorites.includes(selected.hex) ? 'currentColor' : 'none'} /> {favorites.includes(selected.hex) ? 'Saved aircraft' : 'Save aircraft'}</button></div>
                <div className="route-display"><div className="airport-code">{selected.hex.toUpperCase()}<small>ICAO HEX</small></div><div className="route-line"><Plane size={16} /><span /></div><div className="airport-code airport-end">{selected.r || 'Unknown'}<small>REGISTRATION</small></div></div>
                <div className="detail-airline">{selected.t || 'Aircraft type not reported'}<span>{selected.category ? 'Category ' + selected.category : 'Type data supplied when available'}</span></div>
                <div className="detail-metrics"><div><span>ALTITUDE</span><strong>{formatAltitude(selected.alt_baro)}</strong></div><div><span>GROUND SPEED</span><strong>{formatSpeed(selected.gs)}</strong></div><div><span>HEADING</span><strong>{typeof selected.track === 'number' ? Math.round(selected.track) + '°' : '—'}</strong></div><div><span>SQUAWK</span><strong>{selected.squawk || '—'}</strong></div></div>
                <div className="detail-status"><span>Position age</span><strong><i /> {typeof selected.seen_pos === 'number' ? Math.round(selected.seen_pos) + ' sec' : 'Unknown'}</strong></div>
                <div className="detail-footnote"><CheckCircle2 size={14} /> Position reported by ADS-B receivers</div>
              </> : <div className="empty-state" style={{ padding: 24 }}>{loading ? 'Loading real aircraft…' : 'No aircraft selected. Pan the map to another area.'}</div>}
            </aside>
          </div>
        </section>

        <section className="activity-section"><div className="section-heading activity-heading"><div><h2>Aircraft in this area</h2><p>Live transponder reports · search or select a row for details</p></div><button className="outline-button export-button" onClick={exportCsv}><Download size={14} /> Export CSV</button></div>
          <div className="aircraft-tools" aria-label="Aircraft list filters">
            <div className="filter-tabs" role="group" aria-label="Filter aircraft">
              {([{ value: 'all', label: 'All traffic' }, { value: 'airborne', label: 'Airborne' }, { value: 'ground', label: 'On ground' }, { value: 'favorites', label: '★ Saved' }] as const).map((item) => <button key={item.value} className={trafficFilter === item.value ? 'filter-tab filter-tab-active' : 'filter-tab'} onClick={() => setTrafficFilter(item.value)} aria-pressed={trafficFilter === item.value}>{item.label}</button>)}
            </div>
            <label className="sort-control"><ArrowDownUp size={14} /><span>Sort</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'callsign' | 'altitude' | 'speed')}><option value="callsign">Callsign A–Z</option><option value="altitude">Highest altitude</option><option value="speed">Fastest speed</option></select></label>
          </div>
          <div className="table-wrap"><table><thead><tr><th>SAVED</th><th>CALLSIGN / ICAO</th><th>REGISTRATION</th><th>TYPE</th><th>ALTITUDE</th><th>SPEED</th><th>HEADING</th></tr></thead><tbody>
            {visibleAircraft.slice(0, 100).map((plane) => <tr key={plane.hex} className={selectedHex === plane.hex ? 'selected-row' : ''} onClick={() => setSelectedHex(plane.hex)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') setSelectedHex(plane.hex) }}>
              <td><button className={'star-button' + (favorites.includes(plane.hex) ? ' is-favorite' : '')} title={favorites.includes(plane.hex) ? 'Remove saved aircraft' : 'Save aircraft'} aria-label={favorites.includes(plane.hex) ? 'Remove saved aircraft ' + callsign(plane) : 'Save aircraft ' + callsign(plane)} aria-pressed={favorites.includes(plane.hex)} onClick={(event) => { event.stopPropagation(); toggleFavorite(plane.hex) }}><Star size={14} fill={favorites.includes(plane.hex) ? 'currentColor' : 'none'} /></button></td>
              <td><div className="flight-id">{airlineFor(plane) ? <img className="airline-logo-table" src={"https://www.google.com/s2/favicons?domain=" + airlineFor(plane)!.domain + "&sz=64"} alt={airlineFor(plane)!.name + " logo"} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none" }} /> : <span className="airline-mark blue"><Plane size={14} /></span>}<div><strong>{callsign(plane)}</strong><small>{plane.hex.toUpperCase()}</small></div></div></td><td>{plane.r || '—'}</td><td>{plane.t || '—'}</td><td>{formatAltitude(plane.alt_baro)}</td><td>{formatSpeed(plane.gs)}</td><td>{typeof plane.track === 'number' ? Math.round(plane.track) + '°' : '—'}</td>
            </tr>)}
            {!loading && visibleAircraft.length === 0 && <tr><td colSpan={7} className="empty-state">{error ? 'Live data could not be loaded.' : query ? 'No live aircraft match that search.' : 'No aircraft positions reported in this area. Pan the map or zoom out.'}</td></tr>}
          </tbody></table></div>
          <div className="table-footer"><span>Showing {Math.min(visibleAircraft.length, 100)} of {visibleAircraft.length} matching aircraft · 250 NM radius</span><span><span className="footer-dot" /> {lastUpdated ? 'Updated ' + new Date(lastUpdated).toLocaleTimeString() : 'Waiting for live feed'}</span></div>
        </section>
        <footer className="page-footer"><span>© 2026 Aviora Live</span><span>Live aircraft data: adsb.lol · Map data: OpenStreetMap</span><a href="https://github.com/avioralive/Aviora-Live" target="_blank" rel="noreferrer">Project repository <ArrowUpRight size={12} /></a></footer>
      </div>
    </main>
  </div>
}

function StatCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-bottom"><span>{detail}</span></div></div>
}
