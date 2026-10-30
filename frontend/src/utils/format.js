export function formatNumber(value, digits = 0) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }).format(number)
}

export function formatDateTime(value, options = {}) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', ...options,
  }).format(date)
}

export function hourLabel(value) {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric' }).format(new Date(2026, 0, 1, Number(value)))
}

export function congestionColor(level) {
  return ({ Low: '#4b9b76', Moderate: '#d5a82f', High: '#e57c44', Severe: '#d65350' })[level] || '#84918b'
}

export function downloadCsv(filename, rows) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const content = [headers.map(escape).join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\r\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }))
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}