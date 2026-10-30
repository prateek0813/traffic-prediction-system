import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { Clock3, LocateFixed, RefreshCw, TrafficCone } from 'lucide-react'
import { ErrorState, PageHeading, Panel, Skeleton } from '../components/UI'
import { api, getErrorMessage } from '../lib/api'
import { congestionColor, formatNumber, formatDateTime } from '../utils/format'

const LEVELS = ['Low', 'Moderate', 'High', 'Severe']

export default function LiveMapPage() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)

  async function refresh() {
    setRefreshing(true)
    try {
      const { data } = await api.get('/api/traffic/live')
      setRecords(data)
      setUpdatedAt(new Date())
      setError('')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not load live traffic data.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    refresh()
    const interval = window.setInterval(refresh, 30000)
    return () => window.clearInterval(interval)
  }, [])

  const severeCount = records.filter((record) => record.congestion_level === 'Severe').length
  const highCount = records.filter((record) => record.congestion_level === 'High').length
  const center = records.length ? [records.reduce((sum, item) => sum + item.latitude, 0) / records.length, records.reduce((sum, item) => sum + item.longitude, 0) / records.length] : [12.9716, 77.5946]

  return (
    <>
      <PageHeading eyebrow="LIVE NETWORK" title="Bengaluru traffic map" description="Current reported congestion across monitored junctions. Conditions refresh automatically every 30 seconds." actions={<button type="button" className="button button-secondary" onClick={refresh} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Refresh now</button>} />
      {error && <div className="mb-4"><ErrorState message={error} onRetry={refresh} /></div>}
      <div className="map-summary">
        <span><LocateFixed size={14} /><strong>{formatNumber(records.length)}</strong> locations</span>
        <span><TrafficCone size={14} /><strong>{formatNumber(highCount)}</strong> high congestion</span>
        <span><TrafficCone size={14} /><strong>{formatNumber(severeCount)}</strong> severe congestion</span>
        <span><Clock3 size={14} /> Updated <strong>{updatedAt ? updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '—'}</strong></span>
      </div>
      <Panel className="map-panel" title="Network conditions" subtitle="Circle size reflects reported vehicle volume" action={<span className="map-refresh">Refresh interval · 30 sec</span>}>
        {loading ? <Skeleton className="map-canvas" /> : records.length ? <div className="map-canvas">
          <MapContainer center={center} zoom={11} scrollWheelZoom>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {records.map((record) => <CircleMarker key={record.location_id} center={[record.latitude, record.longitude]} radius={Math.max(7, Math.min(19, 6 + record.vehicle_count / 180))} pathOptions={{ color: congestionColor(record.congestion_level), weight: 2, fillColor: congestionColor(record.congestion_level), fillOpacity: .67 }}>
              <Popup><div className="popup-title">{record.location_name}</div><div className="popup-row"><span>Congestion</span><strong>{record.congestion_level}</strong></div><div className="popup-row"><span>Vehicles</span><strong>{formatNumber(record.vehicle_count)}</strong></div><div className="popup-row"><span>Avg. speed</span><strong>{formatNumber(record.avg_speed, 1)} km/h</strong></div><div className="popup-row"><span>Weather</span><strong>{record.weather}</strong></div><div className="popup-row"><span>Updated</span><strong>{formatDateTime(record.timestamp)}</strong></div></Popup>
            </CircleMarker>)}
          </MapContainer>
        </div> : <div className="map-empty"><div className="empty-state"><div className="empty-mark"><LocateFixed size={20} /></div><h3>No live locations yet</h3><p>Seed traffic observations and refresh the map to see monitored locations.</p><button className="button button-secondary button-small" type="button" onClick={refresh}>Try again</button></div></div>}
        <div className="map-legend">{LEVELS.map((level) => <span key={level}><i style={{ background: congestionColor(level) }} />{level}</span>)}</div>
      </Panel>
    </>
  )
}