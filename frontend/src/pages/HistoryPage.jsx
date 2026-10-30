import { useEffect, useMemo, useState } from 'react'
import { Download, Filter, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CongestionBadge, EmptyState, ErrorState, PageHeading, Panel, Skeleton } from '../components/UI'
import { api, getErrorMessage } from '../lib/api'
import { downloadCsv, formatDateTime, formatNumber } from '../utils/format'

const PAGE_SIZE = 15

export default function HistoryPage() {
  const [mode, setMode] = useState('traffic')
  const [locations, setLocations] = useState([])
  const [locationId, setLocationId] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('all')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    api.get('/api/locations?limit=200').then(({ data }) => {
      setLocations(data)
      if (data.length) setLocationId(String(data[0].id))
    }).catch((requestError) => setError(getErrorMessage(requestError, 'Could not load locations.')))
  }, [])

  async function loadRows() {
    setLoading(true)
    setError('')
    try {
      if (mode === 'traffic') {
        if (!locationId) {
          setRows([])
          setTotal(0)
          return
        }
        const { data } = await api.get('/api/traffic/history', { params: { location_id: Number(locationId), limit: 500, offset: 0 } })
        setRows(data.items.map((row) => ({ ...row, type: 'Traffic observation' })))
        setTotal(data.total)
      } else {
        const { data } = await api.get('/api/predictions/history', { params: { limit: 200, offset: 0 } })
        setRows(data.items.map((row) => ({ ...row, type: 'Prediction' })))
        setTotal(data.total)
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not load history.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRows() }, [mode, locationId])
  useEffect(() => { setPage(0) }, [mode, locationId, search, level, sort])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      const locationName = locations.find((location) => location.id === row.location_id)?.name || ''
      const matchesSearch = !query || locationName.toLowerCase().includes(query) || row.congestion_level.toLowerCase().includes(query) || row.weather?.toLowerCase().includes(query)
      const matchesLevel = level === 'all' || row.congestion_level === level
      return matchesSearch && matchesLevel
    }).sort((a, b) => {
      const direction = sort === 'oldest' ? 1 : -1
      return direction * (new Date(a.predicted_for || a.timestamp).getTime() - new Date(b.predicted_for || b.timestamp).getTime())
    })
  }, [rows, locations, search, level, sort])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const pageRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const locationName = locations.find((location) => String(location.id) === locationId)?.name

  function exportRows() {
    const exportData = filteredRows.map((row) => ({
      type: row.type,
      location: locations.find((location) => location.id === row.location_id)?.name || row.location_id,
      recorded_for: row.predicted_for || row.timestamp,
      vehicle_count: row.predicted_vehicle_count ?? row.vehicle_count,
      average_speed_kmh: row.predicted_speed ?? row.avg_speed,
      congestion_level: row.congestion_level,
      weather: row.weather || '',
      confidence: row.confidence ?? '',
    }))
    downloadCsv(`traffic-${mode}-history.csv`, exportData)
  }

  return (
    <>
      <PageHeading eyebrow="HISTORY & ANALYTICS" title="Traffic history" description="Review observations and your saved predictions. Search, filter and export the records you need." actions={<button className="button button-primary" type="button" onClick={exportRows} disabled={!filteredRows.length}><Download size={15} /> Export CSV</button>} />
      {error && <div className="mb-4"><ErrorState message={error} onRetry={loadRows} /></div>}
      <Panel>
        <div className="history-tabs" role="tablist" aria-label="History type">
          <button type="button" role="tab" aria-selected={mode === 'traffic'} className={`segment-button ${mode === 'traffic' ? 'segment-active' : ''}`} onClick={() => setMode('traffic')}>Traffic observations</button>
          <button type="button" role="tab" aria-selected={mode === 'predictions'} className={`segment-button ${mode === 'predictions' ? 'segment-active' : ''}`} onClick={() => setMode('predictions')}>My predictions</button>
        </div>
        <div className="table-toolbar">
          <div className="toolbar-group">
            <label className="search-field"><Search size={15} /><input className="input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search location or level" aria-label="Search history" /></label>
            {mode === 'traffic' && <select className="select filter-select" value={locationId} onChange={(event) => setLocationId(event.target.value)} aria-label="Filter by location">{locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select>}
            <select className="select filter-select" value={level} onChange={(event) => setLevel(event.target.value)} aria-label="Filter by congestion"><option value="all">All congestion</option><option>Low</option><option>Moderate</option><option>High</option><option>Severe</option></select>
          </div>
          <div className="toolbar-group"><Filter size={15} className="muted-icon" /><select className="select filter-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort history"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
        </div>
        {mode === 'traffic' && locationName && <div className="table-context">Showing recent traffic observations for <strong>{locationName}</strong></div>}
        {loading ? <Skeleton className="h-[320px]" /> : pageRows.length ? <>
          <div className="table-wrap"><table className="data-table"><thead><tr>{mode === 'traffic' && <th>LOCATION</th>}<th>{mode === 'traffic' ? 'RECORDED AT' : 'PREDICTED FOR'}</th><th>VEHICLES</th><th>AVG. SPEED</th><th>CONGESTION</th>{mode === 'traffic' ? <th>WEATHER</th> : <th>CONFIDENCE</th>}</tr></thead><tbody>{pageRows.map((row) => <tr key={`${mode}-${row.id}`}>
            {mode === 'traffic' && <td className="cell-primary">{locations.find((location) => location.id === row.location_id)?.name || `Location ${row.location_id}`}</td>}
            <td>{formatDateTime(row.predicted_for || row.timestamp)}</td>
            <td>{formatNumber(row.predicted_vehicle_count ?? row.vehicle_count)}</td>
            <td>{formatNumber(row.predicted_speed ?? row.avg_speed, 1)} km/h</td>
            <td><CongestionBadge level={row.congestion_level} /></td>
            {mode === 'traffic' ? <td className="cell-muted">{row.weather}</td> : <td className="cell-muted">{formatNumber((row.confidence || 0) * 100)}%</td>}
          </tr>)}</tbody></table></div>
          <div className="pagination"><span>{filteredRows.length ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filteredRows.length)} of ${formatNumber(filteredRows.length)} shown · ${formatNumber(total)} total records` : 'No records'}</span><div className="pagination-actions"><button className="button button-secondary button-small" type="button" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>Previous</button><button className="button button-secondary button-small" type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}>Next</button></div></div>
        </> : <EmptyState title={mode === 'traffic' ? 'No matching observations' : 'No saved predictions yet'} description={mode === 'traffic' ? 'Try another location or clear your filters. Seed data if this is a new installation.' : 'Make a forecast to see it in your personal history.'} action={mode === 'predictions' && <Link className="button button-secondary button-small" to="/app/predict">Create a prediction</Link>} />}
      </Panel>
    </>
  )
}