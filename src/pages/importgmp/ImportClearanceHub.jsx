import React, { useState } from 'react'
import { Plus, Trash2, Ship, AlertTriangle } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import CertGate from '../../components/CertGate'

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

const EMPTY = {
  productName: '', lotNo: '', qty: '', clearanceDate: '',
  inspectionResult: '적합', customsNo: '', notes: '',
}

export default function ImportClearanceHub() {
  const user = auth.current()
  const [list, setList] = useState(readLS)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [search, setSearch] = useState('')

  const save = (v) => { writeLS(v); setList(v) }
  const add = () => {
    if (!form.productName.trim()) { alert('품목명을 입력하세요.'); return }
    save([...list, { ...form, id: Date.now().toString() }])
    setAdding(false); setForm(EMPTY)
  }
  const del = (id) => { if (window.confirm('삭제할까요?')) save(list.filter(r => r.id !== id)) }

  const filtered = list
    .filter(r => !search || r.productName.includes(search) || r.lotNo.includes(search) || r.customsNo.includes(search))
    .sort((a, b) => b.clearanceDate.localeCompare(a.clearanceDate))

  const failCount = list.filter(r => r.inspectionResult === '부적합').length

  return (
    <AppLayout user={user} title="수입 통관 기록" subtitle="품목별 수입 통관 및 수입검사 이력 관리">
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
              수입 건별 LOT·수량·통관일·수입검사 결과를 기록합니다.
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
              { label: '전체 통관', value: list.length },
              { label: '적합', value: list.filter(r => r.inspectionResult === '적합').length },
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
                <label className="sm:col-span-2 block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>품목명 *</span>
                  <input className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.productName} onChange={e => setF('productName', e.target.value)} />
                </label>
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>통관번호 (수입신고번호)</span>
                  <input className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.customsNo} onChange={e => setF('customsNo', e.target.value)} />
                </label>
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>LOT 번호</span>
                  <input className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.lotNo} onChange={e => setF('lotNo', e.target.value)} />
                </label>
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>수량</span>
                  <input className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.qty} onChange={e => setF('qty', e.target.value)} placeholder="예: 100 EA" />
                </label>
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>통관일</span>
                  <input type="date" className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.clearanceDate} onChange={e => setF('clearanceDate', e.target.value)} />
                </label>
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>수입검사 결과</span>
                  <select className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.inspectionResult} onChange={e => setF('inspectionResult', e.target.value)}>
                    {RESULT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </label>
              </div>
              <label className="block mt-3">
                <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>비고</span>
                <textarea className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13, minHeight: 56 }}
                  value={form.notes} onChange={e => setF('notes', e.target.value)} />
              </label>
              <div className="flex gap-2 mt-3">
                <button onClick={add} className="btn-primary text-[12.5px]" style={{ padding: '0.45rem 0.9rem' }}>저장</button>
                <button onClick={() => { setAdding(false); setForm(EMPTY) }} className="btn-ghost text-[12.5px]">취소</button>
              </div>
            </div>
          )}

          {/* 목록 */}
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
                const c = RESULT_COLOR[r.inspectionResult] || RESULT_COLOR['면제']
                return (
                  <div key={r.id} className="card-base p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>{r.productName}</span>
                          <span className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold" style={{ background: c.bg, color: c.fg }}>
                            {r.inspectionResult}
                          </span>
                        </div>
                        <div className="text-[12px] mt-1 flex flex-wrap gap-3" style={{ color: 'var(--ink-mute)' }}>
                          {r.lotNo && <span>LOT: {r.lotNo}</span>}
                          {r.qty && <span>수량: {r.qty}</span>}
                          {r.customsNo && <span>통관번호: {r.customsNo}</span>}
                          {r.clearanceDate && <span>통관일: {r.clearanceDate}</span>}
                        </div>
                        {r.notes && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{r.notes}</div>}
                      </div>
                      <button onClick={() => del(r.id)} className="text-slate-300 hover:text-rose-600 shrink-0">
                        <Trash2 size={15} />
                      </button>
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
