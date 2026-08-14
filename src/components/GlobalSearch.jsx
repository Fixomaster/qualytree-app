import { useState, useCallback, useEffect } from 'react'
import { Search, X, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const KNOWN_HUBS = [
  { key: 'qualytree.calibrations', path: '/calibration', label: '교정' },
  { key: 'qualytree.audits', path: '/audit', label: '감사' },
  { key: 'qualytree.audit_cars', path: '/audit', label: 'CAR' },
  { key: 'qualytree.notices', path: '/notices', label: '공지' },
  { key: 'qt_records', path: '/records', label: '기록' },
]

function searchStorage(query) {
  if(!query || query.length < 2) return []
  const q = query.toLowerCase()
  const results = []
  for(const hub of KNOWN_HUBS) {
    try {
      const items = JSON.parse(localStorage.getItem(hub.key) || '[]')
      if(!Array.isArray(items)) continue
      items.forEach((item, idx) => {
        const text = Object.values(item).filter(v => typeof v === 'string').join(' ')
        if(text.toLowerCase().includes(q)) {
          const title = item.name || item.title || item.equipment || item.auditType || ('#' + (idx+1))
          results.push({ title, hub: hub.label, path: hub.path })
        }
      })
    } catch {}
  }
  return results.slice(0, 12)
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e) => {
      if((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o) }
      if(e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handle = useCallback((q) => { setQuery(q); setResults(searchStorage(q)) }, [])
  const go = (path) => { navigate(path); setOpen(false); setQuery(''); setResults([]) }

  if(!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-400 bg-slate-100 rounded-lg hover:bg-slate-200 transition mb-2">
      <Search size={12}/><span>검색 (Ctrl+K)</span>
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/30" onClick={() => setOpen(false)}>
      <div className="w-[480px] bg-white rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
          <Search size={16} className="text-slate-400"/>
          <input autoFocus value={query} onChange={e => handle(e.target.value)}
            placeholder="검색어 입력..." className="flex-1 text-sm outline-none"/>
          <button onClick={() => setOpen(false)}><X size={14} className="text-slate-400"/></button>
        </div>
        {results.length > 0 ? (
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {results.map((r, i) => (
              <button key={i} onClick={() => go(r.path)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50">
                <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{r.hub}</span>
                <span className="text-sm font-medium text-slate-700 truncate">{r.title}</span>
                <ExternalLink size={10} className="ml-auto shrink-0 text-slate-300"/>
              </button>
            ))}
          </div>
        ) : query.length >= 2 ? (
          <p className="px-4 py-6 text-sm text-slate-400 text-center">검색 결과 없음</p>
        ) : (
          <p className="px-4 py-6 text-sm text-slate-400 text-center">교정·감사·공지 데이터 통합 검색</p>
        )}
      </div>
    </div>
  )
}