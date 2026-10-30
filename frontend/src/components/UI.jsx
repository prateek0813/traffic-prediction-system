import { LoaderCircle, Search } from 'lucide-react'

export function PageHeading({ eyebrow, title, description, actions }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function Panel({ title, subtitle, action, className = '', children }) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel-heading">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function LoadingScreen({ label = 'Loading' }) {
  return (
    <div className="loading-screen" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>{label}</span>
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-mark"><Search size={20} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <p>{message}</p>
      {onRetry && <button className="button button-secondary button-small" type="button" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function CongestionBadge({ level }) {
  const className = String(level || 'unknown').toLowerCase()
  return <span className={`congestion-badge level-${className}`}>{level || 'Unknown'}</span>
}

export function StatCard({ label, value, detail, icon: Icon, tone = 'green' }) {
  return (
    <article className="stat-card">
      <div className="stat-topline">
        <span>{label}</span>
        {Icon && <span className={`stat-icon tone-${tone}`}><Icon size={18} /></span>}
      </div>
      <div className="stat-value">{value}</div>
      {detail && <div className="stat-detail">{detail}</div>}
    </article>
  )
}