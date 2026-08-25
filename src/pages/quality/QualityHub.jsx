// src/pages/quality/QualityHub.jsx — ISO 13485 §8.3 NCR·부적합 관리
import React, { useState, useMemo } from 'react'
import { ShieldAlert, Plus, Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { evaluateForCAPA, capa } from '../../lib/capaState'

const LS_KEY = 'qualytree.ncrs'
const CNT_KEY = 'qualytree.ncrCounter'

function lsRead() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
function lsWrite(arr) { localStorage.setItem(LS_KEY, JSON.stringify(arr)) }
function nextId() {
  const n = parseInt(localStorage.getItem(CNT_KEY) || '0', 10) + 1
  localStorage.setItem(CNT_KEY, String(n))
  return 'NCR-' + new Date().getFullYear() + '-' + String(n).padStart(4, '0')
}

const SEV_STYLE = {
  Critical: { background: '#FEE2E2', color: '#DC2626' },
  Major:    { background: '#FEF3C7', color: '#D97706' },
  Minor:    { background: '#D1FAE5', color: '#059669' },
}
const ST_STYLE = {
  open:          { background: '#FEE2E2', color: '#DC2626' },
  investigating: { background: '#FEF3C7', color: '#D97706' },
  contained:     { background: '#DBEAFE', color: '#2563EB' },
  corrected:     { background: '#D1FAE5', color: '#059669' },
  closed:        { background: '#F3F4F6', color: '#6B7280' },
}
const ST_KO = { open: '미결', investigating: '조사중', contained: '격리완료', corrected: '시정완료', closed: '종결' }
const ST_FLOW = { open: 'investigating', investigating: 'contained', contained: 'corrected', corrected: 'closed' }

function Badge({ label, s }) {
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, ...s }}>{label}</span>
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '16px 20px' }}>{children}</div>
      </div>
    </div>
  )
}

const IS = { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none', width: '100%', boxSizing: 'border-box' }

function FL({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

const empty = () => ({ title: '', severity: 'Major', source: 'manual', description: '', detectedAt: new Date().toISOString().slice(0,10), detectedBy: '', containment: '', rootCause: '', correctiveAction: '' })

export default function QualityHub() {
  const [records, setRecords] = useState(() => lsRead())
  const [search, setSearch]   = useState('')
  const [sevF, setSevF]       = useState('all')
  const [stF, setStF]         = useState('all')
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(empty())
  const [exp, setExp]         = useState(null)

  const reload = () => setRecords(lsRead())

  const filtered = useMemo(() =>
    records.filter(r => {
      if (sevF !== 'all' && r.severity !== sevF) return false
      if (stF  !== 'all' && r.status   !== stF)  return false
      if (search && !r.title?.toLowerCase().includes(search.toLowerCase()) && !r.id?.includes(search)) return false
      return true
    }), [records, search, sevF, stF])

  const counts = useMemo(() => {
    let open = 0, crit = 0, closed = 0
    records.forEach(r => {
      if (r.status === 'open' || r.status === 'investigating') open++
      if (r.severity === 'Critical') crit++
      if (r.status === 'closed') closed++
    })
    return { total: records.length, open, crit, closed }
  }, [records])

  function save() {
    if (!form.title.trim()) return alert('제목을 입력하세요')
    const all = lsRead()
    const newRecord = { ...form, id: nextId(), status: 'open', createdAt: new Date().toISOString() }
    all.unshift(newRecord)
    lsWrite(all)
    const capaT = evaluateForCAPA(newRecord)
    if (capaT) capa.raise({ title: capaT.suggestedTitle, description: capaT.reason, trigger: capaT.trigger, triggerReason: capaT.reason, sourceNcrIds: [newRecord.id] })
    reload()
    setModal(false)
  }

  function advance(id) {
    const all = lsRead()
    const r = all.find(x => x.id === id)
    if (!r || !ST_FLOW[r.status]) return
    r.status = ST_FLOW[r.status]
    lsWrite(all)
    reload()
  }

  function remove(id) {
    if (!confirm('삭제하시겠습니까?')) return
    lsWrite(lsRead().filter(r => r.id !== id))
    reload()
  }

  const card = { background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: 16, marginBottom: 10 }
  const statCard = { background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 18px', flex: 1, minWidth: 0 }

  return (
    <AppLayout>
      <HubBanner
        icon={ShieldAlert}
        title="NCR·부적합 관리"
        subtitle="ISO 13485 §8.3 — 부적합 제품 식별·격리·시정 관리"
        color="#DC2626"
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: '전체 NCR', value: counts.total, color: 'var(--ink)' },
          { label: '처리중', value: counts.open, color: '#D97706' },
          { label: 'Critical', value: counts.crit, color: '#DC2626' },
          { label: '종결', value: counts.closed, color: '#059669' },
        ].map(s => (
          <div key={s.label} style={statCard}>
            <div style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="번호 또는 제목 검색" style={{ ...IS, paddingLeft: 30 }} />
        </div>
        <select value={sevF} onChange={e => setSevF(e.target.value)} style={{ ...IS, width: 'auto' }}>
          <option value="all">전체 심각도</option>
          <option value="Critical">Critical</option>
          <option value="Major">Major</option>
          <option value="Minor">Minor</option>
        </select>
        <select value={stF} onChange={e => setStF(e.target.value)} style={{ ...IS, width: 'auto' }}>
          <option value="all">전체 상태</option>
          {Object.entries(ST_KO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => { setForm(empty()); setModal(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Plus size={14} /> NCR 등록
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-faint)' }}>
          <ShieldAlert size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 14 }}>등록된 NCR이 없습니다</div>
        </div>
      ) : filtered.map(r => {
        const sev = SEV_STYLE[r.severity] || SEV_STYLE.Minor
        const st  = ST_STYLE[r.status]   || ST_STYLE.open
        const isE = exp === r.id
        const nextSt = ST_FLOW[r.status]
        return (
          <div key={r.id} style={card}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                  <Badge label={r.severity} s={sev} />
                  <Badge label={ST_KO[r.status] || r.status} s={st} />
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{r.id}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>발견일: {r.detectedAt} · 발견자: {r.detectedBy || '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {nextSt && (
                  <button onClick={() => advance(r.id)}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', cursor: 'pointer', fontWeight: 600 }}>
                    → {ST_KO[nextSt]}
                  </button>
                )}
                <button onClick={() => setExp(isE ? null : r.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}>
                  {isE ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                <button onClick={() => remove(r.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>
                  <X size={15}/>
                </button>
              </div>
            </div>
            {isE && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 12 }}>
                {[
                  ['발생 유형', r.source || '—'],
                  ['설명', r.description || '—'],
                  ['격리·봉쁼 조치', r.containment || '—'],
                  ['근본원인', r.rootCause || '—'],
                  ['시정조치', r.correctiveAction || '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontWeight: 700, color: 'var(--ink-faint)', fontSize: 10, marginBottom: 2 }}>{k}</div>
                    <div style={{ color: 'var(--ink)' }}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {modal && (
        <Modal title="NCR 신규 등록" onClose={() => setModal(false)}>
          <FL label="제목 *">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="부적합 사항 제목" style={IS} />
          </FL>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FL label="심각도">
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} style={IS}>
                <option>Critical</option><option>Major</option><option>Minor</option>
              </select>
            </FL>
            <FL label="발생 유형">
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} style={IS}>
                <option value="manual">수동 입력</option>
                <option value="iqc">수입 검사</option>
                <option value="oos">OOS</option>
                <option value="audit">내부 심사</option>
                <option value="complaint">고객 불만</option>
              </select>
            </FL>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FL label="발견일">
              <input type="date" value={form.detectedAt} onChange={e => setForm(f => ({ ...f, detectedAt: e.target.value }))} style={IS} />
            </FL>
            <FL label="발견자">
              <input value={form.detectedBy} onChange={e => setForm(f => ({ ...f, detectedBy: e.target.value }))} placeholder="이름" style={IS} />
            </FL>
          </div>
          <FL label="설명">
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...IS, resize: 'vertical' }} />
          </FL>
          <FL label="격리·봉쁼 조치">
            <textarea value={form.containment} onChange={e => setForm(f => ({ ...f, containment: e.target.value }))} rows={2} style={{ ...IS, resize: 'vertical' }} />
          </FL>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={() => setModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-card)', color: 'var(--ink)', cursor: 'pointer', fontSize: 13 }}>취소</button>
            <button onClick={save} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>등록</button>
          </div>
        </Modal>
      )}
    </AppLayout>
  )
}
