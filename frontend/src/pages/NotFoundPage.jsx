import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return <main className="not-found"><div><div className="not-found-mark">404</div><div className="eyebrow">OFF THE NETWORK</div><h1>This page isn't on the map.</h1><p>The address may have changed, or the page may no longer be available.</p><div className="not-found-actions"><Link className="button button-primary" to="/"><ArrowLeft size={15} /> Return home</Link><Link className="button button-secondary" to="/app">Open workspace <ArrowRight size={15} /></Link></div></div></main>
}