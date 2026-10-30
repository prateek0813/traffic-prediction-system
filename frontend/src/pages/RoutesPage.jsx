import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, Clock3, LocateFixed, MapPinned, Route as RouteIcon } from 'lucide-react'
import { CircleMarker, MapContainer, Polyline, TileLayer } from 'react-leaflet'
import { EmptyState, ErrorState, PageHeading, Panel } from '../components/UI'
import { useToast } from '../context/ToastContext'
import { api, getErrorMessage } from '../lib/api'
import { formatNumber } from '../utils/format'

export default function RoutesPage() {
  const [locations, setLocations] = useState([])
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [saveRoute, setSaveRoute] = useState(false)
  const [result, setResult] = useState(null)
  const [selectedRoute, setSelectedRoute] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const notify = useToast()

  useEffect(() => {
    api.get('/api/locations?limit=200').then(({ data }) => {
      setLocations(data)
      if (data.length > 1) {
        setFromId(String(data[0].id))
        setToId(String(data[1].id))
      }
    }).catch((requestError) => setError(getErrorMessage(requestError, 'Could not load the location list.')))
  }, [])

  async function findRoute(event) {
    event.preventDefault()
    setError('')
    setResult(null)
    if (!fromId || !toId || fromId === toId) {
      setError('Choose two different locations.')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/api/route-suggestion', {
        from_location_id: Number(fromId),
        to_location_id: Number(toId),
        save_route: saveRoute,
      })
      setResult(data)
      setSelectedRoute(0)
      notify(saveRoute ? 'Route suggestion created and saved.' : 'Route suggestion ready.')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not find a route suggestion.'))
    } finally {
      setLoading(false)
    }
  }

  const options = result ? [result.recommended, ...result.alternatives] : []
  const active = options[selectedRoute]
  const pathLocations = active?.location_ids.map((id) => locations.find((location) => location.id === id)).filter(Boolean) || []
  const center = pathLocations.length ? [pathLocations.reduce((sum, item) => sum + item.latitude, 0) / pathLocations.length, pathLocations.reduce((sum, item) => sum + item.longitude, 0) / pathLocations.length] : [12.9716, 77.5946]

  return (
    <>
      <PageHeading eyebrow="ROUTE PLANNER" title="Find a clearer way" description="Compare direct and one-stop options using the latest available traffic speeds." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <div className="route-layout">
        <Panel title="Trip details" subtitle="Choose your source and destination">
          <form className="form-stack" onSubmit={findRoute}>
            <div className="field"><label htmlFor="route-from">From</label><select className="select" id="route-from" value={fromId} onChange={(event) => setFromId(event.target.value)} required><option value="">Choose a starting point</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div>
            <div className="route-direction"><ArrowDown size={16} /><span>Destination</span></div>
            <div className="field"><label htmlFor="route-to">To</label><select className="select" id="route-to" value={toId} onChange={(event) => setToId(event.target.value)} required><option value="">Choose a destination</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div>
            <label className="check-row"><input type="checkbox" checked={saveRoute} onChange={(event) => setSaveRoute(event.target.checked)} /><span>Save this route to my account</span></label>
            <button type="submit" className="button button-primary button-block" disabled={loading || locations.length < 2}>{loading ? 'Comparing options...' : 'Compare routes'} <RouteIcon size={15} /></button>
          </form>
          <div className="route-data-note"><MapPinned size={15} /><span>Travel times are estimates based on straight-line segments, not a road graph.</span></div>
        </Panel>
        <Panel title="Route comparison" subtitle={result ? `${options.length} options · ${new Date(result.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Your alternatives will appear here'}>
          {!result ? <EmptyState title="No route selected" description="Choose a source and destination to compare estimated travel time and congestion." /> : <div className="route-results">
            <div className="route-options">{options.map((option, index) => <button type="button" key={`${option.location_ids.join('-')}-${index}`} onClick={() => setSelectedRoute(index)} className={`route-option route-option-button ${selectedRoute === index ? 'route-option-recommended' : ''}`}>
              <div className="route-option-head"><h3>{index === 0 ? 'Recommended' : `Alternative ${index}`}</h3>{index === 0 && <span className="recommend-label">BEST ESTIMATE</span>}</div>
              <div className="route-path">{option.location_names.map((name, pathIndex) => <span className="route-stop" key={`${name}-${pathIndex}`}>{pathIndex > 0 && <ArrowRight size={12} />}<strong>{name}</strong></span>)}</div>
              <div className="route-metrics"><span><Clock3 size={13} /> <strong>{formatNumber(option.estimated_travel_minutes, 1)} min</strong></span><span>{formatNumber(option.distance_km, 1)} km</span><span>Delay <strong>{formatNumber(option.estimated_delay_minutes, 1)} min</strong></span><span className="route-congestion">{option.congestion_level}</span></div>
            </button>)}</div>
            {pathLocations.length > 1 && <div className="route-map"><MapContainer center={center} zoom={11} scrollWheelZoom={false} key={pathLocations.map((item) => item.id).join('-')}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Polyline positions={pathLocations.map((item) => [item.latitude, item.longitude])} pathOptions={{ color: '#71964c', weight: 5, opacity: .8 }} />{pathLocations.map((location, index) => <CircleMarker key={location.id} center={[location.latitude, location.longitude]} radius={index === 0 || index === pathLocations.length - 1 ? 8 : 6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#315840', fillOpacity: 1 }} />)}</MapContainer></div>}
            <p className="route-disclaimer">{result.note}</p>
          </div>}
        </Panel>
      </div>
    </>
  )
}