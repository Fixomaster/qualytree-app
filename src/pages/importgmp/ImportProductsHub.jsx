import React, { useState } from 'react'
import { Plus, Trash2, BadgeCheck, AlertTriangle } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import CertGate from '../../components/CertGate'

const LS_KEY = 'qualytree.import_products'
function readLS() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
function writeLS(v) { localStorage.setItem(LS_KEY, JSON.stringify(v)) }

const TYPE_OPTIONS = ['허가', '신고', '인증']
const STATUS_COLOR = {
  '유효':     { bg: '#e8f5ee', fg: '#2d7a4f' },
  '만료 임박': { bg: '#fff8e1', fg: '#b7791f' },
  '만료':     { bg: '#fdecec', fg: '#c0392b' },
  '미확인':   { bg: '#f3f4f6', fg: '#6b7280' },
}

function calcStatus(expiryDate) {
  if (!expiryDate) return '미확인'
  const diff = (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return '만료'
  if (diff < 90) return '만료 임박'
  return '유효'
}

const EMPTY = { productName: '', classNo: '', type: '허가', certNo: '', issuedDate: '', expiryDate: '', notes: '' }

export default function ImportProductsHub() {
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
    .filter(r => !search || r.productName.includes(search) || r.certNo.includes(search))
    .sort((a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || ''))

  const expiring = list.filter(r => ['만료', '만료 임박'].includes(calcStatus(r.expiryDate)))

  return (
    <AppLayout user={user} title="품목 허가 현황" subtitle="수입 품목별 허가·신고·인증 현황 및 갱신 관리">
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
              수입 의료기기 품목별 허가·신고·인증 현황을 관리하고 갱신 예정일을 추적합니다.
            </div>
          </div>

          {expiring.length > 0 && (
            <div className="card-base p-3.5 mb-5 flex items-start gap-2.5" style={{ background: 'var(--amber-soft)' }}>
              <AlertTriangle size={16} style={{ color: 'var(--amber)' }} className="shrink-0 mt-0.5" />
              <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                <b>{expiring.length}개 품목</b>의 허가·인증이 만료되었거나 90일 이내 만료 예정입니다.
              </div>
            </div>
          )}

          {/* 통계 */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: '전체 품목', value: list.length },
              { label: '유효', value: list.filter(r => calcStatus(r.expiryDate) === '유효').length },
              { label: '만료 임박', value: list.filter(r => calcStatus(r.expiryDate) === '만료 임박').length },
              { label: '만료', value: list.filter(r => calcStatus(r.expiryDate) === '만료').length },
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
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>품목명 *</span>
                  <input className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.productName} onChange={e => setF('productName', e.target.value)}
                    placeholder="예: 정형외과용 나사못" />
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
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>유효기한</span>
                  <input type="date" className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.expiryDate} onChange={e => setF('expiryDate', e.target.value)} />
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
              <BadgeCheck size={28} style={{ color: 'var(--ink-faint)', margin: '0 auto' }} strokeWidth={1.4} />
              <div className="mt-2 text-[13px]" style={{ color: 'var(--ink-mute)' }}>
                {search ? '검색 결과가 없습니다.' : '등록된 품목이 없습니다.'}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(r => {
                const st = calcStatus(r.expiryDate)
                const c = STATUS_COLOR[st] || STATUS_COLOR['미확인']
                return (
                  <div key={r.id} className="card-base p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>{r.productName}</span>
                          <span className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold" style={{ background: c.bg, color: c.fg }}>{st}</span>
                          <span className="text-[10.5px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}>{r.type}</span>
                        </div>
                        <div className="text-[12px] mt-1 flex flex-wrap gap-3" style={{ color: 'var(--ink-mute)' }}>
                          {r.classNo && <span>분류: {r.classNo}</span>}
                          {r.certNo && <span>허가번호: {r.certNo}</span>}
                          {r.issuedDate && <span>발급: {r.issuedDate}</span>}
                          {r.expiryDate && <span>만료: {r.expiryDate}</span>}
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
