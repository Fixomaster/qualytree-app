import React, { useState } from 'react'
import { Plus, Trash2, Ship, AlertTriangle, ChevronDown, ChevronRight, Download, X, Paperclip } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import CertGate from '../../components/CertGate'
import { fileStore } from '../../lib/fileStore'

const LS_KEY = 'qualytree.import_clearance'
function readLS() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
function writeLS(v) { localStorage.setItem(LS_KEY, JSON.stringify(v)) }

const RESULT_OPTIONS = ['적합', '부적합', '검사중', '면제']
const RESULT_COLOR = {
  '적합':   { bg: '#e8f5ee', fg: '#2d7a4f' },
  '부적합': { bg: '#fdecec', fg: '#c0392b' },
  '검사중': { bg: '#fff8e1', fg: '#b7791f' },
  '면제':   { bg: '#f3f4f6', fg: '#6b7280' },
}

const mkId = () => Math.random().toString(36).slice(2, 10)
const EMPTY_ITEM = { productName: '', lotNo: '', qty: '', inspectionResult: '적합' }
const EMPTY = { customsNo: '', clearanceDate: '', notes: '' }

export default function ImportClearanceHub() {
  const user = auth.current()
  const [list, setList] = useState(readLS)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [draftItems, setDraftItems] = useState([{ ...EMPTY_ITEM, id: mkId() }])
  const addDraftItem = () => setDraftItems(l => [...l, { ...EMPTY_ITEM, id: mkId() }])
  const updateDraftItem = (id, patch) => setDraftItems(l => l.map(m => (m.id === id ? { ...m, ...patch } : m)))
  const removeDraftItem = (id) => setDraftItems(l => l.filter(m => m.id !== id))
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const save = (v) => { writeLS(v); setList(v) }

  const add = () => {
    const items = draftItems.filter(m => m.productName.trim())
    if (!form.customsNo.trim()) { alert('통관번호(수입신고번호)를 입력하세요.'); return }
    if (items.length === 0) { alert('최소 1개 이상의 품목을 입력하세요.'); return }
    save([...list, { ...form, id: Date.now().toString(), items, certFiles: [] }])
    setAdding(false); setForm(EMPTY); setDraftItems([{ ...EMPTY_ITEM, id: mkId() }])
  }
  const del = (id) => { if (window.confirm('삭제할까요?')) save(list.filter(r => r.id !== id)) }

  const attachCertFile = async (recId, file) => {
    const fileId = await fileStore.saveFile(file)
    save(list.map(r => r.id === recId
      ? { ...r, certFiles: [...(r.certFiles || []), { id: mkId(), fileId, fileName: file.name }] }
      : r))
  }
  const removeCertFile = (recId, fid) => {
    save(list.map(r => r.id === recId
      ? { ...r, certFiles: (r.certFiles || []).filter(f => f.id !== fid) }
      : r))
  }
  const openFile = async (fileId) => {
    const url = await fileStore.getObjectURL(fileId)
    if (!url) { window.alert('파일을 찾을 수 없습니다.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  const filtered = list
    .filter(r => !search
      || (r.customsNo || '').includes(search)
      || (r.items || []).some(it => (it.productName || '').includes(search) || (it.lotNo || '').includes(search)))
    .sort((a, b) => (b.clearanceDate || '').localeCompare(a.clearanceDate || ''))

  const allItems = list.flatMap(r => r.items || [])
  const failCount = allItems.filter(it => it.inspectionResult === '부적합').length

  return (
    <AppLayout user={user} title="수입 통관 기록" subtitle="통관번호별 다중 품목·수입검사 이력 관리">
      <CertGate certId="kgmp_importer" label="수입 GMP">
        <div className="px-6 lg:px-8 py-6 max-w-[1100px] mx-auto fade-in">

          <div className="mb-5">
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
              IMPORT GMP · 수입 통관 기록
            </span>
            <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              수입 통관 기록
            </div>
            <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
              통관(수입신고) 건 1건에 다수 품목·LOT을 등록하고 수입검사 성적서를 첨부합니다.
            </div>
          </div>

          {failCount > 0 && (
            <div className="card-base p-3.5 mb-5 flex items-start gap-2.5" style={{ background: 'var(--amber-soft)' }}>
              <AlertTriangle size={16} style={{ color: 'var(--amber)' }} className="shrink-0 mt-0.5" />
              <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                수입검사 <b>부적합 {failCount}건</b>이 있습니다. 처리 상황을 확인하세요.
              </div>
            </div>
          )}

          {/* 통계 */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: '전체 통관 건', value: list.length },
              { label: '전체 품목', value: allItems.length },
              { label: '부적합', value: failCount },
            ].map(s => (
              <div key={s.label} className="card-base p-4 text-center">
                <div className="text-[22px] font-semibold" style={{ color: 'var(--ink)' }}>{s.value}</div>
                <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* 검색 + 추가 */}
          <div className="flex items-center gap-3 mb-3">
            <input
              className="input-base flex-1"
              style={{ padding: '0.5rem 0.8rem', fontSize: 13 }}
              placeholder="품목명, LOT번호 또는 통관번호 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button onClick={() => setAdding(true)} className="btn-primary text-[12.5px] shrink-0">
              <Plus size={14} /> 통관 기록 추가
            </button>
          </div>

          {/* 등록 폼 */}
          {adding && (
            <div className="card-base p-4 mb-4" style={{ borderColor: 'var(--moss)' }}>
              <div className="text-[13px] font-semibold mb-3" style={{ color: 'var(--ink)' }}>새 통관 기록</div>
              <div className="grid sm:grid-cols-3 gap-3">
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>통관번호 (수입신고번호) *</span>
                  <input className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.customsNo} onChange={e => setF('customsNo', e.target.value)} />
                </label>
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>통관일</span>
                  <input type="date" className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.clearanceDate} onChange={e => setF('clearanceDate', e.target.value)} />
                </label>
              </div>
              <label className="block mt-3">
                <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>비고</span>
                <textarea className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13, minHeight: 48 }}
                  value={form.notes} onChange={e => setF('notes', e.target.value)} />
              </label>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>
                    품목 목록 (다중 등록 가능) {draftItems.length > 0 ? `(${draftItems.length}개)` : ''}
                  </span>
                  <button type="button" onClick={addDraftItem} className="btn-ghost text-[11.5px]"><Plus size={12} /> 품목 추가</button>
                </div>
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                  <div className="grid grid-cols-[1.3fr_1fr_0.7fr_0.9fr_auto] gap-2 px-3 py-1.5 text-[10.5px] font-mono uppercase tracking-wide" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
                    <span>품목명</span>
                    <span>LOT 번호</span>
                    <span>수량</span>
                    <span>수입검사 결과</span>
                    <span></span>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {draftItems.map((it) => (
                      <div key={it.id} className="grid grid-cols-[1.3fr_1fr_0.7fr_0.9fr_auto] gap-2 px-3 py-1.5 items-center" style={{ borderTop: '1px solid var(--line)' }}>
                        <input value={it.productName} onChange={(e) => updateDraftItem(it.id, { productName: e.target.value })} className="input-base text-[12.5px]" placeholder="품목명" />
                        <input value={it.lotNo} onChange={(e) => updateDraftItem(it.id, { lotNo: e.target.value })} className="input-base text-[12.5px]" placeholder="LOT번호" />
                        <input value={it.qty} onChange={(e) => updateDraftItem(it.id, { qty: e.target.value })} className="input-base text-[12.5px]" placeholder="100 EA" />
                        <select value={it.inspectionResult} onChange={(e) => updateDraftItem(it.id, { inspectionResult: e.target.value })} className="input-base text-[12.5px]">
                          {RESULT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                        </select>
                        <button onClick={() => removeDraftItem(it.id)} style={{ color: 'var(--ink-faint)' }}><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button onClick={add} className="btn-primary text-[12.5px]" style={{ padding: '0.45rem 0.9rem' }}>저장</button>
                <button onClick={() => { setAdding(false); setForm(EMPTY); setDraftItems([{ ...EMPTY_ITEM, id: mkId() }]) }} className="btn-ghost text-[12.5px]">취소</button>
              </div>
            </div>
          )}

          {/* 목록 — 클릭 시 상세보기 (#10) */}
          {filtered.length === 0 ? (
            <div className="card-base p-10 text-center" style={{ borderStyle: 'dashed' }}>
              <Ship size={28} style={{ color: 'var(--ink-faint)', margin: '0 auto' }} strokeWidth={1.4} />
              <div className="mt-2 text-[13px]" style={{ color: 'var(--ink-mute)' }}>
                {search ? '검색 결과가 없습니다.' : '등록된 통관 기록이 없습니다.'}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(r => {
                const isOpen = expandedId === r.id
                const items = r.items || []
                const hasFail = items.some(it => it.inspectionResult === '부적합')
                return (
                  <div key={r.id} className="card-base overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : r.id)}
                      className="w-full text-left p-4 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isOpen ? <ChevronDown size={14} style={{ color: 'var(--ink-faint)' }} /> : <ChevronRight size={14} style={{ color: 'var(--ink-faint)' }} />}
                          <span className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>{r.customsNo}</span>
                          <span className="text-[10.5px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}>{items.length}개 품목</span>
                          {hasFail && <span className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold" style={{ background: RESULT_COLOR['부적합'].bg, color: RESULT_COLOR['부적합'].fg }}>부적합 포함</span>}
                        </div>
                        <div className="text-[12px] mt-1 flex flex-wrap gap-3" style={{ color: 'var(--ink-mute)' }}>
                          {r.clearanceDate && <span>통관일: {r.clearanceDate}</span>}
                          {(r.certFiles || []).length > 0 && <span>성적서 {r.certFiles.length}건 첨부</span>}
                        </div>
                      </div>
                      <span onClick={(e) => { e.stopPropagation(); del(r.id) }} className="text-slate-300 hover:text-rose-600 shrink-0">
                        <Trash2 size={15} />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-1" style={{ borderTop: '1px solid var(--line)' }}>
                        <div className="mt-3 rounded-lg overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                          <div className="grid grid-cols-[1.3fr_1fr_0.7fr_0.9fr] gap-2 px-3 py-1.5 text-[10.5px] font-mono uppercase tracking-wide" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
                            <span>품목명</span><span>LOT 번호</span><span>수량</span><span>수입검사 결과</span>
                          </div>
                          {items.map((it, idx) => {
                            const c = RESULT_COLOR[it.inspectionResult] || RESULT_COLOR['면제']
                            return (
                              <div key={idx} className="grid grid-cols-[1.3fr_1fr_0.7fr_0.9fr] gap-2 px-3 py-1.5 items-center text-[12.5px]" style={{ borderTop: '1px solid var(--line)', color: 'var(--ink)' }}>
                                <span>{it.productName}</span>
                                <span>{it.lotNo || '—'}</span>
                                <span>{it.qty || '—'}</span>
                                <span className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold inline-block w-fit" style={{ background: c.bg, color: c.fg }}>{it.inspectionResult}</span>
                              </div>
                            )
                          })}
                        </div>

                        {r.notes && <div className="text-[12px] mt-3" style={{ color: 'var(--ink-mute)' }}>비고: {r.notes}</div>}

                        <div className="mt-3">
                          <div className="text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>수입검사 성적서 (다중 첨부 가능)</div>
                          {(r.certFiles || []).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                              {r.certFiles.map(f => (
                                <span key={f.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                                  <button type="button" onClick={() => openFile(f.fileId)} className="inline-flex items-center gap-1 hover:underline"><Download size={11} /> {f.fileName}</button>
                                  <button type="button" onClick={() => removeCertFile(r.id, f.id)} className="opacity-50 hover:opacity-100"><X size={11} /></button>
                                </span>
                              ))}
                            </div>
                          )}
                          <CertFileAttach onPick={(file) => attachCertFile(r.id, file)} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CertGate>
    </AppLayout>
  )
}

function CertFileAttach({ onPick }) {
  const [busy, setBusy] = useState(false)
  return (
    <label className="inline-flex items-center gap-1 text-[11.5px] font-medium cursor-pointer" style={{ color: 'var(--moss)' }}>
      <Paperclip size={12} /> {busy ? '업로드 중…' : '성적서 파일 첨부 (5MB 이하)'}
      <input type="file" className="hidden" disabled={busy} onChange={async (e) => {
        const f = e.target.files && e.target.files[0]
        e.target.value = ''
        if (!f) return
        setBusy(true)
        try { await onPick(f) } finally { setBusy(false) }
      }} />
    </label>
  )
}
