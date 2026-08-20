// src/components/GlobalSearch.jsx
// #117 ÃÂÃÂ¬ÃÂÃÂ ÃÂÃÂÃÂÃÂ¬ÃÂÃÂ²ÃÂÃÂ´ ÃÂÃÂªÃÂÃÂ²ÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂ ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ 24ÃÂÃÂªÃÂÃÂ°ÃÂÃÂ ÃÂÃÂ­ÃÂÃÂÃÂÃÂÃÂÃÂ«ÃÂÃÂ¸ÃÂÃÂ ÃÂÃÂ­ÃÂÃÂÃÂÃÂµÃÂÃÂ­ÃÂÃÂÃÂÃÂ© ÃÂÃÂªÃÂÃÂ²ÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂ + Ctrl+K
import { useState, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const KNOWN_HUBS = [
  { key: 'qualytree.calibrations',         path: '/calibration',                      label: 'ÃÂÃÂªÃÂÃÂµÃÂÃÂÃÂÃÂ¬ÃÂÃÂ ÃÂÃÂ',        tf: ['equipment','equipmentName','name','serialNo'] },
  { key: 'qualytree.audits',               path: '/audit',                            label: 'ÃÂÃÂ«ÃÂÃÂÃÂÃÂ´ÃÂÃÂ«ÃÂÃÂ¶ÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂ¬ÃÂÃÂ¬ÃÂÃÂÃÂÃÂ¬',    tf: ['scope','auditType','auditNo','auditee'] },
  { key: 'qualytree.audit_cars',           path: '/audit',                            label: 'CAR',         tf: ['finding','description','carNo','auditee'] },
  { key: 'qualytree.complaints',           path: '/complaint',                        label: 'ÃÂÃÂªÃÂÃÂ³ÃÂÃÂ ÃÂÃÂªÃÂÃÂ°ÃÂÃÂÃÂÃÂ«ÃÂÃÂ¶ÃÂÃÂÃÂÃÂ«ÃÂÃÂ§ÃÂÃÂ',    tf: ['title','productName','complaintNo','customerName'] },
  { key: 'qualytree.import_adverse',       path: '/import-gmp/adverse',               label: 'ÃÂÃÂ¬ÃÂÃÂÃÂÃÂ´ÃÂÃÂ¬ÃÂÃÂÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂ¬ÃÂÃÂ«ÃÂÃÂ¡ÃÂÃÂ',    tf: ['productName','title','reportNo','description'] },
  { key: 'qualytree.suppliers',            path: '/supplier',                         label: 'ÃÂÃÂªÃÂÃÂ³ÃÂÃÂµÃÂÃÂªÃÂÃÂ¸ÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂÃÂÃÂ¬ÃÂÃÂ²ÃÂÃÂ´',    tf: ['name','company','supplierName','category'] },
  { key: 'qualytree.supplier_evals',       path: '/supplier',                         label: 'ÃÂÃÂªÃÂÃÂ³ÃÂÃÂµÃÂÃÂªÃÂÃÂ¸ÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂÃÂÃÂ¬ÃÂÃÂ²ÃÂÃÂ´ÃÂÃÂ­ÃÂÃÂÃÂÃÂÃÂÃÂªÃÂÃÂ°ÃÂÃÂ', tf: ['supplierName','evalNo','year','evaluator'] },
  { key: 'qualytree.foreignManufacturers', path: '/import-gmp/foreign-manufacturers', label: 'ÃÂÃÂ¬ÃÂÃÂÃÂÃÂ¸ÃÂÃÂªÃÂÃÂµÃÂÃÂ­ÃÂÃÂ¬ÃÂÃÂ ÃÂÃÂÃÂÃÂ¬ÃÂÃÂ¡ÃÂÃÂ°ÃÂÃÂ¬ÃÂÃÂÃÂÃÂ',  tf: ['name','company','country','businessNo'] },
  { key: 'qualytree.risks',                path: '/risk',                             label: 'ÃÂÃÂ¬ÃÂÃÂÃÂÃÂÃÂÃÂ­ÃÂÃÂÃÂÃÂÃÂÃÂªÃÂÃÂ´ÃÂÃÂÃÂÃÂ«ÃÂÃÂ¦ÃÂÃÂ¬',    tf: ['hazard','title','riskId','sequence'] },
  { key: 'qualytree.changes',              path: '/change',                           label: 'ÃÂÃÂ«ÃÂÃÂ³ÃÂÃÂÃÂÃÂªÃÂÃÂ²ÃÂÃÂ½ÃÂÃÂªÃÂÃÂ´ÃÂÃÂÃÂÃÂ«ÃÂÃÂ¦ÃÂÃÂ¬',    tf: ['title','changeNo','subject','area'] },
  { key: 'qualytree.ncrs',                 path: '/ncr',                              label: 'NCR',         tf: ['title','ncrNo','productName','defectDesc'] },
  { key: 'qualytree.improvements',         path: '/improvement',                      label: 'ÃÂÃÂªÃÂÃÂ°ÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂ ',        tf: ['title','subject','area','improvementNo'] },
  { key: 'qualytree.equipment',            path: '/equipment',                        label: 'ÃÂÃÂ¬ÃÂÃÂÃÂÃÂ¤ÃÂÃÂ«ÃÂÃÂ¹ÃÂÃÂ',        tf: ['name','equipmentId','model','serialNo'] },
  { key: 'qualytree.documents',            path: '/doc-control',                      label: 'ÃÂÃÂ«ÃÂÃÂ¬ÃÂÃÂ¸ÃÂÃÂ¬ÃÂÃÂÃÂÃÂ',        tf: ['title','docNo','name','revision'] },
  { key: 'qualytree.employees',            path: '/competency',                       label: 'ÃÂÃÂ¬ÃÂÃÂÃÂÃÂ­ÃÂÃÂ«ÃÂÃÂÃÂÃÂ',        tf: ['name','department','position','employeeId'] },
  { key: 'qualytree.trainings',            path: '/competency',                       label: 'ÃÂÃÂªÃÂÃÂµÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂ¡',        tf: ['subject','title','trainee','instructor'] },
  { key: 'qualytree.traceability',         path: '/traceability',                     label: 'ÃÂÃÂ¬ÃÂÃÂ¶ÃÂÃÂÃÂÃÂ¬ÃÂÃÂ ÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂ±',      tf: ['lotNo','productName','batchNo','serialNo'] },
  { key: 'qualytree.inspections',          path: '/inspection',                       label: 'ÃÂÃÂªÃÂÃÂ²ÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂ¬',        tf: ['productName','lotNo','inspectionNo','inspector'] },
  { key: 'qualytree.sales',                path: '/sales',                            label: 'ÃÂÃÂ¬ÃÂÃÂÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂ',        tf: ['customerName','productName','orderNo','poNo'] },
  { key: 'qualytree.purchases',            path: '/purchase',                         label: 'ÃÂÃÂªÃÂÃÂµÃÂÃÂ¬ÃÂÃÂ«ÃÂÃÂ§ÃÂÃÂ¤',        tf: ['supplierName','itemName','poNo','orderNo'] },
  { key: 'qualytree.manufacturing',        path: '/manufacturing',                    label: 'ÃÂÃÂ¬ÃÂÃÂÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂ°',        tf: ['productName','lotNo','workOrderNo','batchNo'] },
  { key: 'qualytree.regulatory',           path: '/regulatory',                       label: 'ÃÂÃÂ¬ÃÂÃÂÃÂÃÂ¸ÃÂÃÂ­ÃÂÃÂÃÂÃÂÃÂÃÂªÃÂÃÂ°ÃÂÃÂ',      tf: ['productName','licenseNo','title','country'] },
  { key: 'qualytree.notices',              path: '/notices',                          label: 'ÃÂÃÂªÃÂÃÂ³ÃÂÃÂµÃÂÃÂ¬ÃÂÃÂ§ÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂ¬ÃÂÃÂ­ÃÂÃÂÃÂÃÂ­',    tf: ['title','subject','content'] },
  { key: 'qualytree.recall',              path: '/recall',                           label: 'ÃÂ«ÃÂ¦ÃÂ¬ÃÂ¬ÃÂ½ÃÂ/ÃÂ­ÃÂÃÂÃÂ¬ÃÂÃÂ ÃÂªÃÂ´ÃÂÃÂ«ÃÂ¦ÃÂ¬', tf: ['no', 'product', 'lot', 'reason', 'assignee', 'status'] },
  { key: 'qualytree.fsca', path: '/fsca', label: 'FSCA Ã¬ÂÂÃ¬Â ÂÃ¬ÂÂ±Ã¬Â¡Â°Ã¬Â¹Â', tf: ['no','product','lot','actionType','assignee','status','adverseId'] },
  { key: 'qualytree.csv',
  'qualytree.stability', path: '/csv', label: 'CSV ì í¨ì±íì¸', tf: ['no','systemName','vendor','version','phase'] },
  { key: 'qt_records',                path: '/records',                          label: 'ÃÂÃÂªÃÂÃÂ¸ÃÂÃÂ°ÃÂÃÂ«ÃÂÃÂ¡ÃÂÃÂ',        tf: ['title','name','type','recordNo'] },
]

function searchStorage(query) {
  const q = query.toLowerCase().trim()
  if (!q) return []
  const results = []
  for (const hub of KNOWN_HUBS) {
    try {
      const raw = localStorage.getItem(hub.key)
      if (!raw) continue
      const arr = JSON.parse(raw)
      if (!Array.isArray(arr)) continue
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i]
        if (typeof item !== 'object' || !item) continue
        const vals = Object.values(item).filter(v => typeof v === 'string' && v.length < 200)
        const hay = vals.join(' ').toLowerCase()
        if (!hay.includes(q)) continue
        const title = hub.tf.map(f => item[f]).find(v => v && String(v).trim()) || vals[0] || ('#' + (i + 1))
        const sub = vals.find(v => v !== title && v.length > 0 && v.length < 60) || ''
        results.push({ title: String(title), sub, hub: hub.label, path: hub.path })
        if (results.length >= 20) return results
      }
    } catch (e) {}
  }
  return results
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [sel, setSel] = useState(0)
  const nav = useNavigate()

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('openSearch', onOpen)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('openSearch', onOpen) }
  }, [])

  useEffect(() => { if (!open) { setQuery(''); setResults([]); setSel(0) } }, [open])

  const onQ = useCallback(v => { setQuery(v); setSel(0); setResults(searchStorage(v)) }, [])

  const pick = useCallback((r) => { nav(r.path); setOpen(false) }, [nav])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[sel]) pick(results[sel])
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <Search size={16} style={{ color: 'var(--ink-mute)', flexShrink: 0 }} />
          <input
            autoFocus
            value={query}
            onChange={e => onQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="ÃÂÃÂ­ÃÂÃÂÃÂÃÂÃÂÃÂ«ÃÂÃÂ¸ÃÂÃÂ ÃÂÃÂ«ÃÂÃÂÃÂÃÂ°ÃÂÃÂ¬ÃÂÃÂÃÂÃÂ´ÃÂÃÂ­ÃÂÃÂÃÂÃÂ° ÃÂÃÂ¬ÃÂÃÂ ÃÂÃÂÃÂÃÂ¬ÃÂÃÂ²ÃÂÃÂ´ ÃÂÃÂªÃÂÃÂ²ÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂ..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--ink)' }}
          />
          {query && (
            <button onClick={() => onQ('')} style={{ color: 'var(--ink-mute)' }}>
              <X size={14} />
            </button>
          )}
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
            ESC
          </span>
        </div>

        {results.length > 0 && (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => pick(r)}
                className="w-full text-left flex items-center justify-between px-4 py-2.5 transition"
                style={{
                  borderBottom: '1px solid var(--border-faint)',
                  background: i === sel ? 'var(--bg-soft)' : 'transparent',
                }}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{r.title}</span>
                  {r.sub && r.sub !== r.title && (
                    <span className="text-[11px] truncate" style={{ color: 'var(--ink-mute)' }}>{r.sub}</span>
                  )}
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full ml-3 flex-shrink-0"
                  style={{ background: 'var(--accent-soft,#EFF6FF)', color: 'var(--accent,#3B82F6)' }}
                >
                  {r.hub}
                </span>
              </button>
            ))}
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div className="py-8 text-center text-sm" style={{ color: 'var(--ink-mute)' }}>
            ÃÂÃÂªÃÂÃÂ²ÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂ ÃÂÃÂªÃÂÃÂ²ÃÂÃÂ°ÃÂÃÂªÃÂÃÂ³ÃÂÃÂ¼ÃÂÃÂªÃÂÃÂ°ÃÂÃÂ ÃÂÃÂ¬ÃÂÃÂÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂµÃÂÃÂ«ÃÂÃÂÃÂÃÂÃÂÃÂ«ÃÂÃÂÃÂÃÂ¤
          </div>
        )}

        {!query && (
          <div className="py-5 text-center text-xs" style={{ color: 'var(--ink-faint)' }}>
            ÃÂÃÂ¬ÃÂÃÂ ÃÂÃÂÃÂÃÂ­ÃÂÃÂÃÂÃÂÃÂÃÂ«ÃÂÃÂªÃÂÃÂ ÃÂÃÂÃÂÃÂ· ÃÂÃÂ«ÃÂÃÂ²ÃÂÃÂÃÂÃÂ­ÃÂÃÂÃÂÃÂ¸ ÃÂÃÂÃÂÃÂ· ÃÂÃÂ«ÃÂÃÂÃÂÃÂ´ÃÂÃÂ«ÃÂÃÂÃÂÃÂ¹ÃÂÃÂ¬ÃÂÃÂÃÂÃÂ ÃÂÃÂ«ÃÂÃÂÃÂÃÂ±ÃÂÃÂ¬ÃÂÃÂÃÂÃÂ¼ÃÂÃÂ«ÃÂÃÂ¡ÃÂÃÂ ÃÂÃÂªÃÂÃÂ²ÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂÃÂÃÂ­ÃÂÃÂÃÂÃÂÃÂÃÂ¬ÃÂÃÂÃÂÃÂ¸ÃÂÃÂ¬ÃÂÃÂÃÂÃÂ
          </div>
        )}
      </div>
    </div>
  )
}
