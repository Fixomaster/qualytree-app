// src/components/GlobalSearch.jsx
// #117 전체 검색 — 24개 허브 통합 검색 + Ctrl+K
import { useState, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const KNOWN_HUBS = [
  { key: 'qualytree.calibrations',         path: '/calibration',                      label: '교정',        tf: ['equipment','equipmentName','name','serialNo'] },
  { key: 'qualytree.audits',               path: '/audit',                            label: '내부심사',    tf: ['scope','auditType','auditNo','auditee'] },
  { key: 'qualytree.audit_cars',           path: '/audit',                            label: 'CAR',         tf: ['finding','description','carNo','auditee'] },
  { key: 'qualytree.complaints',           path: '/complaints',                        label: '고객불만',    tf: ['title','productName','complaintNo','customerName'] },
  { key: 'qualytree.import_adverse',       path: '/import-adverse',               label: '이상사례',    tf: ['productName','title','reportNo','description'] },
  { key: 'qualytree.suppliers',            path: '/supplier',                         label: '공급업체',    tf: ['name','company','supplierName','category'] },
  { key: 'qualytree.supplier_evals',       path: '/supplier',                         label: '공급업체평가', tf: ['supplierName','evalNo','year','evaluator'] },
  { key: 'qualytree.foreignManufacturers', path: '/foreign-manufacturers', label: '외국제조소',  tf: ['name','company','country','businessNo'] },
  { key: 'qualytree.risks',                path: '/risk',                             label: '위험관리',    tf: ['hazard','title','riskId','sequence'] },
  { key: 'qualytree.changes',              path: '/change-control',                           label: '변경관리',    tf: ['title','changeNo','subject','area'] },
  { key: 'qualytree.ncrs',                 path: '/ncr',                              label: 'NCR',         tf: ['title','ncrNo','productName','defectDesc'] },
  { key: 'qualytree.improvements',         path: '/improvement',                      label: '개선',        tf: ['title','subject','area','improvementNo'] },
  { key: 'qualytree.equipment',            path: '/equipment',                        label: '설비',        tf: ['name','equipmentId','model','serialNo'] },
  { key: 'qualytree.documents',            path: '/document-control',                      label: '문서',        tf: ['title','docNo','name','revision'] },
  { key: 'qualytree.employees',            path: '/competency',                       label: '역량',        tf: ['name','department','position','employeeId'] },
  { key: 'qualytree.trainings',            path: '/training',                       label: '교육',        tf: ['subject','title','trainee','instructor'] },
  { key: 'qualytree.traceability',         path: '/traceability',                     label: '추적성',      tf: ['lotNo','productName','batchNo','serialNo'] },
  { key: 'qualytree.inspections',          path: '/inspection',                       label: '검사',        tf: ['productName','lotNo','inspectionNo','inspector'] },
  { key: 'qualytree.sales',                path: '/sales',                            label: '영업',        tf: ['customerName','productName','orderNo','poNo'] },
  { key: 'qualytree.purchases',            path: '/purchase',                         label: '구매',        tf: ['supplierName','itemName','poNo','orderNo'] },
  { key: 'qualytree.manufacturing',        path: '/manufacturing',                    label: '생산',        tf: ['productName','lotNo','workOrderNo','batchNo'] },
  { key: 'qualytree.regulatory',           path: '/regulatory',                       label: '인허가',      tf: ['productName','licenseNo','title','country'] },
  { key: 'qualytree.notices',              path: '/notices',                          label: '공지사항',    tf: ['title','subject','content'] },
  { key: 'qt_records',                path: '/record-master',                          label: '기록',        tf: ['title','name','type','recordNo'] },
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
            placeholder="허브 데이터 전체 검색..."
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
            검색 결과가 없습니다
          </div>
        )}

        {!query && (
          <div className="py-5 text-center text-xs" style={{ color: 'var(--ink-faint)' }}>
            제품명 · 번호 · 담당자 등으로 검색하세요
          </div>
        )}
      </div>
    </div>
  )
}
