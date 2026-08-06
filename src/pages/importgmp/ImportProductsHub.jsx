import React, { useState } from 'react'
import { Plus, Trash2, BadgeCheck, Factory } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import CertGate from '../../components/CertGate'
import { foreignSites } from '../../lib/foreignManufacturerState'

const LS_KEY = 'qualytree.import_products'
function readLS() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
function writeLS(v) { localStorage.setItem(LS_KEY, JSON.stringify(v)) }

const TYPE_OPTIONS = ['허가', '신고', '인증']
const mkId = () => Math.random().toString(36).slice(2, 10)

const EMPTY = { productName: '', classNo: '', type: '허가', certNo: '', issuedDate: '', siteId: '', notes: '' }

export default function ImportProductsHub() {
  const user = auth.current()
  const sites = foreignSites.getAll()
  const [list, setList] = useState(readLS)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [siteQuery, setSiteQuery] = useState('')
  const [draftModels, setDraftModels] = useState([])
  const addDraftModel = () => setDraftModels((l) => [...l, { id: mkId(), code: '', name: '' }])
  const updateDraftModel = (id, patch) => setDraftModels((l) => l.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  const removeDraftModel = (id) => setDraftModels((l) => l.filter((m) => m.id !== id))
  const [search, setSearch] = useState('')

  // 품목명 자동완성 후보 — 기존 등록된 품목명 검색하면서 등록 가능 (#6)
  const productNameSuggestions = Array.from(new Set(list.map(r => r.productName).filter(Boolean)))

  const save = (v) => { writeLS(v); setList(v) }
  const add = () => {
    if (!form.productName.trim()) { alert('품목명을 입력하세요.'); return }
    save([...list, { ...form, id: Date.now().toString(), models: draftModels.filter(m => m.code || m.name) }])
    setAdding(false); setForm(EMPTY); setDraftModels([]); setSiteQuery('')
  }
  const del = (id) => { if (window.confirm('삭제할까요?')) save(list.filter(r => r.id !== id)) }

  const filtered = list
    .filter(r => !search || r.productName.includes(search) || (r.certNo || '').includes(search))
    .sort((a, b) => (a.productName || '').localeCompare(b.productName || ''))

  const siteName = (siteId) => sites.find(s => s.id === siteId)?.name || ''

  // 제조소별 그룹핑 (#5)
  const grouped = []
  const bySite = new Map()
  filtered.forEach(r => {
    const key = r.siteId || '__none__'
    if (!bySite.has(key)) { bySite.set(key, []); grouped.push(key) }
    bySite.get(key).push(r)
  })

  const modelCount = list.reduce((sum, r) => sum + ((r.models || []).length), 0)

  return (
    <AppLayout user={user} title="품목 허가 현황" subtitle="수입 품목별 허가·신고·인증 현황 관리">
      <CertGate certId="kgmp_importer" label="수입 GMP">
        <div className="px-6 lg:px-8 py-6 max-w-[1100px] mx-auto fade-in">

          <div className="mb-5">
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
              IMPORT GMP · 품목 허가 현황
            </span>
            <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              품목 허가 현황
            </div>
            <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
              수입 의료기기 품목별 허가·신고·인증 현황을 외국제조소 단위로 관리합니다.
            </div>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: '전체 품목', value: list.length },
              { label: '등록 제조소', value: sites.length },
              { label: '모델 등록 수', value: modelCount },
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
              placeholder="품목명 또는 허가번호 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button onClick={() => setAdding(true)} className="btn-primary text-[12.5px] shrink-0">
              <Plus size={14} /> 품목 추가
            </button>
          </div>

          {/* 등록 폼 */}
          {adding && (
            <div className="card-base p-4 mb-4" style={{ borderColor: 'var(--moss)' }}>
              <div className="text-[13px] font-semibold mb-3" style={{ color: 'var(--ink)' }}>새 품목 등록</div>
              <div className="grid sm:grid-cols-3 gap-3">
                <label className="sm:col-span-2 block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>품목명 * (검색)</span>
                  <input className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    list="import-product-name-options"
                    value={form.productName} onChange={e => setF('productName', e.target.value)}
                    placeholder="예: 정형외과용 나사못 — 입력 또는 기존 품목명 검색" />
                  <datalist id="import-product-name-options">
                    {productNameSuggestions.map(n => <option key={n} value={n} />)}
                  </datalist>
                </label>
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>외국제조소 (검색)</span>
                  <input className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    list="import-site-options"
                    value={siteQuery}
                    onChange={e => {
                      const name = e.target.value
                      setSiteQuery(name)
                      const matched = sites.find(s => s.name === name)
                      setF('siteId', matched ? matched.id : '')
                    }}
                    placeholder="제조소명 검색" />
                  <datalist id="import-site-options">
                    {sites.map(s => <option key={s.id} value={s.name} />)}
                  </datalist>
                </label>
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>분류번호</span>
                  <input className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.classNo} onChange={e => setF('classNo', e.target.value)}
                    placeholder="예: A05010.01" />
                </label>
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>허가 유형</span>
                  <select className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.type} onChange={e => setF('type', e.target.value)}>
                    {TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>허가·신고 번호</span>
                  <input className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.certNo} onChange={e => setF('certNo', e.target.value)}
                    placeholder="예: 제허20-123호" />
                </label>
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>발급일</span>
                  <input type="date" className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.issuedDate} onChange={e => setF('issuedDate', e.target.value)} />
                </label>
              </div>
              <label className="block mt-3">
                <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>비고</span>
                <textarea className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13, minHeight: 56 }}
                  value={form.notes} onChange={e => setF('notes', e.target.value)} />
              </label>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>
                    모델 목록{draftModels.length > 0 ? ` (${draftModels.length}개)` : ''}
                  </span>
                  <button type="button" onClick={addDraftModel} className="btn-ghost text-[11.5px]"><Plus size={12} /> 행 추가</button>
                </div>
                {draftModels.length === 0 ? (
                  <div className="text-center py-6 text-[12px] rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
                    이 품목에 속한 모델명을 직접 추가하세요.
                  </div>
                ) : (
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-3 py-1.5 text-[10.5px] font-mono uppercase tracking-wide" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
                      <span>모델 코드</span>
                      <span>모델명 / 비고</span>
                      <span></span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {draftModels.map((m) => (
                        <div key={m.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 px-3 py-1.5 items-center" style={{ borderTop: '1px solid var(--line)' }}>
                          <input value={m.code} onChange={(e) => updateDraftModel(m.id, { code: e.target.value })} className="input-base text-[12.5px] font-mono" placeholder="모델코드" />
                          <input value={m.name} onChange={(e) => updateDraftModel(m.id, { name: e.target.value })} className="input-base text-[12.5px]" placeholder="모델명 / 규격" />
                          <button onClick={() => removeDraftModel(m.id)} style={{ color: 'var(--ink-faint)' }}><Trash2 size={13} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <button onClick={add} className="btn-primary text-[12.5px]" style={{ padding: '0.45rem 0.9rem' }}>저장</button>
                <button onClick={() => { setAdding(false); setForm(EMPTY); setDraftModels([]); setSiteQuery('') }} className="btn-ghost text-[12.5px]">취소</button>
              </div>
            </div>
          )}

          {/* 목록 (제조소별 그룹핑) */}
          {filtered.length === 0 ? (
            <div className="card-base p-10 text-center" style={{ borderStyle: 'dashed' }}>
              <BadgeCheck size={28} style={{ color: 'var(--ink-faint)', margin: '0 auto' }} strokeWidth={1.4} />
              <div className="mt-2 text-[13px]" style={{ color: 'var(--ink-mute)' }}>
                {search ? '검색 결과가 없습니다.' : '등록된 품목이 없습니다.'}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map(key => {
                const rows = bySite.get(key)
                const label = key === '__none__' ? '제조소 미지정' : siteName(key)
                return (
                  <div key={key}>
                    <div className="flex items-center gap-1.5 mb-2 text-[12px] font-semibold" style={{ color: 'var(--ink-mute)' }}>
                      <Factory size={13} /> {label} <span className="font-normal">({rows.length}개 품목)</span>
                    </div>
                    <div className="space-y-2">
                      {rows.map(r => (
                        <div key={r.id} className="card-base p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>{r.productName}</span>
                                <span className="text-[10.5px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}>{r.type}</span>
                              </div>
                              <div className="text-[12px] mt-1 flex flex-wrap gap-3" style={{ color: 'var(--ink-mute)' }}>
                                {r.classNo && <span>분류: {r.classNo}</span>}
                                {r.certNo && <span>허가번호: {r.certNo}</span>}
                                {r.issuedDate && <span>발급: {r.issuedDate}</span>}
                              </div>
                              {(r.models || []).length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {r.models.map(m => (
                                    <span key={m.id} className="text-[11px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                                      {m.code}{m.code && m.name ? ' · ' : ''}{m.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {r.notes && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{r.notes}</div>}
                            </div>
                            <button onClick={() => del(r.id)} className="text-slate-300 hover:text-rose-600 shrink-0">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
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
