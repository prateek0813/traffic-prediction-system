import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import { ArrowDown, ArrowRight, ArrowUpRight, BarChart3, Clock3, LocateFixed, ShieldCheck, Waves } from 'lucide-react'
import { api } from '../lib/api'

export default function LandingPage() {
  const [locations, setLocations] = useState([])

  useEffect(() => {
    api.get('/api/locations?limit=15').then(({ data }) => setLocations(data)).catch(() => setLocations([]))
  }, [])

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Link className="landing-brand" to="/" aria-label="Flowstate home"><span className="brand-symbol"><Waves size={20} /></span><span>FLOWSTATE</span></Link>
        <div className="landing-nav-links"><a href="#intelligence">Intelligence</a><a href="#method">Method</a></div>
        <div className="landing-nav-actions"><Link className="landing-signin" to="/login">Sign in</Link><Link className="button button-light landing-cta" to="/register">Open workspace <ArrowUpRight size={16} /></Link></div>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-map" aria-hidden="true">
            <MapContainer center={[12.965, 77.625]} zoom={12} scrollWheelZoom={false} zoomControl={false} dragging={false} doubleClickZoom={false} touchZoom={false} keyboard={false}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {locations.map((location, index) => <CircleMarker key={location.id} center={[location.latitude, location.longitude]} radius={index % 4 === 0 ? 8 : 5} pathOptions={{ color: '#b7db68', weight: 2, fillColor: '#b7db68', fillOpacity: 0.74 }} />)}
            </MapContainer>
          </div>
          <div className="landing-hero-overlay" />
          <div className="landing-hero-content">
            <div className="landing-kicker"><span className="status-pulse" /> URBAN FLOW, READ AHEAD</div>
            <h1 id="landing-title">Traffic Prediction<br /><em>System</em></h1>
            <p>Understand Bengaluru's road pulse. Predict congestion before it builds, and make better decisions with a live view of the network.</p>
            <div className="landing-hero-actions"><Link className="button button-lime" to="/register">Enter the workspace <ArrowRight size={17} /></Link><a className="text-link-light" href="#intelligence">Explore the system <ArrowDown size={16} /></a></div>
          </div>
          <div className="map-coordinate"><LocateFixed size={14} /> 12°58' N · 77°35' E <span>BEN</span></div>
          <div className="landing-live-label"><span className="status-pulse" /> NETWORK VIEW <span>15 monitored corridors</span></div>
        </section>

        <section className="landing-signal-row" id="intelligence">
          <div className="signal-intro"><span className="eyebrow">TRAFFIC, WITH CONTEXT</span><h2>From scattered signals<br />to a clearer route forward.</h2></div>
          <div className="signal-feature"><span className="feature-index">01</span><BarChart3 size={22} /><h3>Forecast the hour</h3><p>Compare expected vehicle flow and road speeds for a selected place and time.</p></div>
          <div className="signal-feature"><span className="feature-index">02</span><LocateFixed size={22} /><h3>Read the network</h3><p>See reported congestion conditions across key Bengaluru junctions.</p></div>
          <div className="signal-feature"><span className="feature-index">03</span><Clock3 size={22} /><h3>Plan with history</h3><p>Explore observed patterns and track the forecasts you've requested.</p></div>
        </section>

        <section className="landing-method" id="method">
          <div className="method-heading"><span className="eyebrow">A PRACTICAL SIGNAL LOOP</span><h2>Observe. Forecast. Move.</h2><p>Hourly traffic observations inform a model that estimates what the next stretch of road may feel like.</p></div>
          <div className="method-steps">
            <article><span>01</span><div><h3>Collect</h3><p>Hourly counts, speed, weather and calendar context form the network baseline.</p></div></article>
            <article><span>02</span><div><h3>Estimate</h3><p>Choose a junction, date and conditions to receive a congestion forecast.</p></div></article>
            <article><span>03</span><div><h3>Review</h3><p>Compare live reports, past patterns and route alternatives in one workspace.</p></div></article>
          </div>
          <Link className="button button-dark" to="/register">Create your workspace <ArrowRight size={17} /></Link>
        </section>
      </main>

      <footer className="landing-footer"><span><Waves size={16} /> FLOWSTATE</span><span><ShieldCheck size={15} /> Indicative predictions for Bengaluru</span><span>Built for clearer journeys</span></footer>
    </div>
  )
}