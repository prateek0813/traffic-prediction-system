import { useEffect, useState } from 'react'
import { Cloud, CloudFog, CloudRain, CloudSun, Gauge, Sparkles, TrafficCone } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CongestionBadge, EmptyState, ErrorState, PageHeading, Panel } from '../components/UI'
import { useToast } from '../context/ToastContext'
import { api, getErrorMessage } from '../lib/api'
import { formatNumber } from '../utils/format'

const WEATHER = [
  { value: 'Clear', icon: CloudSun },
  { value: 'Cloudy', icon: Cloud },
  { value: 'Rainy', icon: CloudRain },
  { value: 'Foggy', icon: CloudFog },
]

export default function PredictPage() {
  const [locations, setLocations] = useState([])
  const [locationId, setLocationId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5))
  const [weather, setWeather] = useState('Clear')
  const [isHoliday, setIsHoliday] = useState(false)
  const [result, setResult] = useState(null)
  const [forecast, setForecast] = useState([])
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const notify = useToast()

  useEffect(() => {
    api.get('/api/locations?limit=200').then(({ data }) => {
      setLocations(data)
      if (data.length) setLocationId(String(data[0].id))
    }).catch((requestError) => setError(getErrorMessage(requestError, 'Could not load locations.'))).finally(() => setLoadingLocations(false))
  }, [])

  async function submitPrediction(event) {
    event.preventDefault()
    setError('')
    setResult(null)
    setForecast([])
    if (!locationId || !date || !time) {
      setError('Choose a location, date and time to run a prediction.')
      return
    }
    const predictedFor = new Date(`${date}T${time}`)
    if (Number.isNaN(predictedFor.getTime())) {
      setError('Enter a valid date and time.')
      return
    }
    setSubmitting(true)
    try {
      const { data } = await api.post('/api/predict', {
        location_id: Number(locationId),
        predicted_for: predictedFor.toISOString(),
        weather,
        is_holiday: isHoliday,
      })
      setResult(data)
      const forecastResponse = await api.get(`/api/predict/forecast/${locationId}`, { params: { weather } })
      setForecast(forecastResponse.data.forecast)
      notify('Prediction saved to your history.')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not generate the traffic prediction.'))
    } finally {
      setSubmitting(false)
    }
  }

  const selectedLocation = locations.find((location) => String(location.id) === locationId)
  const forecastData = forecast.map((point) => ({
    hour: new Date(point.timestamp).toLocaleTimeString([], { hour: 'numeric' }),
    vehicles: point.predicted_vehicle_count,
    speed: point.predicted_speed,
    congestion: point.congestion_level,
  }))

  return (
    <>
      <PageHeading eyebrow="MODEL FORECAST" title="Predict traffic" description="Estimate congestion for a Bengaluru location, date and set of conditions." />
      {error && <div className="mb-4"><ErrorState message={error} onRetry={!locations.length ? () => window.location.reload() : undefined} /></div>}
      <div className="prediction-layout">
        <Panel title="Forecast conditions" subtitle="Select the inputs for your estimate">
          <form className="prediction-form" onSubmit={submitPrediction}>
            <div className="field"><label htmlFor="predict-location">Location</label><select className="select" id="predict-location" value={locationId} onChange={(event) => setLocationId(event.target.value)} disabled={loadingLocations || !locations.length} required><option value="">{loadingLocations ? 'Loading locations...' : locations.length ? 'Select a location' : 'No locations available'}</option>{locations.map((location) => <option value={location.id} key={location.id}>{location.name} · {location.city}</option>)}</select></div>
            <div className="form-grid">
              <div className="field"><label htmlFor="predict-date">Date</label><input className="input" id="predict-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></div>
              <div className="field"><label htmlFor="predict-time">Time</label><input className="input" id="predict-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></div>
            </div>
            <div className="field"><span className="field-label">Weather</span><div className="weather-select" role="group" aria-label="Weather conditions">{WEATHER.map(({ value, icon: Icon }) => <button type="button" className={`weather-option ${weather === value ? 'weather-option-active' : ''}`} onClick={() => setWeather(value)} key={value} aria-pressed={weather === value}><Icon size={15} />{value}</button>)}</div></div>
            <label className="check-row"><input type="checkbox" checked={isHoliday} onChange={(event) => setIsHoliday(event.target.checked)} /><span>Public holiday</span></label>
            <button type="submit" className="button button-primary button-block" disabled={submitting || loadingLocations || !locations.length}>{submitting ? 'Generating forecast...' : 'Generate prediction'} <Sparkles size={15} /></button>
          </form>
        </Panel>

        <div className="prediction-results-stack">
          <Panel title="Prediction result" subtitle={selectedLocation?.name || 'Your selected location'} className="prediction-result">
            {!result ? <div className="result-placeholder"><div><TrafficCone size={27} /><h3>Your forecast will appear here</h3><p>Choose the location and conditions, then generate a prediction to see estimated traffic and congestion.</p></div></div> : <>
              <div className="result-banner"><div><span>Expected traffic level</span><CongestionBadge level={result.congestion_level} /></div><div className="result-confidence"><strong>{formatNumber(result.confidence * 100)}%</strong><span>model confidence</span><div className="confidence-track"><span style={{ width: `${Math.min(100, result.confidence * 100)}%` }} /></div></div></div>
              <div className="result-metrics">
                <div className="result-metric"><span>Predicted vehicles</span><strong>{formatNumber(result.predicted_vehicle_count)}</strong></div>
                <div className="result-metric"><span>Average speed</span><strong>{formatNumber(result.predicted_speed, 1)} <small>km/h</small></strong></div>
                <div className="result-metric"><span>Forecast for</span><strong className="result-time">{new Date(result.predicted_for).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong></div>
              </div>
            </>}
          </Panel>
          <Panel title="Next 24 hours" subtitle="Forecast by hour · selected weather" action={forecast.length > 0 && <span className="forecast-count">24 hourly estimates</span>}>
            {!forecast.length ? <EmptyState title="24-hour forecast" description="A location forecast appears after the first prediction." /> : <div className="prediction-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={forecastData} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: '#829087', fontSize: 9 }} axisLine={false} tickLine={false} interval={3} />
              <YAxis yAxisId="left" tick={{ fill: '#829087', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#829087', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ForecastTooltip />} />
              <Line yAxisId="left" type="monotone" dataKey="vehicles" name="Vehicles" stroke="#56814f" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="speed" name="Speed km/h" stroke="#d5a82f" strokeWidth={1.8} dot={false} activeDot={{ r: 4 }} />
            </LineChart></ResponsiveContainer></div>}
          </Panel>
        </div>
      </div>
      {forecast.length > 0 && <Panel title="Hourly outlook" subtitle="Congestion class for each forecast hour" className="mt-4"><div className="forecast-scroll">{forecast.map((point) => <div className="forecast-point" key={point.timestamp}><span>{new Date(point.timestamp).toLocaleTimeString([], { hour: 'numeric' })}</span><CongestionBadge level={point.congestion_level} /><strong className="mt-2">{formatNumber(point.predicted_vehicle_count)}</strong></div>)}</div></Panel>}
    </>
  )
}

function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const congestion = payload[0]?.payload?.congestion
  return <div className="chart-tooltip"><strong>{label}</strong>{payload.map((point) => <span key={point.dataKey}>{point.name}: {formatNumber(point.value, 1)}</span>)}{congestion && <span>Congestion: {congestion}</span>}</div>
}