// src/components/GlobalSearch.jsx
// #117 전체 검색 — 24개 허브 통합 검색 + Ctrl+K | UI v2 + Portal fix
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const KNOWN_HUBS = [
  { key: 'qualytree.calibrations',         path: '/calibration',            label: '교정',         tf: ['equipment','equipmentName','name','serialNo'] },
  { key: 'qualytree.audits',               path: '/audit',                  label: '내부심사',     tf: ['scope','auditType','auditNo','auditee'] },
  { key: 'qualytree.audit_cars',           path: '/audit',                  label: 'CAR',          tf: ['finding','description','carNo','auditee'] },
  { key: 'qualytree.complaints',           path: '/complaints',             label: '고객불만',     tf: ['title','productName','complaintNo','customerName'] },
  { key: 'qualytree.import_adverse',       path: '/import-adverse',         label: '이상사례',     tf: ['productName','title','reportNo','description'] },
  { key: 'qualytree.suppliers',            path: '/supplier',               label: '공급업체',     tf: ['name','company','supplierName','category'] },
  { key: 'qualytree.supplier_evals',       path: '/supplier',               label: '공급업체평가', tf: ['supplierName','evalNo','year','evaluator'] },
  { key: 'qualytree.foreignManufacturers', path: '/foreign-manufacturers',  label: '외국제조소',   tf: ['name','company','country','businessNo'] },
  { key: 'qualytree.risks',               path: '/risk',                   label: '위험관리',     tf: ['hazard','title','riskId','sequence'] },
  { key: 'qualytree.changes',              path: '/change-control',         label: '변경관리',     tf: ['title','changeNo','subject','area'] },
  { key: 'qualytree.ncrs',                path: '/ncr',                    label: 'NCR',          tf: ['title','ncrNo','productName','defectDesc'] },
  { key: 'qualytree.improvements',         path: '/improvement',            label: '개선/CAPA',    tf: ['title','subject','area','improvementNo'] },
  { key: 'qualytree.equipment',            path: '/equipment',              label: '설비',         tf: ['name','equipmentId','model','serialNo'] },
  { key: 'qualytree.documents',            path: '/document-control',       label: '문서관리',     tf: ['title','docNo','name','revision'] },
  { key: 'qualytree.employees',            path: '/competency',             label: '역량',         tf: ['name','department','position','employeeId'] },
  { key: 'qualytree.trainings',            path: '/training',               label: '교육',         tf: ['subject','title','trainee','instructor'] },
  { key: 'qualytree.traceability',         path: '/traceability',           label: '추적성',       tf: ['lotNo','productName','batchNo','serialNo'] },
  { key: 'qualytree.inspections',          path: '/inspection',             label: '검사',         tf: ['productName','lotNo','inspectionNo','inspector'] },
  { key: 'qualytree.sales',               path: '/sales',                  label: '영업',         tf: ['customerName','productName','orderNo','poNo'] },
  { key: 'qualytree.purchases',            path: '/purchase',               label: '구매',         tf: ['supplierName','itemName','poNo','orderNo'] },
  { key: 'qualytree.manufacturing',        path: '/manufacturing',          label: '생산',         tf: ['productName','lotNo','workOrderNo','batchNo'] },
  { key: 'qualytree.regulatory',           path: '/regulatory',             label: '인허가',       tf: ['productName','licenseNo','title','country'] },
  { key: 'qualytree.notices',              path: '/notices',                label: '공지사항',     tf: ['title','subject','content'] },
  { key: 'qt_records',                     path: '/record-master',          label: '기록',         tf: ['title','name','type','recordNo'] },
  { key: 'qualytree.recall',    path: '/recall',    label: '리콜/회수 관리',    tf: ['no','productName','recallReason','status'] },
  { key: 'qualytree.fsca',      path: '/fsca',      label: 'FSCA 안전성조치',  tf: ['no','productName','actionType','status'] },
  { key: 'qualytree.csv',       path: '/csv',       label: 'CSV 유효성확인',   tf: ['no','systemName','vendor','status'] },
  { key: 'qualytree.stability', path: '/stability', label: '안정성 시험 관리', tf: ['no','productName','studyType','phase'] },
]

const HUB_COLOR = {
  '교정': 'bg-blue-50 text-blue-700', '내부심사': 'bg-blue-50 text-blue-700', 'CAR': 'bg-blue-50 text-blue-700',
  '고객불만': 'bg-red-50 text-red-700', '이상사례': 'bg-red-50 text-red-700', 'NCR': 'bg-red-50 text-red-700',
  '위험관리': 'bg-orange-50 text-orange-700', '변경관리': 'bg-orange-50 text-orange-700',
  '공급업체': 'bg-violet-50 text-violet-700', '공급업체평가': 'bg-violet-50 text-violet-700', '외국제조소': 'bg-violet-50 text-violet-700',
  '개선/CAPA': 'bg-green-50 text-green-700', '설비': 'bg-teal-50 text-teal-700',
  '문서관리': 'bg-amber-50 text-amber-700', '역량': 'bg-indigo-50 text-indigo-700', '교육': 'bg-indigo-50 text-indigo-700',
  '추적성': 'bg-cyan-50 text-cyan-700', '검사': 'bg-cyan-50 text-cyan-700',
  '영업': 'bg-emerald-50 text-emerald-700', '구매': 'bg-emerald-50 text-emerald-700', '생산': 'bg-emerald-50 text-emerald-700',
  '인허가': 'bg-purple-50 text-purple-700', '공지사항': 'bg-gray-100 text-gray-600', '기록': 'bg-gray-100 text-gray-600',
}

const QUICK_HUBS = [
  { label: '교정', path: '/calibration' }, { label: '내부심사', path: '/audit' },
  { label: '고객불만', path: '/complaints' }, { label: '위험관리', path: '/risk' },
  { label: 'NCR', path: '/ncr' }, { label: '문서관리', path: '/document-control' },
  { label: '공급업체', path: '/supplier' }, { label: '검사', path: '/inspection' },
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
            placeholder="허브 데이터 전체 검색..."
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
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">빠른 이동</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_HUBS.map(h => (
                  <button key={h.path} onClick={() => { close(); navigate(h.path) }}
                    className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg border border-gray-200 hover:border-blue-200 transition-all">
                    {h.label}
                  </button>
                ))}
              </div>
              <p className="mt-5 text-xs text-gray-400">제품명 · 번호 · 담당자 · 로트번호 등으로 검색하세요</p>
            </div>
          )}

          {query && results.length > 0 && (
            <>
              <div className="flex items-center justify-between px-5 pt-3 pb-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">검색 결과</span>
                <span className="text-xs text-gray-400">{results.length}건</span>
              </div>
              <div ref={listRef}>
                {results.map((r, i) => {
                  const title = getPreview(r.item, r.hub.tf) || '(항목)'
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
              <p className="text-sm font-medium text-gray-700">결과 없음</p>
              <p className="text-xs text-gray-400 mt-1">&ldquo;{query}&rdquo;와 일치하는 데이터가 없습니다</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-5 py-2.5 border-t border-gray-100 bg-gray-50">
          <span className="flex items-center gap-1.5 text-xs text-gray-400"><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono text-[11px]">↑↓</kbd>탐색</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400"><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono text-[11px]">Enter</kbd>열기</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400"><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono text-[11px]">ESC</kbd>닫기</span>
          <span className="ml-auto text-xs text-gray-400">24개 허브 검색</span>
        </div>
      </div>
    </div>
  ), document.body)
}