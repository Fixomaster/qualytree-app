import React, { useState } from 'react'
import {
  FlaskConical, FileText, CheckSquare, ClipboardCheck, RefreshCw,
  Cpu, Plus, ArrowLeft, BarChart2,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

/* ── helpers ── */
function nid(p) { return `${p}-${Date.now().toString(36).toUpperCase()}` }
function useLS(key, init) {
  const [v, setV] = useState(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init } catch { return init } })
  const set = (u) => { const n = typeof u === 'function' ? u(v) : u; setV(n); try { localStorage.setItem(key, JSON.stringify(n)) } catch {} }
  return [v, set]
}

/* ── shared style tokens ── */
const inp = { width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--ink)', fontSize: 13, outline: 'none' }
const sel = { ...inp }

/* ── tiny shared components ── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-[15px]" style={{ color: 'var(--ink)' }}>{title}</span>
          <button onClick={onClose} style={{ color: 'var(--ink-faint)', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
function Badge({ text, tone = 'gray' }) {
  const colors = { green: ['var(--leaf-soft)', 'var(--moss)'], red: ['var(--rust-soft)', 'var(--rust)'], amber: ['#fef3c7', '#d97706'], blue: ['#dbeafe', '#2563eb'], gray: ['var(--bg-soft)', 'var(--ink-mute)'] }
  const [bg, fg] = colors[tone] || colors.gray
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: bg, color: fg }}>{text}</span>
}
function EmptyRow({cols,msg}){return(<tr><td colSpan={cols||20} className="py-10 text-center text-sm" style={{color:"var(--ink-mute)"}}>{msg||"등록된 항목이 없습니다."}</td></tr>)}
function EmptyCard({msg}){return(<div className="py-10 text-center text-sm" style={{color:"var(--ink-mute)"}}>{msg||"등록된 항목이 없습니다."}</div>)}

function StatusSelect({ value, options, onChange }) {
  return <select style={{ ...sel, width: 'auto', padding: '4px 8px', fontSize: 12 }} value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o}>{o}</option>)}</select>
}
function ActBtn({ label, onClick, color }) {
  return <button onClick={onClick} className="text-[11.5px] px-2 py-1 rounded-lg transition"
    style={{ color: color === 'red' ? 'var(--rust)' : 'var(--moss)', background: color === 'red' ? 'var(--rust-soft)' : 'var(--leaf-soft)' }}>{label}</button>
}
function SBtn({ children, onClick, secondary }) {
  return <button onClick={onClick} className="px-4 py-2 rounded-xl text-[13px] font-medium transition"
    style={{ background: secondary ? 'var(--bg-soft)' : 'var(--moss)', color: secondary ? 'var(--ink-mute)' : 'var(--bg)' }}>{children}</button>
}
function FL({ label, children }) {
  return <div><label className="block text-[12px] mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</label>{children}</div>
}
function TH({ children }) { return <th className="px-3 py-2 text-left font-mono text-[10.5px] tracking-wide" style={{ color: 'var(--ink-faint)', borderBottom: '1px solid var(--line)' }}>{children}</th> }
function TD({ children, mono, muted, color, right }) {
  return <td className={`px-3 py-2 text-[12.5px]${mono ? ' font-mono' : ''}${right ? ' text-right' : ''}`}
    style={{ color: color || (muted ? 'var(--ink-mute)' : 'var(--ink)'), borderBottom: '1px solid var(--line)' }}>{children}</td>
}
function SectionTitle({ breadcrumb, children }) {
  return (
    <div className="mb-4">
      <div className="font-mono text-[10px] tracking-[0.18em] uppercase mb-1" style={{ color: 'var(--ink-faint)' }}>{breadcrumb}</div>
      <div className="text-[18px] font-semibold" style={{ color: 'var(--ink)' }}>{children}</div>
    </div>
  )
}

/* ── seed data ── */
const INIT_PLANS = [
  { id: 'DPL-001', name: '혈당측정기 v2.0 개발계획', phase: '기획', manager: '김개발', startDate: '2026-01-10', endDate: '2026-12-31', status: '진행중' },
]
const INIT_INPUTS = [
  { id: 'DIN-001', plan: 'DPL-001', title: 'IEC 62366 사용적합성 요구사항', category: '규제·표준', priority: '높음', date: '2026-02-01', status: '확정' },
]
const INIT_OUTPUTS = [
  { id: 'DOT-001', plan: 'DPL-001', title: '회로 설계도 Rev.A', category: '하드웨어', relatedInput: 'DIN-001', date: '2026-03-15', status: '검토중' },
]
const INIT_VERIFICATIONS = [
  { id: 'DVR-001', plan: 'DPL-001', title: '전기안전 시험 (IEC 60601)', method: '시험', result: '합격', date: '2026-04-20', status: '완료' },
]
const INIT_VALIDATIONS = [
  { id: 'DVL-001', plan: 'DPL-001', title: '임상 사용적합성 평가', method: '사용자 시험', site: '세브란스병원', date: '2026-05-10', status: '계획' },
]
const INIT_CHANGES = [
  { id: 'DCH-001', plan: 'DPL-001', title: '센서 모듈 교체 (A→B)', reason: '수급 이슈', risk: '낮음', approver: '이부장', date: '2026-06-01', status: '승인' },
]
const INIT_PROCESSES = [
  { id: 'PDV-001', plan: 'DPL-001', title: '조립 공정 설계', type: '조립', doc: 'WI-ASM-001', validated: '완료', date: '2026-07-01', status: '완료' },
]

/* ──────────────────────────────────────────────
   개발 계획 뷰
────────────────────────────────────────────── */
function PlanView({ plans, setPlans }) {
  const [modal, setModal] = useState(null)
  const [edit, setEdit] = useState(null)
  const statusOpts = ['기획', '진행중', '검토', '완료', '보류']
  const phaseOpts = ['기획', '개념설계', '상세설계', '시제품', '검증', '양산이관', '완료']
  const init = { id: '', name: '', phase: '기획', manager: '', startDate: '', endDate: '', status: '기획' }
  const save = (f) => {
    if (edit) { setPlans(p => p.map(x => x.id === edit.id ? { ...x, ...f } : x)); setEdit(null) }
    else { setPlans(p => [...p, { ...init, id: nid('DPL'), ...f }]) }
    setModal(null)
  }
  const del = (id) => { if (window.confirm('삭제하시겠습니까?')) setPlans(p => p.filter(x => x.id !== id)) }
  return (
    <div>
      <SectionTitle breadcrumb="개발 › 개발 계획">개발 계획</SectionTitle>
      <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--ink-faint)' }}>설계·개발 계획 관리 (ISO 13485 §7.3.2)</span>
          <button onClick={() => { setEdit(null); setModal('form') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background: 'var(--moss)', color: 'var(--bg)' }}>
            <Plus size={13}/> 계획 등록
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['계획ID', '프로젝트명', '단계', '담당자', '시작일', '완료예정', '상태', '작업'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {plans.length===0?<EmptyRow/>:plans.map(p=>(
      <tr key={p.id}>
                  <TD mono color="var(--moss)">{p.id}</TD>
                  <TD>{p.name}</TD>
                  <TD><Badge text={p.phase} tone="blue"/></TD>
                  <TD muted>{p.manager}</TD>
                  <TD mono muted>{p.startDate}</TD>
                  <TD mono muted>{p.endDate}</TD>
                  <TD>
                    <StatusSelect value={p.status} options={statusOpts}
                      onChange={v => setPlans(prev => prev.map(x => x.id === p.id ? { ...x, status: v } : x))}/>
                  </TD>
                  <TD>
                    <div className="flex gap-1">
                      <ActBtn label="수정" onClick={() => { setEdit(p); setModal('form') }}/>
                      <ActBtn label="삭제" color="red" onClick={() => del(p.id)}/>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      {modal === 'form' && (
        <Modal title={edit ? '개발 계획 수정' : '개발 계획 등록'} onClose={() => { setModal(null); setEdit(null) }}>
          <PlanForm initial={edit || init} phaseOpts={phaseOpts} statusOpts={statusOpts} onSave={save} onCancel={() => { setModal(null); setEdit(null) }}/>
        </Modal>
      )}
      </div>
    </div>
  )
}
function PlanForm({ initial, phaseOpts, statusOpts, onSave, onCancel }) {
  const [f, sf] = useState(initial)
  const set = k => e => sf(p => ({ ...p, [k]: e.target.value }))
  return (
    <div className="space-y-3">
      <FL label="프로젝트명 *"><input style={inp} value={f.name} onChange={set('name')} placeholder="개발 프로젝트명"/></FL>
      <div className="grid grid-cols-2 gap-3">
        <FL label="개발 단계">
          <select style={sel} value={f.phase} onChange={set('phase')}>
            {phaseOpts.map(o => <option key={o}>{o}</option>)}
          </select>
        </FL>
        <FL label="담당자"><input style={inp} value={f.manager} onChange={set('manager')} placeholder="홍길동"/></FL>
        <FL label="시작일"><input style={inp} type="date" value={f.startDate} onChange={set('startDate')}/></FL>
        <FL label="완료 예정일"><input style={inp} type="date" value={f.endDate} onChange={set('endDate')}/></FL>
        <FL label="상태">
          <select style={sel} value={f.status} onChange={set('status')}>
            {statusOpts.map(o => <option key={o}>{o}</option>)}
          </select>
        </FL>
      </div>
      <div className="flex gap-2 pt-2">
        <SBtn onClick={()=>{if(!f.name||!String(f.name).trim()){alert("필수 항목(*)을 입력하세요.");return;}onSave(f)}}>{initial.name ? '수정 저장' : '등록'}</SBtn>
        <SBtn onClick={onCancel} secondary>취소</SBtn>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   설계 입력 뷰
────────────────────────────────────────────── */
function InputView({ inputs, setInputs, plans }) {
  const [modal, setModal] = useState(null)
  const [edit, setEdit] = useState(null)
  const statusOpts = ['초안', '검토중', '확정', '폐기']
  const catOpts = ['규제·표준', '사용자 요구', '기능', '성능', '안전', '생산성', '기타']
  const init = { id: '', plan: '', title: '', category: '기능', priority: '보통', date: new Date().toISOString().slice(0, 10), status: '초안' }
  const save = (f) => {
    if (edit) { setInputs(p => p.map(x => x.id === edit.id ? { ...x, ...f } : x)); setEdit(null) }
    else { setInputs(p => [...p, { ...init, id: nid('DIN'), ...f }]) }
    setModal(null)
  }
  const del = (id) => { if (window.confirm('삭제하시겠습니까?')) setInputs(p => p.filter(x => x.id !== id)) }
  return (
    <div>
      <SectionTitle breadcrumb="개발 › 설계 입력">설계 입력</SectionTitle>
      <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--ink-faint)' }}>설계 입력 요구사항 (ISO 13485 §7.3.3)</span>
          <button onClick={() => { setEdit(null); setModal('form') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background: 'var(--moss)', color: 'var(--bg)' }}>
            <Plus size={13}/> 입력 등록
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['입력ID', '연계계획', '요구사항', '분류', '우선순위', '일자', '상태', '작업'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {inputs.length===0?<EmptyRow/>:inputs.map(d=>(
      <tr key={d.id}>
                  <TD mono color="var(--moss)">{d.id}</TD>
                  <TD mono muted>{d.plan}</TD>
                  <TD>{d.title}</TD>
                  <TD><Badge text={d.category} tone="gray"/></TD>
                  <TD><Badge text={d.priority} tone={d.priority === '높음' ? 'red' : d.priority === '보통' ? 'amber' : 'gray'}/></TD>
                  <TD mono muted>{d.date}</TD>
                  <TD>
                    <StatusSelect value={d.status} options={statusOpts}
                      onChange={v => setInputs(p => p.map(x => x.id === d.id ? { ...x, status: v } : x))}/>
                  </TD>
                  <TD>
                    <div className="flex gap-1">
                      <ActBtn label="수정" onClick={() => { setEdit(d); setModal('form') }}/>
                      <ActBtn label="삭제" color="red" onClick={() => del(d.id)}/>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal === 'form' && (
        <Modal title={edit ? '설계 입력 수정' : '설계 입력 등록'} onClose={() => { setModal(null); setEdit(null) }}>
          <InputForm initial={edit || init} plans={plans} catOpts={catOpts} statusOpts={statusOpts} onSave={save} onCancel={() => { setModal(null); setEdit(null) }}/>
        </Modal>
      )}
    </div>
  )
}
function InputForm({ initial, plans, catOpts, statusOpts, onSave, onCancel }) {
  const [f, sf] = useState(initial)
  const set = k => e => sf(p => ({ ...p, [k]: e.target.value }))
  return (
    <div className="space-y-3">
      <FL label="연계 개발 계획">
        <select style={sel} value={f.plan} onChange={set('plan')}>
          <option value="">선택하세요</option>
          {plans.map(p => <option key={p.id} value={p.id}>{p.id} – {p.name}</option>)}
        </select>
      </FL>
      <FL label="요구사항 *"><input style={inp} value={f.title} onChange={set('title')} placeholder="요구사항 내용을 입력하세요"/></FL>
      <div className="grid grid-cols-2 gap-3">
        <FL label="분류">
          <select style={sel} value={f.category} onChange={set('category')}>
            {catOpts.map(o => <option key={o}>{o}</option>)}
          </select>
        </FL>
        <FL label="우선순위">
          <select style={sel} value={f.priority} onChange={set('priority')}>
            {['높음', '보통', '낮음'].map(o => <option key={o}>{o}</option>)}
          </select>
        </FL>
        <FL label="일자"><input style={inp} type="date" value={f.date} onChange={set('date')}/></FL>
        <FL label="상태">
          <select style={sel} value={f.status} onChange={set('status')}>
            {statusOpts.map(o => <option key={o}>{o}</option>)}
          </select>
        </FL>
      </div>
      <div className="flex gap-2 pt-2">
        <SBtn onClick={()=>{if(!f.title||!String(f.title).trim()){alert("필수 항목(*)을 입력하세요.");return;}onSave(f)}}>{initial.title ? '수정 저장' : '등록'}</SBtn>
        <SBtn onClick={onCancel} secondary>취소</SBtn>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   설계 출력 뷰
────────────────────────────────────────────── */
function OutputView({ outputs, setOutputs, plans, inputs }) {
  const [modal, setModal] = useState(null)
  const [edit, setEdit] = useState(null)
  const statusOpts = ['초안', '검토중', '승인', '릴리즈', '폐기']
  const catOpts = ['하드웨어', '소프트웨어', '문서', '공정', '포장', '라벨링', '기타']
  const init = { id: '', plan: '', title: '', category: '문서', relatedInput: '', doc: '', date: new Date().toISOString().slice(0, 10), status: '초안' }
  const save = (f) => {
    if (edit) { setOutputs(p => p.map(x => x.id === edit.id ? { ...x, ...f } : x)); setEdit(null) }
    else { setOutputs(p => [...p, { ...init, id: nid('DOT'), ...f }]) }
    setModal(null)
  }
  const del = (id) => { if (window.confirm('삭제하시겠습니까?')) setOutputs(p => p.filter(x => x.id !== id)) }
  return (
    <div>
      <SectionTitle breadcrumb="개발 › 설계 출력">설계 출력</SectionTitle>
      <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--ink-faint)' }}>설계 출력물 관리 (ISO 13485 §7.3.4)</span>
          <button onClick={() => { setEdit(null); setModal('form') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background: 'var(--moss)', color: 'var(--bg)' }}>
            <Plus size={13}/> 출력 등록
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['출력ID', '계획', '산출물명', '분류', '연계입력', '문서번호', '일자', '상태', '작업'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {outputs.length===0?<EmptyRow/>:outputs.map(d=>(
      <tr key={d.id}>
                  <TD mono color="var(--moss)">{d.id}</TD>
                  <TD mono muted>{d.plan}</TD>
                  <TD>{d.title}</TD>
                  <TD><Badge text={d.category} tone="blue"/></TD>
                  <TD mono muted>{d.relatedInput}</TD>
                  <TD mono muted>{d.doc}</TD>
                  <TD mono muted>{d.date}</TD>
                  <TD>
                    <StatusSelect value={d.status} options={statusOpts}
                      onChange={v => setOutputs(p => p.map(x => x.id === d.id ? { ...x, status: v } : x))}/>
                  </TD>
                  <TD>
                    <div className="flex gap-1">
                      <ActBtn label="수정" onClick={() => { setEdit(d); setModal('form') }}/>
                      <ActBtn label="삭제" color="red" onClick={() => del(d.id)}/>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal === 'form' && (
        <Modal title={edit ? '설계 출력 수정' : '설계 출력 등록'} onClose={() => { setModal(null); setEdit(null) }}>
          <OutputForm initial={edit || init} plans={plans} inputs={inputs} catOpts={catOpts} statusOpts={statusOpts} onSave={save} onCancel={() => { setModal(null); setEdit(null) }}/>
        </Modal>
      )}
    </div>
  )
}
function OutputForm({ initial, plans, inputs, catOpts, statusOpts, onSave, onCancel }) {
  const [f, sf] = useState(initial)
  const set = k => e => sf(p => ({ ...p, [k]: e.target.value }))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="연계 계획">
          <select style={sel} value={f.plan} onChange={set('plan')}>
            <option value="">선택</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
          </select>
        </FL>
        <FL label="분류">
          <select style={sel} value={f.category} onChange={set('category')}>
            {catOpts.map(o => <option key={o}>{o}</option>)}
          </select>
        </FL>
      </div>
      <FL label="산출물명 *"><input style={inp} value={f.title} onChange={set('title')} placeholder="산출물 이름을 입력하세요"/></FL>
      <div className="grid grid-cols-2 gap-3">
        <FL label="연계 설계 입력">
          <select style={sel} value={f.relatedInput} onChange={set('relatedInput')}>
            <option value="">선택</option>
            {inputs.map(i => <option key={i.id} value={i.id}>{i.id}</option>)}
          </select>
        </FL>
        <FL label="문서번호"><input style={inp} value={f.doc} onChange={set('doc')} placeholder="DOC-XXX"/></FL>
        <FL label="일자"><input style={inp} type="date" value={f.date} onChange={set('date')}/></FL>
        <FL label="상태">
          <select style={sel} value={f.status} onChange={set('status')}>
            {statusOpts.map(o => <option key={o}>{o}</option>)}
          </select>
        </FL>
      </div>
      <div className="flex gap-2 pt-2">
        <SBtn onClick={()=>{if(!f.title||!String(f.title).trim()){alert("필수 항목(*)을 입력하세요.");return;}onSave(f)}}>{initial.title ? '수정 저장' : '등록'}</SBtn>
        <SBtn onClick={onCancel} secondary>취소</SBtn>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   설계 검증 뷰
────────────────────────────────────────────── */
function VerificationView({ verifications, setVerifications, plans }) {
  const [modal, setModal] = useState(null)
  const [edit, setEdit] = useState(null)
  const statusOpts = ['계획', '진행중', '완료', '실패', '보류']
  const methodOpts = ['시험', '분석', '검사', '데모', '리뷰']
  const init = { id: '', plan: '', title: '', method: '시험', result: '', tester: '', date: new Date().toISOString().slice(0, 10), status: '계획' }
  const save = (f) => {
    if (edit) { setVerifications(p => p.map(x => x.id === edit.id ? { ...x, ...f } : x)); setEdit(null) }
    else { setVerifications(p => [...p, { ...init, id: nid('DVR'), ...f }]) }
    setModal(null)
  }
  const del = (id) => { if (window.confirm('삭제하시겠습니까?')) setVerifications(p => p.filter(x => x.id !== id)) }
  return (
    <div>
      <SectionTitle breadcrumb="개발 › 설계 검증">설계 검증</SectionTitle>
      <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--ink-faint)' }}>설계 검증 활동 (ISO 13485 §7.3.6)</span>
          <button onClick={() => { setEdit(null); setModal('form') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background: 'var(--moss)', color: 'var(--bg)' }}>
            <Plus size={13}/> 검증 등록
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['검증ID', '계획', '검증항목', '방법', '시험자', '결과', '일자', '상태', '작업'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {verifications.length===0?<EmptyRow/>:verifications.map(d=>(
      <tr key={d.id}>
                  <TD mono color="var(--moss)">{d.id}</TD>
                  <TD mono muted>{d.plan}</TD>
                  <TD>{d.title}</TD>
                  <TD><Badge text={d.method} tone="gray"/></TD>
                  <TD muted>{d.tester}</TD>
                  <TD><Badge text={d.result || '-'} tone={d.result === '합격' ? 'green' : d.result === '불합격' ? 'red' : 'gray'}/></TD>
                  <TD mono muted>{d.date}</TD>
                  <TD>
                    <StatusSelect value={d.status} options={statusOpts}
                      onChange={v => setVerifications(p => p.map(x => x.id === d.id ? { ...x, status: v } : x))}/>
                  </TD>
                  <TD>
                    <div className="flex gap-1">
                      <ActBtn label="수정" onClick={() => { setEdit(d); setModal('form') }}/>
                      <ActBtn label="삭제" color="red" onClick={() => del(d.id)}/>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal === 'form' && (
        <Modal title={edit ? '설계 검증 수정' : '설계 검증 등록'} onClose={() => { setModal(null); setEdit(null) }}>
          <VVForm initial={edit || init} plans={plans} methodOpts={methodOpts} statusOpts={statusOpts}
            resultOpts={['합격', '불합격', '조건부합격', '진행중', '']}
            onSave={save} onCancel={() => { setModal(null); setEdit(null) }}/>
        </Modal>
      )}
    </div>
  )
}
function VVForm({ initial, plans, methodOpts, statusOpts, resultOpts, onSave, onCancel }) {
  const [f, sf] = useState(initial)
  const set = k => e => sf(p => ({ ...p, [k]: e.target.value }))
  return (
    <div className="space-y-3">
      <FL label="검증 항목 *"><input style={inp} value={f.title} onChange={set('title')} placeholder="검증 항목명"/></FL>
      <div className="grid grid-cols-2 gap-3">
        <FL label="연계 계획">
          <select style={sel} value={f.plan} onChange={set('plan')}>
            <option value="">선택</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
          </select>
        </FL>
        <FL label="방법">
          <select style={sel} value={f.method} onChange={set('method')}>
            {methodOpts.map(o => <option key={o}>{o}</option>)}
          </select>
        </FL>
        <FL label="시험자"><input style={inp} value={f.tester} onChange={set('tester')} placeholder="담당자명"/></FL>
        <FL label="결과">
          <select style={sel} value={f.result} onChange={set('result')}>
            {resultOpts.map(o => <option key={o} value={o}>{o || '미정'}</option>)}
          </select>
        </FL>
        <FL label="일자"><input style={inp} type="date" value={f.date} onChange={set('date')}/></FL>
        <FL label="상태">
          <select style={sel} value={f.status} onChange={set('status')}>
            {statusOpts.map(o => <option key={o}>{o}</option>)}
          </select>
        </FL>
      </div>
      <div className="flex gap-2 pt-2">
        <SBtn onClick={()=>{if(!f.title||!String(f.title).trim()){alert("필수 항목(*)을 입력하세요.");return;}onSave(f)}}>{initial.title ? '수정 저장' : '등록'}</SBtn>
        <SBtn onClick={onCancel} secondary>취소</SBtn>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   설계 유효성 확인 뷰
────────────────────────────────────────────── */
function ValidationView({ validations, setValidations, plans }) {
  const [modal, setModal] = useState(null)
  const [edit, setEdit] = useState(null)
  const statusOpts = ['계획', '진행중', '완료', '실패', '보류']
  const init = { id: '', plan: '', title: '', method: '사용자 시험', site: '', result: '', date: new Date().toISOString().slice(0, 10), status: '계획' }
  const save = (f) => {
    if (edit) { setValidations(p => p.map(x => x.id === edit.id ? { ...x, ...f } : x)); setEdit(null) }
    else { setValidations(p => [...p, { ...init, id: nid('DVL'), ...f }]) }
    setModal(null)
  }
  const del = (id) => { if (window.confirm('삭제하시겠습니까?')) setValidations(p => p.filter(x => x.id !== id)) }
  return (
    <div>
      <SectionTitle breadcrumb="개발 › 설계 유효성 확인">설계 유효성 확인</SectionTitle>
      <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--ink-faint)' }}>설계 유효성 확인 (ISO 13485 §7.3.7)</span>
          <button onClick={() => { setEdit(null); setModal('form') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background: 'var(--moss)', color: 'var(--bg)' }}>
            <Plus size={13}/> 유효성확인 등록
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['ID', '계획', '유효성확인 항목', '방법', '수행기관', '결과', '일자', '상태', '작업'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {validations.length===0?<EmptyRow/>:validations.map(d=>(
      <tr key={d.id}>
                  <TD mono color="var(--moss)">{d.id}</TD>
                  <TD mono muted>{d.plan}</TD>
                  <TD>{d.title}</TD>
                  <TD muted>{d.method}</TD>
                  <TD muted>{d.site}</TD>
                  <TD><Badge text={d.result || '-'} tone={d.result === '합격' ? 'green' : d.result === '불합격' ? 'red' : 'gray'}/></TD>
                  <TD mono muted>{d.date}</TD>
                  <TD>
                    <StatusSelect value={d.status} options={statusOpts}
                      onChange={v => setValidations(p => p.map(x => x.id === d.id ? { ...x, status: v } : x))}/>
                  </TD>
                  <TD>
                    <div className="flex gap-1">
                      <ActBtn label="수정" onClick={() => { setEdit(d); setModal('form') }}/>
                      <ActBtn label="삭제" color="red" onClick={() => del(d.id)}/>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal === 'form' && (
        <Modal title={edit ? '유효성확인 수정' : '유효성확인 등록'} onClose={() => { setModal(null); setEdit(null) }}>
          <ValForm initial={edit || init} plans={plans} statusOpts={statusOpts} onSave={save} onCancel={() => { setModal(null); setEdit(null) }}/>
        </Modal>
      )}
    </div>
  )
}
function ValForm({ initial, plans, statusOpts, onSave, onCancel }) {
  const [f, sf] = useState(initial)
  const set = k => e => sf(p => ({ ...p, [k]: e.target.value }))
  return (
    <div className="space-y-3">
      <FL label="유효성확인 항목 *"><input style={inp} value={f.title} onChange={set('title')} placeholder="유효성확인 항목명"/></FL>
      <div className="grid grid-cols-2 gap-3">
        <FL label="연계 계획">
          <select style={sel} value={f.plan} onChange={set('plan')}>
            <option value="">선택</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
          </select>
        </FL>
        <FL label="방법"><input style={inp} value={f.method} onChange={set('method')} placeholder="사용자 시험, 임상 등"/></FL>
        <FL label="수행기관/장소"><input style={inp} value={f.site} onChange={set('site')} placeholder="병원명, 기관명"/></FL>
        <FL label="결과">
          <select style={sel} value={f.result} onChange={set('result')}>
            {['', '합격', '불합격', '조건부합격'].map(o => <option key={o} value={o}>{o || '미정'}</option>)}
          </select>
        </FL>
        <FL label="일자"><input style={inp} type="date" value={f.date} onChange={set('date')}/></FL>
        <FL label="상태">
          <select style={sel} value={f.status} onChange={set('status')}>
            {statusOpts.map(o => <option key={o}>{o}</option>)}
          </select>
        </FL>
      </div>
      <div className="flex gap-2 pt-2">
        <SBtn onClick={()=>{if(!f.title||!String(f.title).trim()){alert("필수 항목(*)을 입력하세요.");return;}onSave(f)}}>{initial.title ? '수정 저장' : '등록'}</SBtn>
        <SBtn onClick={onCancel} secondary>취소</SBtn>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   설계 변경 뷰
────────────────────────────────────────────── */
function ChangeView({ changes, setChanges, plans }) {
  const [modal, setModal] = useState(null)
  const [edit, setEdit] = useState(null)
  const statusOpts = ['검토요청', '검토중', '승인', '반려', '구현완료']
  const init = { id: '', plan: '', title: '', reason: '', risk: '낮음', approver: '', date: new Date().toISOString().slice(0, 10), status: '검토요청' }
  const save = (f) => {
    if (edit) { setChanges(p => p.map(x => x.id === edit.id ? { ...x, ...f } : x)); setEdit(null) }
    else { setChanges(p => [...p, { ...init, id: nid('DCH'), ...f }]) }
    setModal(null)
  }
  const del = (id) => { if (window.confirm('삭제하시겠습니까?')) setChanges(p => p.filter(x => x.id !== id)) }
  return (
    <div>
      <SectionTitle breadcrumb="개발 › 설계 변경">설계 변경</SectionTitle>
      <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--ink-faint)' }}>설계 변경 관리 (ISO 13485 §7.3.9)</span>
          <button onClick={() => { setEdit(null); setModal('form') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background: 'var(--moss)', color: 'var(--bg)' }}>
            <Plus size={13}/> 변경 등록
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['변경ID', '계획', '변경내용', '변경사유', '위험도', '승인자', '일자', '상태', '작업'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {changes.length===0?<EmptyRow/>:changes.map(d=>(
      <tr key={d.id}>
                  <TD mono color="var(--moss)">{d.id}</TD>
                  <TD mono muted>{d.plan}</TD>
                  <TD>{d.title}</TD>
                  <TD muted>{d.reason}</TD>
                  <TD><Badge text={d.risk} tone={d.risk === '높음' ? 'red' : d.risk === '보통' ? 'amber' : 'green'}/></TD>
                  <TD muted>{d.approver}</TD>
                  <TD mono muted>{d.date}</TD>
                  <TD>
                    <StatusSelect value={d.status} options={statusOpts}
                      onChange={v => setChanges(p => p.map(x => x.id === d.id ? { ...x, status: v } : x))}/>
                  </TD>
                  <TD>
                    <div className="flex gap-1">
                      <ActBtn label="수정" onClick={() => { setEdit(d); setModal('form') }}/>
                      <ActBtn label="삭제" color="red" onClick={() => del(d.id)}/>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal === 'form' && (
        <Modal title={edit ? '설계 변경 수정' : '설계 변경 등록'} onClose={() => { setModal(null); setEdit(null) }}>
          <ChangeForm initial={edit || init} plans={plans} statusOpts={statusOpts} onSave={save} onCancel={() => { setModal(null); setEdit(null) }}/>
        </Modal>
      )}
    </div>
  )
}
function ChangeForm({ initial, plans, statusOpts, onSave, onCancel }) {
  const [f, sf] = useState(initial)
  const set = k => e => sf(p => ({ ...p, [k]: e.target.value }))
  return (
    <div className="space-y-3">
      <FL label="변경 내용 *"><input style={inp} value={f.title} onChange={set('title')} placeholder="변경 내용을 입력하세요"/></FL>
      <FL label="변경 사유"><input style={inp} value={f.reason} onChange={set('r%ason')} placeholder="변경 사유"/></FL>
      <div className="grid grid-cols-2 gap-3">
        <FL label="연계 계획">
          <select style={sel} value={f.plan} onChange={set('plan')}>
            <option value="">선택</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
          </select>
        </FL>
        <FL label="위험도">
          <select style={sel} value={f.risk} onChange={set('risk')}>
            {['낮음', '보통', '높음'].map(o => <option key={o}>{o}</option>)}
          </select>
        </FL>
        <FL label="승인자"><input style={inp} value={f.approver} onChange={set('approver')} placeholder="승인자명"/></FL>
        <FL label="일자"><input style={inp} type="date" value={f.date} onChange={set('date')}/></FL>
        <FL label="상태">
          <select style={sel} value={f.status} onChange={set('status')}>
            {statusOpts.map(o => <option key={o}>{o}</option>)}
          </select>
        </FL>
      </div>
      <div className="flex gap-2 pt-2">
        <SBtn onClick={()=>{if(!f.title||!String(f.title).trim()){alert("필수 항목(*)을 입력하세요.");return;}onSave(f)}}>{initial.title ? '수정 저장' : '등록'}</SBtn>
        <SBtn onClick={onCancel} secondary>취소</SBtn>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   공정 개발 뷰
────────────────────────────────────────────── */
function ProcessView({ processes, setProcesses, plans }) {
  const [modal, setModal] = useState(null)
  const [edit, setEdit] = useState(null)
  const statusOpts = ['설계', '시운전', '검증완료', '승인', '이관완료']
  const typeOpts = ['조립', '시험', '세척', '멸균', '포장', '라벨링', '검사', '기타']
  const init = { id: '', plan: '', title: '', type: '조립', doc: '', validated: '미완료', date: new Date().toISOString().slice(0, 10), status: '설계' }
  const save = (f) => {
    if (edit) { setProcesses(p => p.map(x => x.id === edit.id ? { ...x, ...f } : x)); setEdit(null) }
    else { setProcesses(p => [...p, { ...init, id: nid('PDV'), ...f }]) }
    setModal(null)
  }
  const del = (id) => { if (window.confirm('삭제하시겠습니까?')) setProcesses(p => p.filter(x => x.id !== id)) }
  return (
    <div>
      <SectionTitle breadcrumb="개발 › 공정 개발">공정 개발</SectionTitle>
      <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--ink-faint)' }}>공정 개발 및 밸리데이션 (ISO 13485 §7.5.6)</span>
          <button onClick={() => { setEdit(null); setModal('form') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background: 'var(--moss)', color: 'var(--bg)' }}>
            <Plus size={13}/> 공정 등록
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['공정ID', '계획', '공정명', '유형', '작업지시서', '밸리데이션', '일자', '상태', '작업'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {processes.length===0?<EmptyRow/>:processes.map(d=>(
      <tr key={d.id}>
                  <TD mono color="var(--moss)">{d.id}</TD>
                  <TD mono muted>{d.plan}</TD>
                  <TD>{d.title}</TD>
                  <TD><Badge text={d.type} tone="blue"/></TD>
                  <TD mono muted>{d.doc}</TD>
                  <TD><Badge text={d.validated} tone={d.validated === '완료' ? 'green' : d.validated === '진행중' ? 'amber' : 'gray'}/></TD>
                  <TD mono muted>{d.date}</TD>
                  <TD>
                    <StatusSelect value={d.status} options={statusOpts}
                      onChange={v => setProcesses(p => p.map(x => x.id === d.id ? { ...x, status: v } : x))}/>
                  </TD>
                  <TD>
                    <div className="flex gap-1">
                      <ActBtn label="수정" onClick={() => { setEdit(d); setModal('form') }}/>
                      <ActBtn label="삭제" color="red" onClick={() => del(d.id)}/>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal === 'form' && (
        <Modal title={edit ? '공정 수정' : '공정 등록'} onClose={() => { setModal(null); setEdit(null) }}>
          <ProcessForm initial={edit || init} plans={plans} typeOpts={typeOpts} statusOpts={statusOpts} onSave={save} onCancel={() => { setModal(null); setEdit(null) }}/>
        </Modal>
      )}
    </div>
  )
}
function ProcessForm({ initial, plans, typeOpts, statusOpts, onSave, onCancel }) {
  const [f, sf] = useState(initial)
  const set = k => e => sf(p => ({ ...p, [k]: e.target.value }))
  return (
    <div className="space-y-3">
      <FL label="공정명 *"><input style={inp} value={f.title} onChange={set('title')} placeholder="공정명을 입력하세요"/></FL>
      <div className="grid grid-cols-2 gap-3">
        <FL label="연계 계획">
          <select style={sel} value={f.plan} onChange={set('plan')}>
            <option value="">선택</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
          </select>
        </FL>
        <FL label="공정 유형">
          <select style={sel} value={f.type} onChange={set('type')}>
            {typeOpts.map(o => <option key={o}>{o}</option>)}
          </select>
        </FL>
        <FL label="작업지시서 번호"><input style={inp} value={f.doc} onChange={set('doc')} placeholder="WI-XXX-XXX"/></FL>
        <FL label="밸리데이션">
          <select style={sel} value={f.validated} onChange={set('validated')}>
            {['미완료', '진행중', '완료'].map(o => <option key={o}>{o}</option>)}
          </select>
        </FL>
        <FL label="일자"><input style={inp} type="date" value={f.date} onChange={set('date')}/></FL>
        <FL label="상태">
          <select style={sel} value={f.status} onChange={set('status')}>
            {statusOpts.map(o => <option key={o}>{o}</option>)}
          </select>
        </FL>
      </div>
      <div className="flex gap-2 pt-2">
        <SBtn onClick={()=>{if(!f.title||!String(f.title).trim()){alert("필수 항목(*)을 입력하세요.");return;}onSave(f)}}>{initial.title ? '수정 저장' : '등록'}</SBtn>
        <SBtn onClick={onCancel} secondary>취소</SBtn>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   개발 홈
────────────────────────────────────────────── */
function DevHome({ plans, inputs, outputs, verifications, validations, changes, processes, onNavigate }) {
  const activePlans = plans.filter(p => !['완료', '보류'].includes(p.status)).length
  const pendingChanges = changes.filter(c => ['검토요청', '검토중'].includes(c.status)).length
  const CARDS = [
    { id: 'plans', icon: FlaskConical, label: '개발 계획', desc: '설계·개발 프로젝트 계획 수립 · 단계 관리 · 담당자 배정', count: `${activePlans}건 진행`, warn: false },
    { id: 'inputs', icon: FileText, label: '설계 입력', desc: '사용자·규제·성능 요구사항 등록 · 우선순위 관리', count: `${inputs.length}건`, warn: false },
    { id: 'outputs', icon: ClipboardCheck, label: '설계 출력', desc: '하드웨어·소프트웨어·문서 산출물 추적 관리', count: `${outputs.length}건`, warn: false },
    { id: 'verifications', icon: CheckSquare, label: '설계 검증', desc: '시험·분석·검사를 통한 설계 요구사항 충족 확인', count: `${verifications.filter(v => v.status !== '완료').length}건 미완료`, warn: verifications.some(v => v.result === '불합격') },
    { id: 'validations', icon: BarChart2, label: '설계 유효성 확인', desc: '임상·사용자 시험을 통한 의도된 사용 목적 확인', count: `${validations.length}건`, warn: false },
    { id: 'changes', icon: RefreshCw, label: '설계 변경', desc: '설계 변경 요청 · 위험 평가 · 승인 추적', count: `${pendingChanges}건 검토중`, warn: pendingChanges > 0 },
    { id: 'processes', icon: Cpu, label: '공정 개발', desc: '제조 공정 설계 · 밸리데이션 · 작업지시서 연계', count: `${processes.length}건`, warn: false },
  ]
  const summary = [
    { label: '진행중 개발 계획', value: `${activePlans}건`, sub: '활성 프로젝트' },
    { label: '검토중 변경 요청', value: `${pendingChanges}건`, sub: '승인 대기', warn: pendingChanges > 0 },
    { label: '검증 완료', value: `${verifications.filter(v => v.status === '완료').length}건`, sub: `전체 ${verifications.length}건` },
    { label: '공정 밸리데이션', value: `${processes.filter(p => p.validated === '완료').length}건`, sub: '완료' },
  ]
  return (
    <div>
      <div className="mb-5">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>DEV · ISO 13485 §7.3 · §7.5.6</span>
        <div className="text-[26px] mt-1 font-semibold" style={{ color: 'var(--ink)' }}>개발</div>
        <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>제품 설계·개발 계획부터 공정 밸리데이션까지 전 주기 관리</div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {summary.length===0?<EmptyCard/>:summary.map(s=>(
      <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[12px] mb-1" style={{ color: 'var(--ink-mute)' }}>{s.label}</div>
            <div className="text-[24px] font-bold" style={{ color: s.warn ? 'var(--rust)' : 'var(--moss)' }}>{s.value}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CARDS.map(card => (
          <button key={card.id} onClick={() => onNavigate(card.id)}
            className="rounded-xl p-4 text-left transition hover:shadow-md"
            style={{ background: 'var(--bg-card)', border: `1px solid ${card.warn ? 'var(--rust)' : 'var(--line)'}` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: card.warn ? 'var(--rust-soft)' : 'var(--leaf-soft)' }}>
                <card.icon size={18} style={{ color: card.warn ? 'var(--rust)' : 'var(--moss)' }} strokeWidth={1.7}/>
              </div>
              <span className="text-[13px] font-bold" style={{ color: card.warn ? 'var(--rust)' : 'var(--moss)' }}>{card.count}</span>
            </div>
            <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>{card.label}</div>
            <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{card.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   루트 컴포넌트
────────────────────────────────────────────── */
export default function ProductsHub() {
  const user = auth.current()
  const [view, setView] = useState('home')

  const [plans, setPlans] = useLS('qms_dev_plans', INIT_PLANS)
  const [inputs, setInputs] = useLS('qms_dev_inputs', INIT_INPUTS)
  const [outputs, setOutputs] = useLS('qms_dev_outputs', INIT_OUTPUTS)
  const [verifications, setVerifications] = useLS('qms_dev_verifications', INIT_VERIFICATIONS)
  const [validations, setValidations] = useLS('qms_dev_validations', INIT_VALIDATIONS)
  const [changes, setChanges] = useLS('qms_dev_changes', INIT_CHANGES)
  const [processes, setProcesses] = useLS('qms_dev_processes', INIT_PROCESSES)

  const tabLabels = {
    plans: '개발 계획', inputs: '설계 입력', outputs: '설계 출력',
    verifications: '설계 검증', validations: '유효성 확인', changes: '설계 변경', processes: '공정 개발',
  }

  const viewMap = {
    home: <DevHome plans={plans} inputs={inputs} outputs={outputs} verifications={verifications}
                   validations={validations} changes={changes} processes={processes} onNavigate={setView}/>,
    plans: <PlanView plans={plans} setPlans={setPlans}/>,
    inputs: <InputView inputs={inputs} setInputs={setInputs} plans={plans}/>,
    outputs: <OutputView outputs={outputs} setOutputs={setOutputs} plans={plans} inputs={inputs}/>,
    verifications: <VerificationView verifications={verifications} setVerifications={setVerifications} plans={plans}/>,
    validations: <ValidationView validations={validations} setValidations={setValidations} plans={plans}/>,
    changes: <ChangeView changes={changes} setChanges={setChanges} plans={plans}/>,
    processes: <ProcessView processes={processes} setProcesses={setProcesses} plans={plans}/>,
  }

  return (
    <AppLayout user={user} title="개발" subtitle="개발 계획 · 설계 입력·출력 · 검증 · 유효성 확인 · 설계 변경 · 공정 개발">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">
        {view !== 'home' && (
          <button onClick={() => setView('home')}
            className="flex items-center gap-1.5 mb-5 text-[13px]"
            style={{ color: 'var(--moss)' }}>
            <ArrowLeft size={14}/> 개발 홈
          </button>
        )}
        {view !== 'home' && (
          <div className="flex gap-1 flex-wrap mb-5">
            {Object.entries(tabLabels).map(([id, label]) => (
              <button key={id} onClick={() => setView(id)}
                className="text-[12px] px-3 py-1.5 rounded-lg border transition"
                style={{
                  background: view === id ? 'var(--moss)' : 'var(--bg-card)',
                  color: view === id ? 'var(--bg)' : 'var(--ink-mute)',
                  borderColor: view === id ? 'var(--moss)' : 'var(--line)',
                }}>{label}</button>
            ))}
          </div>
        )}
        {viewMap[view] || viewMap.home}
      </div>
    </AppLayout>
  )
}
