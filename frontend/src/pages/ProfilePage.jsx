import { useAuth } from '../context/AuthContext'
import { PageHeading, Panel } from '../components/UI'
import { formatDateTime } from '../utils/format'

export default function ProfilePage() {
  const { user } = useAuth()
  return (
    <>
      <PageHeading eyebrow="ACCOUNT" title="Your profile" description="Your traffic workspace account and access level." />
      <div className="profile-grid">
        <Panel className="profile-card">
          <div className="profile-large-avatar">{user?.name?.slice(0, 1)?.toUpperCase() || 'U'}</div>
          <h2>{user?.name}</h2>
          <p>{user?.email}</p>
          <span className={`role-label role-${user?.role}`}>{user?.role}</span>
        </Panel>
        <Panel title="Account details" subtitle="Identity and workspace access">
          <div className="profile-details">
            <div className="profile-detail-row"><span>Full name</span><strong>{user?.name || '—'}</strong></div>
            <div className="profile-detail-row"><span>Email address</span><strong>{user?.email || '—'}</strong></div>
            <div className="profile-detail-row"><span>Access level</span><span className={`role-label role-${user?.role}`}>{user?.role}</span></div>
            <div className="profile-detail-row"><span>Member since</span><strong>{formatDateTime(user?.created_at, { hour: undefined, minute: undefined })}</strong></div>
            <div className="profile-detail-row"><span>Session security</span><strong>HttpOnly secure cookie</strong></div>
          </div>
        </Panel>
      </div>
    </>
  )
}