import { useEffect, useState } from 'react'
import { Activity, Database, RefreshCw, Save, ShieldCheck, Trash2, Users, X } from 'lucide-react'
import { ErrorState, PageHeading, Panel, Skeleton, StatCard } from '../components/UI'
import { useToast } from '../context/ToastContext'
import { api, getErrorMessage } from '../lib/api'
import { formatDateTime, formatNumber } from '../utils/format'

const emptyLocation = { name: '', city: 'Bengaluru', latitude: '', longitude: '', road_type: 'arterial' }

export default function AdminPage() {
  const [summary, setSummary] = useState(null)
  const [locations, setLocations] = useState([])
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(emptyLocation)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [retraining, setRetraining] = useState(false)
  const [error, setError] = useState('')
  const [trainReport, setTrainReport] = useState(null)
  const notify = useToast()

  async function loadAdmin() {
    setLoading(true)
    setError('')
    try {
      const [summaryResponse, locationsResponse, usersResponse] = await Promise.all([
        api.get('/api/admin/summary'),
        api.get('/api/locations?limit=200'),
        api.get('/api/admin/users?limit=100'),
      ])
      setSummary(summaryResponse.data)
      setLocations(locationsResponse.data)
      setUsers(usersResponse.data)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not load admin data.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAdmin() }, [])

  function changeForm(event, setState) {
    const { name, value } = event.target
    setState((current) => ({ ...current, [name]: value }))
  }

  async function createLocation(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) }
      await api.post('/api/locations', payload)
      setForm(emptyLocation)
      notify('Location added to the network.')
      await loadAdmin()
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not add the location.'))
    } finally {
      setSaving(false)
    }
  }

  function beginEdit(location) {
    setEditingId(location.id)
    setEditForm({ ...location, latitude: String(location.latitude), longitude: String(location.longitude) })
  }

  async function saveLocation(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await api.put(`/api/locations/${editingId}`, {
        ...editForm,
        latitude: Number(editForm.latitude),
        longitude: Number(editForm.longitude),
      })
      setEditingId(null)
      setEditForm(null)
      notify('Location details updated.')
      await loadAdmin()
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not update the location.'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteLocation(location) {
    if (!window.confirm(`Delete ${location.name} and its traffic observations?`)) return
    try {
      await api.delete(`/api/locations/${location.id}`)
      notify(`${location.name} was removed.`)
      await loadAdmin()
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not remove the location.'))
    }
  }

  async function retrain() {
    setRetraining(true)
    setError('')
    try {
      const { data } = await api.post('/api/admin/retrain')
      setTrainReport(data.metrics)
      notify('Traffic model retrained successfully.')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Model retraining failed.'))
    } finally {
      setRetraining(false)
    }
  }

  return (
    <>
      <PageHeading eyebrow="SYSTEM MANAGEMENT" title="Admin console" description="Manage network locations, review accounts and refresh the traffic model." actions={<button type="button" className="button button-secondary" onClick={loadAdmin} disabled={loading}><RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh data</button>} />
      {error && <div className="mb-4"><ErrorState message={error} onRetry={loadAdmin} /></div>}
      <div className="admin-metrics">
        {loading ? Array.from({ length: 5 }, (_, index) => <Skeleton className="h-[99px]" key={index} />) : <>
          <StatCard label="Accounts" value={formatNumber(summary?.users)} icon={Users} tone="blue" />
          <StatCard label="Locations" value={formatNumber(summary?.locations)} icon={ShieldCheck} tone="green" />
          <StatCard label="Traffic records" value={formatNumber(summary?.traffic_records)} icon={Database} tone="amber" />
          <StatCard label="Predictions" value={formatNumber(summary?.predictions)} icon={Activity} tone="red" />
          <StatCard label="Saved routes" value={formatNumber(summary?.saved_routes)} icon={Activity} tone="green" />
        </>}
      </div>

      <Panel title="Network locations" subtitle="Create, update or remove monitored junctions" className="admin-section">
        <form className="location-form" onSubmit={createLocation}>
          <div className="field"><label htmlFor="new-name">Location name</label><input id="new-name" className="input" name="name" value={form.name} onChange={(event) => changeForm(event, setForm)} required minLength={2} placeholder="Junction name" /></div>
          <div className="field"><label htmlFor="new-city">City</label><input id="new-city" className="input" name="city" value={form.city} onChange={(event) => changeForm(event, setForm)} required /></div>
          <div className="field"><label htmlFor="new-latitude">Latitude</label><input id="new-latitude" className="input" name="latitude" type="number" step="any" min="-90" max="90" value={form.latitude} onChange={(event) => changeForm(event, setForm)} required /></div>
          <div className="field"><label htmlFor="new-longitude">Longitude</label><input id="new-longitude" className="input" name="longitude" type="number" step="any" min="-180" max="180" value={form.longitude} onChange={(event) => changeForm(event, setForm)} required /></div>
          <div className="field"><label htmlFor="new-road-type">Road type</label><select className="select" id="new-road-type" name="road_type" value={form.road_type} onChange={(event) => changeForm(event, setForm)}><option value="arterial">Arterial</option><option value="highway">Highway</option><option value="urban">Urban</option></select></div>
          <button type="submit" className="button button-primary button-small" disabled={saving}>{saving ? 'Adding...' : 'Add location'}</button>
        </form>
        <div className="table-wrap admin-table"><table className="data-table"><thead><tr><th>LOCATION</th><th>CITY</th><th>COORDINATES</th><th>ROAD TYPE</th><th>ACTIONS</th></tr></thead><tbody>
          {locations.map((location) => <tr key={location.id}>{editingId === location.id && editForm ? <>
            <td><input aria-label="Location name" className="input inline-input" name="name" value={editForm.name} onChange={(event) => changeForm(event, setEditForm)} /></td>
            <td><input aria-label="City" className="input inline-input" name="city" value={editForm.city} onChange={(event) => changeForm(event, setEditForm)} /></td>
            <td><div className="inline-edit"><input aria-label="Latitude" className="input inline-input coordinate-input" name="latitude" type="number" step="any" value={editForm.latitude} onChange={(event) => changeForm(event, setEditForm)} /><input aria-label="Longitude" className="input inline-input coordinate-input" name="longitude" type="number" step="any" value={editForm.longitude} onChange={(event) => changeForm(event, setEditForm)} /></div></td>
            <td><select aria-label="Road type" className="select inline-input" name="road_type" value={editForm.road_type} onChange={(event) => changeForm(event, setEditForm)}><option>arterial</option><option>highway</option><option>urban</option></select></td>
            <td><div className="table-actions"><button className="icon-button" type="button" onClick={saveLocation} aria-label="Save location" title="Save"><Save size={15} /></button><button className="icon-button" type="button" onClick={() => setEditingId(null)} aria-label="Cancel editing" title="Cancel"><X size={15} /></button></div></td>
          </> : <>
            <td className="cell-primary">{location.name}</td><td>{location.city}</td><td className="cell-muted">{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</td><td>{location.road_type}</td><td><div className="table-actions"><button className="icon-button" type="button" onClick={() => beginEdit(location)} aria-label={`Edit ${location.name}`} title="Edit"><Save size={15} /></button><button className="icon-button danger-action" type="button" onClick={() => deleteLocation(location)} aria-label={`Delete ${location.name}`} title="Delete"><Trash2 size={15} /></button></div></td>
          </>}</tr>)}
          {!locations.length && !loading && <tr><td colSpan="5" className="empty-table-cell">No locations configured.</td></tr>}
        </tbody></table></div>
      </Panel>

      <div className="admin-two-col">
        <Panel title="Accounts" subtitle="Recently registered users" className="admin-section">
          <div className="table-wrap"><table className="data-table"><thead><tr><th>USER</th><th>ROLE</th><th>JOINED</th></tr></thead><tbody>{users.map((account) => <tr key={account.id}><td><strong className="block">{account.name}</strong><span className="cell-muted">{account.email}</span></td><td><span className={`role-label role-${account.role}`}>{account.role}</span></td><td className="cell-muted">{formatDateTime(account.created_at, { year: undefined, hour: undefined, minute: undefined })}</td></tr>)}{!users.length && !loading && <tr><td colSpan="3" className="empty-table-cell">No accounts found.</td></tr>}</tbody></table></div>
        </Panel>
        <Panel title="Model operations" subtitle="Retrain against all available traffic records" className="admin-section">
          <div className="model-operation"><div className="model-operation-icon"><RefreshCw size={18} /></div><div><strong>Refresh traffic model</strong><p>Uses a chronological 80/20 split and reports regression and congestion metrics.</p></div></div>
          <button type="button" className="button button-primary" onClick={retrain} disabled={retraining}>{retraining ? <><RefreshCw size={14} className="spin" /> Training model...</> : <><RefreshCw size={14} /> Retrain model</>}</button>
          {trainReport && <div className="train-report"><strong>Latest training report</strong><span>Count MAE <b>{formatNumber(trainReport.vehicle_count_mae, 1)}</b></span><span>Speed MAE <b>{formatNumber(trainReport.avg_speed_mae, 1)} km/h</b></span><span>Congestion accuracy <b>{formatNumber(trainReport.congestion_accuracy * 100, 1)}%</b></span><span>Training records <b>{formatNumber(trainReport.train_records)}</b></span></div>}
        </Panel>
      </div>
    </>
  )
}