// src/pages/resource-plan/ResourcePlanHub.jsx
// 자원 계획 허브 — ISO 13485 §6.1 자원 제공 (Provision of Resources)
// localStorage 기반 (추후 Supabase 마이그레이션 예정)
import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Cpu, Wallet, Globe, Plus, Edit2, Trash2, X,
  AlertTriangle, CheckCircle2, Clock, ChevronRight,
  TrendingUp, BarChart3, Target, ExternalLink, Layers } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { DEPT_LIST } from '../../lib/deptAuth'

// ── localStorage 헬퍼 ──────────────────────────────────────
const NS = {
  people:   'qualytree.rp.people',
  equip:    'qualytree.rp.equip',
  budget:   'qualytree.rp.budget',
  outsource:'qualytree.rp.outsource',
}
function ls(key) { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }
function lsSave(key, data) { localStorage.setItem(key, JSON.stringify(data)) }
function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,4).toUpperCase() }

// ── 상수 ───────────────────────────────────────────────────
const YEARS = [2023, 2024, 2025, 2026, 2027]
const CUR_YEAR = new Date().getFullYear()

const BUDGET_CATS = ['인건비', '설비구매', '교육훈련', '인허가비용', '외주용역', '소모품·부자재', 'IT·시스템', '안전·환경', '기타']
const EQUIP_CATS  = ['생산설비', '측정·검사장비', '시험장비', 'IT·소프트웨어', '시설·공간', '안전장비', '기타']
const OUTSOURCE_TYPES = ['제조공정', '시험·검사', '컨설팅', '교육·훈련', '인증·인허가', 'IT·유지보수', '기타']
const OUTSOURCE_STATUS = ['활성', '만료임박', '검토중', '종료']

// ── 공통 UI 헬퍼 ──────────────────────────────────────────
const TABS = [
  { id: 'summary',  label: '요약',        icon: BarChart3 },
  { id: 'people',   label: '인력',        icon: Users },
  { id: 'equip',    label: '설비·인프라', icon: Cpu },
  { id: 'budget',   label: '예산',        icon: Wallet },
  { id: 'outsource',label: '외부서비스',  icon: Globe },
]

function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition whitespace-nowrap"
      style={{
        background: active ? 'var(--moss)' : 'var(--bg-soft)',
        color: active ? '#fff' : 'var(--ink-soft)',
        border: active ? '1.5px solid var(--moss)' : '1.5px solid var(--line)',
        cursor: 'pointer',
      }}
    >
      <Icon size={14} /> {label}
    </button>
  )
}

function StatusBadge({ status, size = 'sm' }) {
  const cfg = {
    'ok':     { label: '충족', color: '#10B981', bg: '#D1FAE5' },
    'gap':    { label: '부족', color: '#EF4444', bg: '#FEE2E2' },
    'excess': { label: '초과', color: '#6B7280', bg: '#F3F4F6' },
    '활성':   { label: '활성', color: '#10B981', bg: '#D1FAE5' },
    '만료임박':{ label: '만료임박', color: '#F59E0B', bg: '#FEF3C7' },
    '검토중': { label: '검토중', color: '#3B82F6', bg: '#DBEAFE' },
    '종료':   { label: '종료',  color: '#6B7280', bg: '#F3F4F6' },
  }
  const c = cfg[status] || { label: status, color: '#6B7280', bg: '#F3F4F6' }
  return (
    <span className={`font-bold ${size === 'xs' ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1.5 py-0.5'} rounded`}
      style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  )
}

function KpiCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <button onClick={onClick} className="p-4 rounded-xl text-left transition hover:scale-[1.02]"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', cursor: onClick ? 'pointer' : 'default', width: '100%' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{label}</span>
        <Icon size={15} style={{ color }} />
      </div>
      <div className="text-[24px] font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{sub}</div>}
    </button>
  )
}

// ── 모달 래퍼 ─────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl overflow-hidden flex flex-col`}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <span className="font-semibold text-[15px]" style={{ color: 'var(--ink)' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} style={{ color: 'var(--ink-faint)' }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-mono mb-1.5" style={{ color: 'var(--ink-faint)' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = { background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none' }
const Inp = (props) => <input {...props} className={`w-full px-3 py-2 rounded-lg text-[13.5px] ${props.className||''}`} style={inputStyle} />
const Sel = ({ children, ...props }) => <select {...props} className="w-full px-3 py-2 rounded-lg text-[13.5px]" style={inputStyle}>{children}</select>
const Txt = (props) => <textarea {...props} className="w-full px-3 py-2 rounded-lg text-[13.5px]" style={{ ...inputStyle, resize: 'vertical' }} />

function SaveCancel({ onSave, onClose, disabled }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--ink-soft)' }}>취소</button>
      <button onClick={onSave} disabled={disabled} className="px-5 py-2 rounded-lg text-[13px] font-medium"
        style={{ background: disabled ? 'var(--bg-soft)' : 'var(--moss)', color: disabled ? 'var(--ink-faint)' : '#fff', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer' }}>저장</button>
    </div>
  )
}

// ── ① 인력 탭 ─────────────────────────────────────────────
const PEOPLE_EMPTY = { dept: 'QUA', role: '', required: 1, current: 0, plannedDate: '', note: '', year: CUR_YEAR }

function PeopleForm({ init, onSave, onClose }) {
  const [f, setF] = useState(init)
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  const status = f.current >= f.required ? (f.current > f.required ? 'excess' : 'ok') : 'gap'
  return (
    <Modal title={init.id ? '인력 계획 수정' : '인력 계획 추가'} onClose={onClose}>
      <Field label="연도">
        <Sel value={f.year} onChange={e => s('year', +e.target.value)}>
          {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
        </Sel>
      </Field>
      <Field label="부서">
        <Sel value={f.dept} onChange={e => s('dept', e.target.value)}>
          {(DEPT_LIST || []).map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
        </Sel>
      </Field>
      <Field label="직무/역할 *"><Inp value={f.role} onChange={e => s('role', e.target.value)} placeholder="예: 품질관리 담당자" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="필요 인원">
          <Inp type="number" min={0} value={f.required} onChange={e => s('required', +e.target.value)} />
        </Field>
        <Field label="현재 인원">
          <Inp type="number" min={0} value={f.current} onChange={e => s('current', +e.target.value)} />
        </Field>
      </div>
      <Field label="갭 상태">
        <div className="flex items-center gap-2 mt-1">
          <StatusBadge status={status} />
          {status === 'gap' && <span className="text-[12px]" style={{ color: '#EF4444' }}>{f.required - f.current}명 부족</span>}
          {status === 'excess' && <span className="text-[12px]" style={{ color: '#6B7280' }}>{f.current - f.required}명 초과</span>}
        </div>
      </Field>
      {status === 'gap' && (
        <Field label="확보 예정일"><Inp type="date" value={f.plannedDate} onChange={e => s('plannedDate', e.target.value)} /></Field>
      )}
      <Field label="비고"><Txt rows={2} value={f.note} onChange={e => s('note', e.target.value)} placeholder="채용 진행 현황, 특이사항 등" /></Field>
      <SaveCancel onSave={() => onSave({ ...f, status })} onClose={onClose} disabled={!f.role.trim()} />
    </Modal>
  )
}

function PeopleTab({ data, setData }) {
  const [form, setForm] = useState(null)
  const [yearFilter, setYearFilter] = useState(CUR_YEAR)

  const filtered = data.filter(d => d.year === yearFilter)
  const persist = (list) => { setData(list); lsSave(NS.people, list) }

  const save = (f) => {
    if (f.id) persist(data.map(d => d.id === f.id ? f : d))
    else persist([{ ...f, id: uid('RPL') }, ...data])
    setForm(null)
  }
  const del = (id) => { if (!window.confirm('삭제할까요?')) return; persist(data.filter(d => d.id !== id)) }

  const gapCount = filtered.filter(d => d.status === 'gap').length
  const totalRequired = filtered.reduce((s, d) => s + (d.required || 0), 0)
  const totalCurrent = filtered.reduce((s, d) => s + (d.current || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <Sel value={yearFilter} onChange={e => setYearFilter(+e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px', borderRadius: 8, fontSize: 13 }}>
            {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
          </Sel>
          <div className="flex gap-3 text-[12.5px] items-center px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
            <span style={{ color: 'var(--ink-faint)' }}>필요 <b style={{ color: 'var(--ink)' }}>{totalRequired}명</b></span>
            <span style={{ color: 'var(--ink-faint)' }}>현재 <b style={{ color: 'var(--ink)' }}>{totalCurrent}명</b></span>
            {gapCount > 0 && <span style={{ color: '#EF4444', fontWeight: 600 }}>갭 {gapCount}건</span>}
          </div>
        </div>
        <button onClick={() => setForm({ ...PEOPLE_EMPTY, year: yearFilter })}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> 인력 계획 추가
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} msg="등록된 인력 계획이 없습니다" onAdd={() => setForm({ ...PEOPLE_EMPTY, year: yearFilter })} />
      ) : (
        <div className="space-y-2">
          {filtered.map(d => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'var(--bg-card)', border: `1px solid ${d.status === 'gap' ? '#EF444430' : 'var(--line)'}` }}>
              <StatusBadge status={d.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{d.role}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
                    {(DEPT_LIST || []).find(dl => dl.code === d.dept)?.label || d.dept}
                  </span>
                </div>
                <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                  필요 {d.required}명 · 현재 {d.current}명
                  {d.status === 'gap' && d.plannedDate && ` · 확보 예정: ${d.plannedDate}`}
                  {d.note && ` · ${d.note}`}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setForm(d)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer' }}><Edit2 size={12} style={{ color: 'var(--ink-soft)' }} /></button>
                <button onClick={() => del(d.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer' }}><Trash2 size={12} style={{ color: '#EF4444' }} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {form && <PeopleForm init={form} onSave={save} onClose={() => setForm(null)} />}
    </div>
  )
}

// ── ② 설비·인프라 탭 ─────────────────────────────────────
const EQUIP_EMPTY = { name: '', category: '생산설비', required: 1, current: 0, plannedDate: '', location: '', note: '', year: CUR_YEAR }

function EquipForm({ init, onSave, onClose }) {
  const [f, setF] = useState(init)
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  const status = f.current >= f.required ? 'ok' : 'gap'
  return (
    <Modal title={init.id ? '설비 계획 수정' : '설비 계획 추가'} onClose={onClose}>
      <Field label="연도">
        <Sel value={f.year} onChange={e => s('year', +e.target.value)}>
          {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
        </Sel>
      </Field>
      <Field label="자원명 *"><Inp value={f.name} onChange={e => s('name', e.target.value)} placeholder="예: 정밀 측정기 (0.001mm)" /></Field>
      <Field label="분류">
        <Sel value={f.category} onChange={e => s('category', e.target.value)}>
          {EQUIP_CATS.map(c => <option key={c}>{c}</option>)}
        </Sel>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="필요 수량"><Inp type="number" min={0} value={f.required} onChange={e => s('required', +e.target.value)} /></Field>
        <Field label="현재 수량"><Inp type="number" min={0} value={f.current} onChange={e => s('current', +e.target.value)} /></Field>
      </div>
      {status === 'gap' && <Field label="확보 예정일"><Inp type="date" value={f.plannedDate} onChange={e => s('plannedDate', e.target.value)} /></Field>}
      <Field label="위치"><Inp value={f.location} onChange={e => s('location', e.target.value)} placeholder="예: 생산동 2층" /></Field>
      <Field label="비고"><Txt rows={2} value={f.note} onChange={e => s('note', e.target.value)} placeholder="구매 계획, 임대 여부 등" /></Field>
      <SaveCancel onSave={() => onSave({ ...f, status })} onClose={onClose} disabled={!f.name.trim()} />
    </Modal>
  )
}

function EquipTab({ data, setData }) {
  const [form, setForm] = useState(null)
  const [yearFilter, setYearFilter] = useState(CUR_YEAR)
  const [catFilter, setCatFilter] = useState('전체')

  const filtered = data.filter(d => d.year === yearFilter && (catFilter === '전체' || d.category === catFilter))
  const persist = (list) => { setData(list); lsSave(NS.equip, list) }
  const save = (f) => { if (f.id) persist(data.map(d => d.id === f.id ? f : d)); else persist([{ ...f, id: uid('RPE') }, ...data]); setForm(null) }
  const del = (id) => { if (!window.confirm('삭제할까요?')) return; persist(data.filter(d => d.id !== id)) }
  const gapCount = filtered.filter(d => d.status === 'gap').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <Sel value={yearFilter} onChange={e => setYearFilter(+e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px', borderRadius: 8, fontSize: 13 }}>
            {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
          </Sel>
          <Sel value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px', borderRadius: 8, fontSize: 13 }}>
            <option>전체</option>
            {EQUIP_CATS.map(c => <option key={c}>{c}</option>)}
          </Sel>
          {gapCount > 0 && <span className="text-[12px] px-2 py-1 rounded-lg" style={{ background: '#FEE2E2', color: '#EF4444' }}>갭 {gapCount}건</span>}
        </div>
        <button onClick={() => setForm({ ...EQUIP_EMPTY, year: yearFilter })}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> 설비 계획 추가
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Cpu} msg="등록된 설비·인프라 계획이 없습니다" onAdd={() => setForm({ ...EQUIP_EMPTY, year: yearFilter })} />
      ) : (
        <div className="space-y-2">
          {filtered.map(d => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'var(--bg-card)', border: `1px solid ${d.status === 'gap' ? '#EF444430' : 'var(--line)'}` }}>
              <StatusBadge status={d.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{d.name}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>{d.category}</span>
                </div>
                <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                  필요 {d.required} · 현재 {d.current}
                  {d.location && ` · ${d.location}`}
                  {d.status === 'gap' && d.plannedDate && ` · 확보 예정: ${d.plannedDate}`}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setForm(d)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer' }}><Edit2 size={12} style={{ color: 'var(--ink-soft)' }} /></button>
                <button onClick={() => del(d.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer' }}><Trash2 size={12} style={{ color: '#EF4444' }} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {form && <EquipForm init={form} onSave={save} onClose={() => setForm(null)} />}
    </div>
  )
}

// ── ③ 예산 탭 ─────────────────────────────────────────────
const BUDGET_EMPTY = { category: '인건비', name: '', planned: 0, actual: 0, year: CUR_YEAR, quarter: '연간', note: '' }

function BudgetForm({ init, onSave, onClose }) {
  const [f, setF] = useState(init)
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  const rate = f.planned > 0 ? Math.round((f.actual / f.planned) * 100) : 0
  return (
    <Modal title={init.id ? '예산 수정' : '예산 항목 추가'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="연도">
          <Sel value={f.year} onChange={e => s('year', +e.target.value)}>
            {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
          </Sel>
        </Field>
        <Field label="기간">
          <Sel value={f.quarter} onChange={e => s('quarter', e.target.value)}>
            {['연간','Q1','Q2','Q3','Q4'].map(q => <option key={q}>{q}</option>)}
          </Sel>
        </Field>
      </div>
      <Field label="분류">
        <Sel value={f.category} onChange={e => s('category', e.target.value)}>
          {BUDGET_CATS.map(c => <option key={c}>{c}</option>)}
        </Sel>
      </Field>
      <Field label="항목명 *"><Inp value={f.name} onChange={e => s('name', e.target.value)} placeholder="예: QMS 컨설팅 비용" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="계획 금액 (원)">
          <Inp type="number" min={0} value={f.planned} onChange={e => s('planned', +e.target.value)} placeholder="0" />
        </Field>
        <Field label="집행 금액 (원)">
          <Inp type="number" min={0} value={f.actual} onChange={e => s('actual', +e.target.value)} placeholder="0" />
        </Field>
      </div>
      {f.planned > 0 && (
        <div className="px-3 py-2 rounded-lg text-[12.5px]" style={{ background: 'var(--bg-soft)' }}>
          집행률 <b style={{ color: rate > 100 ? '#EF4444' : rate >= 80 ? '#10B981' : 'var(--ink)' }}>{rate}%</b>
          {rate > 100 && <span style={{ color: '#EF4444' }}> (예산 초과!)</span>}
        </div>
      )}
      <Field label="비고"><Txt rows={2} value={f.note} onChange={e => s('note', e.target.value)} placeholder="승인 현황, 특이사항 등" /></Field>
      <SaveCancel onSave={() => onSave(f)} onClose={onClose} disabled={!f.name.trim()} />
    </Modal>
  )
}

function fmt(n) {
  if (!n || n === 0) return '0'
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '억'
  if (n >= 10000) return (n / 10000).toFixed(0) + '만'
  return n.toLocaleString()
}

function BudgetTab({ data, setData }) {
  const [form, setForm] = useState(null)
  const [yearFilter, setYearFilter] = useState(CUR_YEAR)
  const [catFilter, setCatFilter] = useState('전체')

  const filtered = data.filter(d => d.year === yearFilter && (catFilter === '전체' || d.category === catFilter))
  const persist = (list) => { setData(list); lsSave(NS.budget, list) }
  const save = (f) => { if (f.id) persist(data.map(d => d.id === f.id ? f : d)); else persist([{ ...f, id: uid('RPB') }, ...data]); setForm(null) }
  const del = (id) => { if (!window.confirm('삭제할까요?')) return; persist(data.filter(d => d.id !== id)) }

  const totalPlanned = filtered.reduce((s, d) => s + (d.planned || 0), 0)
  const totalActual  = filtered.reduce((s, d) => s + (d.actual  || 0), 0)
  const totalRate    = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0

  // Category summary
  const byCat = BUDGET_CATS.map(cat => {
    const items = filtered.filter(d => d.category === cat)
    return { cat, planned: items.reduce((s, d) => s + (d.planned || 0), 0), actual: items.reduce((s, d) => s + (d.actual || 0), 0), count: items.length }
  }).filter(c => c.count > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <Sel value={yearFilter} onChange={e => setYearFilter(+e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px', borderRadius: 8, fontSize: 13 }}>
            {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
          </Sel>
          <Sel value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px', borderRadius: 8, fontSize: 13 }}>
            <option>전체</option>
            {BUDGET_CATS.map(c => <option key={c}>{c}</option>)}
          </Sel>
        </div>
        <button onClick={() => setForm({ ...BUDGET_EMPTY, year: yearFilter })}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> 예산 항목 추가
        </button>
      </div>

      {/* 예산 요약 바 */}
      {filtered.length > 0 && (
        <div className="p-4 rounded-xl space-y-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between text-[13px]">
            <span style={{ color: 'var(--ink-soft)' }}>총 계획 <b style={{ color: 'var(--ink)' }}>{fmt(totalPlanned)}원</b></span>
            <span style={{ color: 'var(--ink-soft)' }}>집행 <b style={{ color: totalRate > 100 ? '#EF4444' : '#10B981' }}>{fmt(totalActual)}원 ({totalRate}%)</b></span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(totalRate, 100)}%`, background: totalRate > 100 ? '#EF4444' : totalRate >= 80 ? '#10B981' : '#3B82F6' }} />
          </div>
          {byCat.length > 1 && (
            <div className="flex flex-wrap gap-3 pt-1">
              {byCat.map(c => (
                <span key={c.cat} className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                  {c.cat}: <b>{fmt(c.actual)}</b>/{fmt(c.planned)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={Wallet} msg="등록된 예산 항목이 없습니다" onAdd={() => setForm({ ...BUDGET_EMPTY, year: yearFilter })} />
      ) : (
        <div className="space-y-2">
          {filtered.map(d => {
            const rate = d.planned > 0 ? Math.round((d.actual / d.planned) * 100) : 0
            const over = rate > 100
            return (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'var(--bg-card)', border: `1px solid ${over ? '#EF444430' : 'var(--line)'}` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{d.name}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>{d.category}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>{d.quarter}</span>
                    {over && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#FEE2E2', color: '#EF4444' }}>초과</span>}
                  </div>
                  <div className="text-[11.5px] mt-1 flex items-center gap-3" style={{ color: 'var(--ink-faint)' }}>
                    <span>계획 {fmt(d.planned)}원</span>
                    <span>집행 {fmt(d.actual)}원</span>
                    <span style={{ color: over ? '#EF4444' : '#10B981', fontWeight: 600 }}>{rate}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(rate, 100)}%`, background: over ? '#EF4444' : '#10B981' }} />
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setForm(d)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer' }}><Edit2 size={12} style={{ color: 'var(--ink-soft)' }} /></button>
                  <button onClick={() => del(d.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer' }}><Trash2 size={12} style={{ color: '#EF4444' }} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {form && <BudgetForm init={form} onSave={save} onClose={() => setForm(null)} />}
    </div>
  )
}

// ── ④ 외부서비스 탭 ───────────────────────────────────────
const OUT_EMPTY = { process: '', provider: '', type: '제조공정', contractStart: '', contractEnd: '', status: '활성', evaluated: false, note: '' }

function OutsourceForm({ init, onSave, onClose }) {
  const [f, setF] = useState(init)
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  return (
    <Modal title={init.id ? '외부서비스 수정' : '외부서비스 추가'} onClose={onClose}>
      <Field label="공정·서비스명 *"><Inp value={f.process} onChange={e => s('process', e.target.value)} placeholder="예: 멸균 처리, EO 멸균" /></Field>
      <Field label="외부 업체명 *"><Inp value={f.provider} onChange={e => s('provider', e.target.value)} placeholder="예: (주)멸균기술" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="서비스 유형">
          <Sel value={f.type} onChange={e => s('type', e.target.value)}>
            {OUTSOURCE_TYPES.map(t => <option key={t}>{t}</option>)}
          </Sel>
        </Field>
        <Field label="계약 상태">
          <Sel value={f.status} onChange={e => s('status', e.target.value)}>
            {OUTSOURCE_STATUS.map(t => <option key={t}>{t}</option>)}
          </Sel>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="계약 시작일"><Inp type="date" value={f.contractStart} onChange={e => s('contractStart', e.target.value)} /></Field>
        <Field label="계약 종료일"><Inp type="date" value={f.contractEnd} onChange={e => s('contractEnd', e.target.value)} /></Field>
      </div>
      <Field label="공급자 평가 여부">
        <label className="flex items-center gap-2 cursor-pointer select-none mt-1">
          <input type="checkbox" checked={f.evaluated} onChange={e => s('evaluated', e.target.checked)} />
          <span className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>공급자 평가 완료 (ISO 13485 §7.4.1)</span>
        </label>
      </Field>
      <Field label="비고"><Txt rows={2} value={f.note} onChange={e => s('note', e.target.value)} placeholder="계약 특이사항, 품질 협정 여부 등" /></Field>
      <SaveCancel onSave={() => onSave(f)} onClose={onClose} disabled={!f.process.trim() || !f.provider.trim()} />
    </Modal>
  )
}

function OutsourceTab({ data, setData }) {
  const [form, setForm] = useState(null)
  const [statusFilter, setStatusFilter] = useState('전체')

  const filtered = statusFilter === '전체' ? data : data.filter(d => d.status === statusFilter)
  const persist = (list) => { setData(list); lsSave(NS.outsource, list) }
  const save = (f) => { if (f.id) persist(data.map(d => d.id === f.id ? f : d)); else persist([{ ...f, id: uid('RPO') }, ...data]); setForm(null) }
  const del = (id) => { if (!window.confirm('삭제할까요?')) return; persist(data.filter(d => d.id !== id)) }

  const urgentCount = data.filter(d => d.status === '만료임박').length
  const notEvalCount = data.filter(d => d.status === '활성' && !d.evaluated).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <Sel value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px', borderRadius: 8, fontSize: 13 }}>
            <option>전체</option>
            {OUTSOURCE_STATUS.map(s => <option key={s}>{s}</option>)}
          </Sel>
          {urgentCount > 0 && <span className="text-[12px] px-2 py-1 rounded-lg" style={{ background: '#FEF3C7', color: '#F59E0B' }}>만료임박 {urgentCount}건</span>}
          {notEvalCount > 0 && <span className="text-[12px] px-2 py-1 rounded-lg" style={{ background: '#FEE2E2', color: '#EF4444' }}>미평가 {notEvalCount}건</span>}
        </div>
        <button onClick={() => setForm({ ...OUT_EMPTY })}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> 외부서비스 추가
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Globe} msg="등록된 외부서비스가 없습니다" onAdd={() => setForm({ ...OUT_EMPTY })} />
      ) : (
        <div className="space-y-2">
          {filtered.map(d => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'var(--bg-card)', border: `1px solid ${d.status === '만료임박' ? '#F59E0B30' : 'var(--line)'}` }}>
              <StatusBadge status={d.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{d.process}</span>
                  <span className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{d.provider}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>{d.type}</span>
                  {d.evaluated
                    ? <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#D1FAE5', color: '#10B981' }}>평가완료</span>
                    : d.status === '활성' && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#FEE2E2', color: '#EF4444' }}>미평가</span>}
                </div>
                <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                  {d.contractStart && `${d.contractStart} ~ ${d.contractEnd || '미정'}`}
                  {d.note && ` · ${d.note}`}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setForm(d)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer' }}><Edit2 size={12} style={{ color: 'var(--ink-soft)' }} /></button>
                <button onClick={() => del(d.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer' }}><Trash2 size={12} style={{ color: '#EF4444' }} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {form && <OutsourceForm init={form} onSave={save} onClose={() => setForm(null)} />}
    </div>
  )
}

// ── 요약 탭 ───────────────────────────────────────────────
function SummaryTab({ people, equip, budget, outsource, setTab }) {
  const nav = useNavigate()
  const yearPeople = people.filter(d => d.year === CUR_YEAR)
  const yearEquip  = equip.filter(d => d.year === CUR_YEAR)
  const yearBudget = budget.filter(d => d.year === CUR_YEAR)

  const peopleGap  = yearPeople.filter(d => d.status === 'gap').length
  const equipGap   = yearEquip.filter(d => d.status === 'gap').length
  const outUrgent  = outsource.filter(d => d.status === '만료임박').length
  const totalPlanned = yearBudget.reduce((s, d) => s + (d.planned || 0), 0)
  const totalActual  = yearBudget.reduce((s, d) => s + (d.actual || 0), 0)
  const budgetRate   = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0

  const RELATED = [
    { label: '역량 관리', sub: 'ISO §6.2', to: '/competency', color: '#8B5CF6' },
    { label: '인프라 관리', sub: 'ISO §6.3', to: '/infrastructure', color: '#3B82F6' },
    { label: '작업환경 관리', sub: 'ISO §6.4', to: '/workenv', color: '#10B981' },
    { label: '공급업체 관리', sub: 'ISO §7.4.1', to: '/supplier', color: '#F59E0B' },
  ]

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="인력 갭" value={peopleGap > 0 ? `${peopleGap}건` : '충족'} sub={`${CUR_YEAR}년 기준`} color={peopleGap > 0 ? '#EF4444' : '#10B981'} onClick={() => setTab('people')} />
        <KpiCard icon={Cpu} label="설비 갭" value={equipGap > 0 ? `${equipGap}건` : '충족'} sub={`${CUR_YEAR}년 기준`} color={equipGap > 0 ? '#EF4444' : '#10B981'} onClick={() => setTab('equip')} />
        <KpiCard icon={Wallet} label="예산 집행률" value={`${budgetRate}%`} sub={`${fmt(totalActual)}/${fmt(totalPlanned)}원`} color={budgetRate > 100 ? '#EF4444' : '#3B82F6'} onClick={() => setTab('budget')} />
        <KpiCard icon={Globe} label="만료임박 서비스" value={outUrgent > 0 ? `${outUrgent}건` : '없음'} sub="외부서비스" color={outUrgent > 0 ? '#F59E0B' : '#10B981'} onClick={() => setTab('outsource')} />
      </div>

      {/* 자원 충족도 요약 */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <span className="font-semibold text-[14px]" style={{ color: 'var(--ink)' }}>자원 충족도 요약 ({CUR_YEAR}년)</span>
        </div>
        <div className="p-5 space-y-3">
          {[
            { label: '인력 자원', total: yearPeople.length, gap: yearPeople.filter(d => d.status === 'gap').length, icon: Users, tab: 'people' },
            { label: '설비·인프라', total: yearEquip.length, gap: yearEquip.filter(d => d.status === 'gap').length, icon: Cpu, tab: 'equip' },
            { label: '외부서비스', total: outsource.filter(d => d.status === '활성').length, gap: outsource.filter(d => !d.evaluated && d.status === '활성').length, icon: Globe, tab: 'outsource', gapLabel: '미평가' },
          ].map(row => (
            <button key={row.label} onClick={() => setTab(row.tab)} className="w-full flex items-center gap-3 p-3 rounded-xl transition text-left"
              style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer' }}>
              <row.icon size={15} style={{ color: 'var(--ink-soft)', flexShrink: 0 }} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{row.label}</span>
                  <div className="flex items-center gap-2">
                    {row.gap > 0
                      ? <span className="text-[11px] font-bold" style={{ color: '#EF4444' }}>{row.gapLabel || '갭'} {row.gap}건</span>
                      : row.total > 0 && <span className="text-[11px] font-bold" style={{ color: '#10B981' }}>충족</span>}
                    <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>총 {row.total}건</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                  <div className="h-full rounded-full" style={{
                    width: row.total > 0 ? `${Math.round(((row.total - row.gap) / row.total) * 100)}%` : '100%',
                    background: row.gap > 0 ? '#EF4444' : '#10B981',
                  }} />
                </div>
              </div>
              <ChevronRight size={13} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>

      {/* 관련 허브 바로가기 */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <span className="font-semibold text-[14px]" style={{ color: 'var(--ink)' }}>관련 허브 바로가기</span>
          <span className="ml-2 text-[12px]" style={{ color: 'var(--ink-faint)' }}>자원 제공 하위 조항</span>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {RELATED.map(r => (
            <button key={r.to} onClick={() => nav(r.to)}
              className="flex items-center justify-between p-3 rounded-xl text-left transition"
              style={{ background: `${r.color}10`, border: `1px solid ${r.color}25`, cursor: 'pointer' }}>
              <div>
                <div className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{r.label}</div>
                <div className="text-[11px]" style={{ color: r.color }}>{r.sub}</div>
              </div>
              <ExternalLink size={13} style={{ color: r.color }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 공통 Empty State ───────────────────────────────────────
function EmptyState({ icon: Icon, msg, onAdd }) {
  return (
    <div className="rounded-2xl flex flex-col items-center py-14" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      <Icon size={32} style={{ color: 'var(--ink-faint)', opacity: 0.4, marginBottom: 10 }} />
      <div className="text-[14px] font-medium" style={{ color: 'var(--ink-soft)' }}>{msg}</div>
      {onAdd && (
        <button onClick={onAdd} className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px]"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> 추가
        </button>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────
export default function ResourcePlanHub() {
  const user = auth.current()
  const [tab, setTab] = useState('summary')
  const [people,    setPeople]    = useState(() => ls(NS.people))
  const [equip,     setEquip]     = useState(() => ls(NS.equip))
  const [budget,    setBudget]    = useState(() => ls(NS.budget))
  const [outsource, setOutsource] = useState(() => ls(NS.outsource))

  const totalGaps = useMemo(() => {
    const p = people.filter(d => d.year === CUR_YEAR && d.status === 'gap').length
    const e = equip.filter(d => d.year === CUR_YEAR && d.status === 'gap').length
    const o = outsource.filter(d => d.status === '만료임박').length
    return p + e + o
  }, [people, equip, outsource])

  return (
    <AppLayout user={user} title="자원 계획" subtitle="ISO 13485 §6.1 자원 제공 (Provision of Resources)">
      <HubBanner icon={Layers} title="자원 계획" subtitle="ISO 13485 §6.1 자원 제공" color="#0D9488" />
      <div className="px-6 lg:px-8 py-6 max-w-[1060px] mx-auto space-y-5">

        {/* 헤더 배너 */}
        <div className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, #6366F108, #8B5CF608)', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#6366F115' }}>
              <Target size={20} style={{ color: '#6366F1' }} />
            </div>
            <div>
              <div className="font-bold text-[16px]" style={{ color: 'var(--ink)' }}>자원 계획 관리</div>
              <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                인력 · 설비 · 예산 · 외부서비스 통합 관리 · ISO 13485 §6.1
                {totalGaps > 0 && <span style={{ color: '#EF4444', fontWeight: 600 }}> · 주의 필요 {totalGaps}건</span>}
              </div>
            </div>
          </div>
        </div>

        {/* 탭 바 */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(t => (
            <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon} label={t.label} />
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        {tab === 'summary'  && <SummaryTab people={people} equip={equip} budget={budget} outsource={outsource} setTab={setTab} />}
        {tab === 'people'   && <PeopleTab   data={people}    setData={setPeople}    />}
        {tab === 'equip'    && <EquipTab    data={equip}     setData={setEquip}     />}
        {tab === 'budget'   && <BudgetTab   data={budget}    setData={setBudget}    />}
        {tab === 'outsource'&& <OutsourceTab data={outsource} setData={setOutsource} />}
      </div>
    </AppLayout>
  )
}
