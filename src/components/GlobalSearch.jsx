// src/components/GlobalSearch.jsx
// #117 ì ì²´ ê²ì â 24ê° íë¸ íµí© ê²ì + Ctrl+K | UI v2 + Portal fix
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const KNOWN_HUBS = [
  { key: 'qualytree.calibrations',         path: '/calibration',            label: 'êµì ',         tf: ['equipment','equipmentName','name','serialNo'] },
  { key: 'qualytree.audits',               path: '/audit',                  label: 'ë´ë¶ì¬ì¬',     tf: ['scope','auditType','auditNo','auditee'] },
  { key: 'qualytree.audit_cars',           path: '/audit',                  label: 'CAR',          tf: ['finding','description','carNo','auditee'] },
  { key: 'qualytree.complaints',           path: '/complaints',             label: 'ê³ ê°ë¶ë§',     tf: ['title','productName','complaintNo','customerName'] },
  { key: 'qualytree.adverse_events',       path: '/post-market-safety',     label: '이상사례보고',     tf: ['productName','lotNo','eventType','severity','description','status'] },
  { key: 'qualytree.suppliers',            path: '/supplier',               label: 'ê³µê¸ìì²´',     tf: ['name','company','supplierName','category'] },
  { key: 'qualytree.supplier_evals',       path: '/supplier',               label: 'ê³µê¸ìì²´íê°', tf: ['supplierName','evalNo','year','evaluator'] },
  { key: 'qualytree.foreignManufacturers', path: '/foreign-manufacturers',  label: 'ì¸êµ­ì ì¡°ì',   tf: ['name','company','country','businessNo'] },
  { key: 'qualytree.risks',               path: '/risk',                   label: 'ìíê´ë¦¬',     tf: ['hazard','title','riskId','sequence'] },
  { key: 'qualytree.changes',              path: '/change-control',         label: 'ë³ê²½ê´ë¦¬',     tf: ['title','changeNo','subject','area'] },
  { key: 'qualytree.ncrs',                path: '/ncr',                    label: 'NCR',          tf: ['title','ncrNo','productName','defectDesc'] },
  { key: 'qualytree.improvements',         path: '/improvement',            label: 'ê°ì /CAPA',    tf: ['title','subject','area','improvementNo'] },
  { key: 'qualytree.equipment',            path: '/equipment',              label: 'ì¤ë¹',         tf: ['name','equipmentId','model','serialNo'] },
  { key: 'qualytree.documents',            path: '/document-control',       label: 'ë¬¸ìê´ë¦¬',     tf: ['title','docNo','name','revision'] },
  { key: 'qualytree.employees',            path: '/competency',             label: 'ì­ë',         tf: ['name','department','position','employeeId'] },
  { key: 'qualytree.trainings',            path: '/training',               label: 'êµì¡',         tf: ['subject','title','trainee','instructor'] },
  { key: 'qualytree.traceability',         path: '/traceability',           label: 'ì¶ì ì±',       tf: ['lotNo','productName','batchNo','serialNo'] },
  { key: 'qualytree.inspections',          path: '/inspection',             label: 'ê²ì¬',         tf: ['productName','lotNo','inspectionNo','inspector'] },
  { key: 'qualytree.sales',               path: '/sales',                  label: 'ìì',         tf: ['customerName','productName','orderNo','poNo'] },
  { key: 'qualytree.purchases',            path: '/purchase',               label: 'êµ¬ë§¤',         tf: ['supplierName','itemName','poNo','orderNo'] },
  { key: 'qualytree.manufacturing',        path: '/manufacturing',          label: 'ìì°',         tf: ['productName','lotNo','workOrderNo','batchNo'] },
  { key: 'qualytree.regulatory',           path: '/regulatory',             label: 'ì¸íê°',       tf: ['productName','licenseNo','title','country'] },
  { key: 'qualytree.notices',              path: '/notices',                label: 'ê³µì§ì¬í­',     tf: ['title','subject','content'] },
  { key: 'qt_records',                     path: '/record-master',          label: 'ê¸°ë¡',         tf: ['title','name','type','recordNo'] },
  { key: 'qualytree.recall_records',        path: '/post-market-safety',     label: '리콜/회수',       tf: ['productName','lotNo','recallReason','recallClass','status'] },
  { key: 'qualytree.safety_actions',        path: '/post-market-safety',     label: '안전성조치',     tf: ['productName','lotNo','actionType','reason','status'] },
  { key: 'qualytree.csv',       path: '/csv',       label: 'CSV ì í¨ì±íì¸',   tf: ['no','systemName','vendor','status'] },
  { key: 'qualytree.stability', path: '/stability', label: 'ìì ì± ìí ê´ë¦¬', tf: ['no','productName','studyType','phase'] },
]

const HUB_COLOR = {
  'êµì ': 'bg-blue-50 text-blue-700', 'ë´ë¶ì¬ì¬': 'bg-blue-50 text-blue-700', 'CAR': 'bg-blue-50 text-blue-700',
  'ê³ ê°ë¶ë§': 'bg-red-50 text-red-700', 'ì´ìì¬ë¡': 'bg-red-50 text-red-700', 'NCR': 'bg-red-50 text-red-700',
  'ìíê´ë¦¬': 'bg-orange-50 text-orange-700', 'ë³ê²½ê´ë¦¬': 'bg-orange-50 text-orange-700',
  'ê³µê¸ìì²´': 'bg-violet-50 text-violet-700', 'ê³µê¸ìì²´íê°': 'bg-violet-50 text-violet-700', 'ì¸êµ­ì ì¡°ì': 'bg-violet-50 text-violet-700',
  'ê°ì /CAPA': 'bg-green-50 text-green-700', 'ì¤ë¹': 'bg-teal-50 text-teal-700',
  'ë¬¸ìê´ë¦¬': 'bg-amber-50 text-amber-700', 'ì­ë': 'bg-indigo-50 text-indigo-700', 'êµì¡': 'bg-indigo-50 text-indigo-700',
  'ì¶ì ì±': 'bg-cyan-50 text-cyan-700', 'ê²ì¬': 'bg-cyan-50 text-cyan-700',
  'ìì': 'bg-emerald-50 text-emerald-700', 'êµ¬ë§¤': 'bg-emerald-50 text-emerald-700', 'ìì°': 'bg-emerald-50 text-emerald-700',
  'ì¸íê°': 'bg-purple-50 text-purple-700', 'ê³µì§ì¬í­': 'bg-gray-100 text-gray-600', 'ê¸°ë¡': 'bg-gray-100 text-gray-600',
}

const QUICK_HUBS = [
  { label: 'êµì ', path: '/calibration' }, { label: 'ë´ë¶ì¬ì¬', path: '/audit' },
  { label: 'ê³ ê°ë¶ë§', path: '/complaints' }, { label: 'ìíê´ë¦¬', path: '/risk' },
  { label: 'NCR', path: '/ncr' }, { label: 'ë¬¸ìê´ë¦¬', path: '/document-control' },
  { label: 'ê³µê¸ìì²´', path: '/supplier' }, { label: 'ê²ì¬', path: '/inspection' },
]

function getPreview(item, fields) {
  for (const f of fields) {
    const v = item[f]
    if (v && typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function searchStorage(query) {
  const q = query.toLowerCase().trim()
  if (!q) return []
  const hits = []
  for (const hub of KNOWN_HUBS) {
    try {
      const raw = localStorage.getItem(hub.key)
      if (!raw) continue
      const arr = JSON.parse(raw)
      if (!Array.isArray(arr)) continue
      for (const item of arr) {
        const matched = hub.tf.some(f => { const v = item[f]; return typeof v === 'string' && v.toLowerCase().includes(q) })
        if (matched) { hits.push({ hub, item }); if (hits.length >= 60) return hits }
      }
    } catch (_) {}
  }
  return hits
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const navigate = useNavigate()

  const close = useCallback(() => { setOpen(false); setQuery(''); setResults([]); setSel(0) }, [])

  useEffect(() => {
    const onOpen = () => setOpen(true)
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(true) } }
    window.addEventListener('openSearch', onOpen)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('openSearch', onOpen); window.removeEventListener('keydown', onKey) }
  }, [])

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50) }, [open])
  useEffect(() => {
    if (query.trim().length < 1) { setResults([]); setSel(0); return }
    setResults(searchStorage(query)); setSel(0)
  }, [query])

  const go = useCallback((idx) => {
    const r = results[idx]; if (!r) return; close(); navigate(r.hub.path)
  }, [results, close, navigate])

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { close(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); go(sel) }
  }

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.children[sel]?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  if (!open) return null

  return createPortal((
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center"
      style={{ paddingTop: '10vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div
        className="w-full bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxWidth: 640, maxHeight: '72vh' }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <Search size={20} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKeyDown}
            placeholder="íë¸ ë°ì´í° ì ì²´ ê²ì..."
            className="flex-1 text-[15px] text-gray-900 placeholder-gray-400 outline-none bg-transparent"
          />
          {query ? (
            <button onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={16} /></button>
          ) : (
            <kbd className="flex-shrink-0 hidden sm:inline-flex items-center px-2 py-1 text-xs text-gray-400 bg-gray-100 rounded font-mono">ESC</kbd>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {!query && (
            <div className="px-5 py-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">ë¹ ë¥¸ ì´ë</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_HUBS.map(h => (
                  <button key={h.path} onClick={() => { close(); navigate(h.path) }}
                    className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg border border-gray-200 hover:border-blue-200 transition-all">
                    {h.label}
                  </button>
                ))}
              </div>
              <p className="mt-5 text-xs text-gray-400">ì íëª Â· ë²í¸ Â· ë´ë¹ì Â· ë¡í¸ë²í¸ ë±ì¼ë¡ ê²ìíì¸ì</p>
            </div>
          )}

          {query && results.length > 0 && (
            <>
              <div className="flex items-center justify-between px-5 pt-3 pb-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">ê²ì ê²°ê³¼</span>
                <span className="text-xs text-gray-400">{results.length}ê±´</span>
              </div>
              <div ref={listRef}>
                {results.map((r, i) => {
                  const title = getPreview(r.item, r.hub.tf) || '(í­ëª©)'
                  const subVal = getPreview(r.item, [...r.hub.tf].reverse()) || ''
                  const badge = HUB_COLOR[r.hub.label] || 'bg-gray-100 text-gray-600'
                  return (
                    <button key={i} onMouseEnter={() => setSel(i)} onClick={() => go(i)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${i === sel ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>{r.hub.label}</span>
                          <span className="text-sm text-gray-900 truncate">{title}</span>
                        </div>
                        {subVal && title !== subVal && <p className="text-xs text-gray-400 mt-0.5 truncate">{subVal}</p>}
                      </div>
                      <ArrowUpRight size={14} className={`flex-shrink-0 transition-opacity ${i === sel ? 'text-blue-500 opacity-100' : 'opacity-0'}`} />
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {query && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3"><Search size={20} className="text-gray-300" /></div>
              <p className="text-sm font-medium text-gray-700">ê²°ê³¼ ìì</p>
              <p className="text-xs text-gray-400 mt-1">&ldquo;{query}&rdquo;ì ì¼ì¹íë ë°ì´í°ê° ììµëë¤</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-5 py-2.5 border-t border-gray-100 bg-gray-50">
          <span className="flex items-center gap-1.5 text-xs text-gray-400"><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono text-[11px]">ââ</kbd>íì</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400"><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono text-[11px]">Enter</kbd>ì´ê¸°</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400"><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono text-[11px]">ESC</kbd>ë«ê¸°</span>
          <span className="ml-auto text-xs text-gray-400">24ê° íë¸ ê²ì</span>
        </div>
      </div>
    </div>
  ), document.body)
}