import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, Gauge, MapPinned, Sparkles, Timer, TrafficCone } from 'lucide-react'
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CongestionBadge, EmptyState, ErrorState, PageHeading, Panel, Skeleton, StatCard } from '../components/UI'
import { api, getErrorMessage } from '../lib/api'
import { congestionColor, formatNumber, hourLabel } from '../utils/format'

const LEVELS = ['Low', 'Moderate', 'High', 'Severe']

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadDashboard() {
    setLoading(true)
    setError('')
    try {
      const [liveResponse, statsResponse, locationsResponse, predictionsResponse] = await Promise.all([
        api.get('/api/traffic/live'),
        api.get('/api/traffic/stats'),
        api.get('/api/locations?limit=100'),
        api.get('/api/predictions/history?limit=100'),
      ])
      const locations = locationsResponse.data
      let hourly = []
      if (locations.length) {
        const history = await api.get(`/api/traffic/history?location_id=${locations[0].id}&limit=24`)
        hourly = [...history.data.items].reverse().map((row) => ({
          time: new Date(row.timestamp).getHours(),
          vehicles: row.vehicle_count,
          speed: row.avg_speed,
        }))
      }
      setData({ live: liveResponse.data, stats: statsResponse.data, locations, predictions: predictionsResponse.data.items, hourly })
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not load dashboard data.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDashboard() }, [])

  const live = data?.live || []
  const busiest = data?.stats?.busiest_locations?.[0]
  const currentLevel = [...live].sort((a, b) => LEVELS.indexOf(b.congestion_level) - LEVELS.indexOf(a.congestion_level))[0]
  const congestionData = LEVELS.map((level) => ({ name: level, value: data?.stats?.congestion_counts?.[level] || 0 })).filter((item) => item.value > 0)
  const peakData = data?.stats?.peak_hours || []

  return (
    <>
      <PageHeading eyebrow="NETWORK OVERVIEW" title="Good to see you." description="A clear view of current traffic conditions and the signals shaping the day." actions={<Link className="button button-primary" to="/app/predict">New prediction <ArrowRight size={15} /></Link>} />
      {error && <div className="mb-4"><ErrorState message={error} onRetry={loadDashboard} /></div>}
      <div className="stat-grid">
        {loading ? Array.from({ length: 4 }, (_, index) => <Skeleton className="h-[119px]" key={index} />) : <>
          <StatCard label="Network congestion" value={currentLevel?.congestion_level || '—'} detail={currentLevel?.location_name || 'No live records'} icon={TrafficCone} tone="amber" />
          <StatCard label="Busiest location" value={busiest?.name || '—'} detail={busiest ? `${formatNumber(busiest.average_vehicles)} avg. vehicles` : 'Awaiting observations'} icon={MapPinned} tone="red" />
          <StatCard label="Average road speed" value={data?.stats?.average_speed_kmh ? `${formatNumber(data.stats.average_speed_kmh, 1)} km/h` : '—'} detail="Across recorded observations" icon={Gauge} tone="blue" />
          <StatCard label="Your predictions" value={formatNumber(data?.predictions?.length || 0)} detail="Saved to your account" icon={Sparkles} tone="green" />
        </>}
      </div>

      <div className="dashboard-grid">
        <Panel title="Hourly traffic flow" subtitle={data?.locations?.[0]?.name ? `Recent observations · ${data.locations[0].name}` : 'Vehicle counts from the latest observations'} action={<Link className="panel-link" to="/app/history">View history <ArrowRight size={13} /></Link>}>
          {loading ? <Skeleton className="chart-wrap" /> : data?.hourly?.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.hourly} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="time" tickFormatter={hourLabel} tick={{ fill: '#829087', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#829087', fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="vehicles" name="Vehicles" stroke="#527c4f" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#c4e86b', stroke: '#527c4f', strokeWidth: 2 }} />
          </LineChart></ResponsiveContainer></div> : <EmptyState title="No traffic history yet" description="Seed the database to see hourly observations here." action={<Link className="button button-secondary button-small" to="/app/map">Open live network</Link>} />}
        </Panel>
        <Panel title="Network congestion" subtitle="Recorded observations by level">
          {loading ? <Skeleton className="chart-wrap chart-wrap-small" /> : congestionData.length ? <>
            <div className="chart-wrap chart-wrap-small"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={congestionData} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={3} stroke="none">{congestionData.map((item) => <Cell key={item.name} fill={congestionColor(item.name)} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart></ResponsiveContainer></div>
            <div className="legend-list">{LEVELS.map((level) => <div className="legend-row" key={level}><span className="legend-name"><i className="legend-dot" style={{ background: congestionColor(level) }} />{level}</span><strong>{formatNumber(data?.stats?.congestion_counts?.[level] || 0)}</strong></div>)}</div>
          </> : <EmptyState title="No congestion data" description="Congestion distribution will appear after traffic records are available." />}
        </Panel>
      </div>

      <div className="dashboard-lower">
        <Panel title="Busiest corridors" subtitle="Ranked by average hourly vehicle count" action={<Link className="panel-link" to="/app/history">Analytics <ArrowRight size={13} /></Link>}>
          {loading ? <Skeleton className="h-[208px]" /> : data?.stats?.busiest_locations?.length ? <div className="chart-wrap chart-wrap-small"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.stats.busiest_locations} layout="vertical" margin={{ top: 0, right: 16, left: 11, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#829087', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={125} tick={{ fill: '#65736b', fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="average_vehicles" name="Average vehicles" stroke="#d5a82f" strokeWidth={2} dot={{ r: 3, fill: '#d5a82f' }} />
          </LineChart></ResponsiveContainer></div> : <EmptyState title="No corridor rankings" description="Seed traffic observations to populate this comparison." />}
        </Panel>
        <Panel title="Peak traffic hours" subtitle="Average vehicle volume by hour" action={<Timer size={16} className="muted-icon" />}>
          {loading ? <Skeleton className="h-[208px]" /> : peakData.length ? <div className="chart-wrap chart-wrap-small"><ResponsiveContainer width="100%" height="100%"><LineChart data={[...peakData].reverse()} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="hour" tickFormatter={hourLabel} tick={{ fill: '#829087', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#829087', fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="average_vehicles" name="Vehicles" stroke="#527c4f" strokeWidth={2.5} dot={{ r: 3, fill: '#c4e86b', stroke: '#527c4f', strokeWidth: 1 }} />
          </LineChart></ResponsiveContainer></div> : <EmptyState title="Peak hours unavailable" description="Peak-hour summaries appear once observations have been seeded." />}
        </Panel>
      </div>
      {!loading && live.length > 0 && <Panel title="Live network snapshot" subtitle="Latest reported conditions across monitored locations" className="mt-4" action={<Link className="panel-link" to="/app/map">Open live map <ArrowRight size={13} /></Link>}>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>LOCATION</th><th>VEHICLES</th><th>AVG. SPEED</th><th>CONGESTION</th></tr></thead><tbody>{live.slice(0, 5).map((item) => <tr key={item.location_id}><td className="cell-primary">{item.location_name}</td><td>{formatNumber(item.vehicle_count)}</td><td>{formatNumber(item.avg_speed, 1)} km/h</td><td><CongestionBadge level={item.congestion_level} /></td></tr>)}</tbody></table></div>
      </Panel>}
    </>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tooltip"><strong>{typeof label === 'number' && label < 24 ? hourLabel(label) : label}</strong>{payload.map((item) => <span key={item.dataKey}>{item.name}: {formatNumber(item.value, 1)}</span>)}</div>
}