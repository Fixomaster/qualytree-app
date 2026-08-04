import React, { useState } from 'react'
import { Plus, Trash2, AlertOctagon, AlertTriangle } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import CertGate from '../../components/CertGate'

const LS_KEY = 'qualytree.import_adverse'
function readLS() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
function writeLS(v) { localStorage.setItem(LS_KEY, JSON.stringify(v)) }

const REPORT_TYPE_OPTIONS = ['의무보고', '자발보고']
const STATUS_OPTIONS = ['접수', '조사중', '보고완료', '종결']
const STATUS_COLOR = {
  '접수':    { bg: '#fff8e1', fg: '#b7791f' },
  '조사중':  { bg: '#e8f0fe', fg: '#1a56db' },
  '보고완료': { bg: '#e8f5ee', fg: '#2d7a4f' },
  '종결':    { bg: '#f3f4f6', fg: '#6b7280' },
}

const EMPTY = {
  productName: '', incidentDate: '', reportDate: '', reportNo: '',
  reportType: '의무보고', description: '', followup: '', status: '접수',
}

export default function ImportAdverseHub() {
  const user = auth.current()
  const [list, setList] = useState(readLS)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [search, setSearch] = useState('')

  const save = (v) => { writeLS(v); setList(v) }
  const add = () => {
    if (!form.productName.trim()) { alert('제품명을 입력하세요.'); return }
    if (!form.incidentDate) { alert('발생일을 입력하세요.'); return }
    save([...list, { ...form, id: Date.now().toString() }])
    setAdding(false); setForm(EMPTY)
  }
  const del = (id) => { if (window.confirm('삭제할까요?')) save(list.filter(r => r.id !== id)) }

  const filtered = list
    .filter(r => !search || r.productName.includes(search) || r.reportNo.includes(search) || r.description.includes(search))
    .sort((a, b) => b.incidentDate.localeCompare(a.incidentDate))

  const openCount = list.filter(r => ['접수', '조사중'].includes(r.status)).length

  return (
    <AppLayout user={user} title="이상사례 보고" subtitle="의료기기 이상사례 MFDS 보고 이력 관리">
      <CertGate certId="kgmp_importer" label="수입 GMP">
        <div className="px-6 lg:px-8 py-6 max-w-[1100px] mx-auto fade-in">

          <div className="mb-5">
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
              IMPORT GMP · 이상사례 보고
            </span>
            <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              이상사례 보고
            </div>
            <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
              의료기기법 §30조 — 이상사례 MFDS 보고 의무. 중대한 이상사례는 인지 후 30일 이내 보고.
            </div>
          </div>

          {openCount > 0 && (
            <div className="card-base p-3.5 mb-5 flex items-start gap-2.5" style={{ background: 'var(--amber-soft)' }}>
              <AlertTriangle size={16} style={{ color: 'var(--amber)' }} className="shrink-0 mt-0.5" />
              <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                처리 중인 이상사례 <b>{openCount}건</b>이 있습니다. 보고 기한을 확인하세요.
              </div>
            </div>
          )}

          {/* 통계 */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: '전체', value: list.length },
              { label: '접수·조사중', value: openCount },
              { label: '보고완료', value: list.filter(r => r.status === '보고완료').length },
              { label: '종결', value: list.filter(r => r.status === '종결').length },
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
              placeholder="제품명, 보고번호 또는 내용 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button onClick={() => setAdding(true)} className="btn-primary text-[12.5px] shrink-0">
              <Plus size={14} /> 이상사례 등록
            </button>
          </div>

          {/* 등록 폼 */}
          {adding && (
            <div className="card-base p-4 mb-4" style={{ borderColor: 'var(--moss)' }}>
              <div className="text-[13px] font-semibold mb-3" style={{ color: 'var(--ink)' }}>이상사례 등록</div>
              <div className="grid sm:grid-cols-3 gap-3">
                <label className="sm:col-span-2 block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>제품명 *</span>
                  <input className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.productName} onChange={e => setF('productName', e.target.value)} />
                </label>
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>보고 유형</span>
                  <select className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.reportType} onChange={e => setF('reportType', e.target.value)}>
                    {REPORT_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>발생일 *</span>
                  <input type="date" className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.incidentDate} onChange={e => setF('incidentDate', e.target.value)} />
                </label>
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>MFDS 보고일</span>
                  <input type="date" className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.reportDate} onChange={e => setF('reportDate', e.target.value)} />
                </label>
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>보고번호 (식약처 접수번호)</span>
                  <input className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.reportNo} onChange={e => setF('reportNo', e.target.value)} />
                </label>
                <label className="block">
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>처리 상태</span>
                  <select className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
                    value={form.status} onChange={e => setF('status', e.target.value)}>
                    {STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </label>
              </div>
              <label className="block mt-3">
                <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>이상사례 내용</span>
                <textarea className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13, minHeight: 72 }}
                  value={form.description} onChange={e => setF('description', e.target.value)}
                  placeholder="발생 경위, 증상, 관련 환자/사용자 정보 등을 기재합니다." />
              </label>
              <label className="block mt-3">
                <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>후속 조치</span>
                <textarea className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13, minHeight: 56 }}
                  value={form.followup} onChange={e => setF('followup', e.target.value)}
                  placeholder="제품 회수, 시정조치, CAPA 연계 등" />
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
              <AlertOctagon size={28} style={{ color: 'var(--ink-faint)', margin: '0 auto' }} strokeWidth={1.4} />
              <div className="mt-2 text-[13px]" style={{ color: 'var(--ink-mute)' }}>
                {search ? '검색 결과가 없습니다.' : '등록된 이상사례가 없습니다.'}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(r => {
                const c = STATUS_COLOR[r.status] || STATUS_COLOR['접수']
                return (
                  <div key={r.id} className="card-base p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>{r.productName}</span>
                          <span className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold" style={{ background: c.bg, color: c.fg }}>
                            {r.status}
                          </span>
                          <span className="text-[10.5px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}>
                            {r.reportType}
                          </span>
                        </div>
                        <div className="text-[12px] mt-1 flex flex-wrap gap-3" style={{ color: 'var(--ink-mute)' }}>
                          {r.incidentDate && <span>발생일: {r.incidentDate}</span>}
                          {r.reportDate && <span>보고일: {r.reportDate}</span>}
                          {r.reportNo && <span>보고번호: {r.reportNo}</span>}
                        </div>
                        {r.description && (
                          <div className="text-[12.5px] mt-2" style={{ color: 'var(--ink)' }}>{r.description}</div>
                        )}
                        {r.followup && (
                          <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>
                            후속조치: {r.followup}
                          </div>
                        )}
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
