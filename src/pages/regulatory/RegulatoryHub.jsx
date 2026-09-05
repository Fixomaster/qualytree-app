import React, { useState, useEffect } from 'react'
import { Shield, Plus, ChevronDown, ChevronRight, CheckCircle, Circle, AlertCircle, Clock, FileText, ExternalLink, Trash2, Pencil, X, BookOpen, Package } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { useNavigate } from 'react-router-dom'

// ── localStorage helpers ───────────────────────────────────────────────────
const LS_KEY = 'qualytree.regulatory_products'
function load() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] } }
function save(d) { localStorage.setItem(LS_KEY, JSON.stringify(d)) }

// ── 등급별 분류 설정 ───────────────────────────────────────────────────────
const CLASS_CFG = {
  '1': { label: '1등급', color: '#059669', bg: '#D1FAE5', desc: '잠재적 위험성이 거의 없는 제품', reg: '신고' },
  '2': { label: '2등급', color: '#2563EB', bg: '#DBEAFE', desc: '잠재적 위험성이 낮은 제품', reg: '허가/인증' },
  '3': { label: '3등급', color: '#D97706', bg: '#FEF3C7', desc: '중간 정도의 잠재적 위험성', reg: '허가' },
  '4': { label: '4등급', color: '#DC2626', bg: '#FEE2E2', desc: '고도의 잠재적 위험성', reg: '허가' },
}

const STATUS_CFG = {
  preparing:  { label: '준비중',   color: '#6B7280', bg: '#F3F4F6' },
  submitted:  { label: '제출완료', color: '#2563EB', bg: '#DBEAFE' },
  review:     { label: '심사중',   color: '#D97706', bg: '#FEF3C7' },
  approved:   { label: '허가완료', color: '#059669', bg: '#D1FAE5' },
  rejected:   { label: '보완요구', color: '#DC2626', bg: '#FEE2E2' },
  expired:    { label: '만료임박', color: '#7C3AED', bg: '#EDE9FE' },
}

// ── 등급별 표준 체크리스트 ─────────────────────────────────────────────
const DOCS_BY_CLASS = {
  '1': [
    { id: 'app',     label: '신고서 (별지 제1호 서식)' },
    { id: 'spec',    label: '제품 사양서 / 규격서' },
    { id: 'label',   label: '표시기재 사항 (라벨)' },
    { id: 'photo',   label: '제품 사진' },
  ],
  '2': [
    { id: 'app',     label: '의료기기 허가(인증)신청서' },
    { id: 'tech',    label: '기술문서 (기본설계→검증→완료)' },
    { id: 'risk',    label: '위험분석 자료 (ISO 14971)' },
    { id: 'test',    label: '성능시험 성적서' },
    { id: 'bio',     label: '생물학적 안전성 자료 (해당시)' },
    { id: 'label',   label: '표시기재 사항 (라벨)' },
    { id: 'gmp',     label: 'GMP 적합인정서 (국내/수입)' },
    { id: 'qms',     label: '품질관리시스템 문서' },
  ],
  '3': [
    { id: 'app',     label: '의료기기 허가신청서' },
    { id: 'tech',    label: '기술문서 (전체)' },
    { id: 'risk',    label: '위험분석 자료 (ISO 14971)' },
    { id: 'clinical',label: '임상시험 자료 (해당시)' },
    { id: 'test',    label: '성능·전기안전·EMC 시험성적서' },
    { id: 'bio',     label: '생물학적 안전성 자료' },
    { id: 'label',   label: '표시기재 사항 (라벨·IFU)' },
    { id: 'gmp',     label: 'GMP 적합인정서' },
    { id: 'qms',     label: '품질관리시스템 문서' },
    { id: 'equiv',   label: '동등성 비교 자료 (해당시)' },
  ],
  '4': [
    { id: 'app',     label: '의료기기 허가신청서' },
    { id: 'tech',    label: '기술문서 (전체, 상세)' },
    { id: 'risk',    label: '위험분석 자료 (ISO 14971 전체)' },
    { id: 'clinical',label: '임상시험 자료 (필수)' },
    { id: 'test',    label: '성능·전기안전·EMC 시험성적서' },
    { id: 'bio',     label: '생물학적 안전성 자료 (전항목)' },
    { id: 'label',   label: '표시기재 사항 (라벨·IFU·경고)' },
    { id: 'gmp',     label: 'GMP 적합인정서' },
    { id: 'qms',     label: '품질관리시스템 문서' },
    { id: 'pms',     label: '판매후 안전관리 계획' },
    { id: 'steril',  label: '멸균 유효성 확인 자료 (해당시)' },
  ],
}

// ── 등급별 표준 처리기간 ───────────────────────────────────────────────────
const TIMELINE_BY_CLASS = {
  '1': [
    { step: '서류 준비',   days: 14, tip: '규격서·라벨 확정' },
    { step: '신고 접수',   days: 1,  tip: '식약처 민원포털 온라인 제출' },
    { step: '신고증 수령', days: 7,  tip: '처리기간 7일 이내' },
  ],
  '2': [
    { step: '기술문서 작성',  days: 30, tip: 'ISO 13485 기반 QMS 연동' },
    { step: '시험 의뢰',      days: 45, tip: '식약처 지정 시험기관' },
    { step: '신청서 제출',    days: 3,  tip: '전자민원 시스템' },
    { step: '심사 (인증)',    days: 60, tip: '인증기관 60일 이내' },
    { step: '인증서 수령',   days: 5,  tip: '발급 후 실제 판매 가능' },
  ],
  '3': [
    { step: '기술문서 작성',  days: 60,  tip: 'DHF 포함 전 자료 준비' },
    { step: '시험 의뢰',      days: 90,  tip: '전기안전·EMC·성능 전체' },
    { step: '신청서 제출',    days: 3,   tip: '전자민원 시스템' },
    { step: '식약처 심사',    days: 180, tip: '허가심사 180일 (보완시 추가)' },
    { step: '허가증 수령',   days: 5,   tip: '허가 후 GMP 조사 가능' },
  ],
  '4': [
    { step: '기술문서 작성',  days: 90,  tip: 'DHF·임상·위험분석 전체' },
    { step: '임상시험',       days: 365, tip: '임상계획 승인 후 수행' },
    { step: '시험 의뢰',      days: 120, tip: '전 항목 시험성적서' },
    { step: '신청서 제출',    days: 3,   tip: '전자민원 시스템' },
    { step: '식약처 심사',    days: 270, tip: '허가심사 270일 (보완시 추가)' },
    { step: '허가증 수령',   days: 5,   tip: '허가 후 GMP 조사 및 추적관리' },
  ],
}

// ── 규제 참조 링크 ─────────────────────────────────────────────────────────
const REG_LINKS = [
  { label: '식약처 의료기기 전자민원', url: 'https://emed.mfds.go.kr' },
  { label: '의료기기 정보포털', url: 'https://emedi.mfds.go.kr' },
  { label: '의료기기법 (국가법령정보)', url: 'https://www.law.go.kr' },
  { label: '의료기기 허가·신고·심사 등에 관한 규정', url: 'https://www.law.go.kr' },
  { label: 'GMP 실시상황 평가표', url: 'https://www.mfds.go.kr' },
]

function newProduct() {
  return {
    id: Date.now(),
    name: '',
    modelNo: '',
    classNo: '2',
    status: 'preparing',
    submittedAt: '',
    approvedAt: '',
    expiresAt: '',
    licenseNo: '',
    hsCode: '',
    originCountry: '',
    docs: {},
    notes: '',
    expandDocs: false,
    expandTimeline: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ── main component ─────────────────────────────────────────────────────────
export default function RegulatoryHub() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState(load)
  const [showGuide, setShowGuide] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(null)
  const [filterClass, setFilterClass] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    const u = auth.current ? auth.current() : auth.getUser?.() || null
    setUser(u)
  }, [])

  function persist(list) { setProducts(list); save(list) }

  function startAdd() {
    const p = newProduct()
    setForm(p)
    setEditId('new')
  }

  function startEdit(p) {
    setForm({ ...p })
    setEditId(p.id)
  }

  function saveForm() {
    if (!form.name.trim()) return
    const now = new Date().toISOString()
    if (editId === 'new') {
      persist([...products, { ...form, updatedAt: now }])
    } else {
      persist(products.map(p => p.id === editId ? { ...form, updatedAt: now } : p))
    }
    setForm(null); setEditId(null)
  }

  function deleteProduct(id) {
    if (!window.confirm('삭제하시겠습니까?')) return
    persist(products.filter(p => p.id !== id))
  }

  function toggleDoc(productId, docId) {
    persist(products.map(p => {
      if (p.id !== productId) return p
      const docs = { ...p.docs, [docId]: !p.docs[docId] }
      return { ...p, docs, updatedAt: new Date().toISOString() }
    }))
  }

  function toggleExpand(id, field) {
    persist(products.map(p => p.id === id ? { ...p, [field]: !p[field] } : p))
  }

  // ── derived data ──────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    if (filterClass !== 'all' && p.classNo !== filterClass) return false
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    return true
  })

  const stats = {
    total: products.length,
    approved: products.filter(p => p.status === 'approved').length,
    review: products.filter(p => p.status === 'review' || p.status === 'submitted').length,
    preparing: products.filter(p => p.status === 'preparing').length,
  }

  // ── form modal ─────────────────────────────────────────────────────────────
  function FormModal() {
    if (!form) return null
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 14, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{editId === 'new' ? '신규 품목 추가' : '품목 수정'}</h3>
            <button onClick={() => { setForm(null); setEditId(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
          </div>
          {[
            { key: 'name',          label: '제품명 *',          type: 'text', ph: '예: ABC 혈당측정기' },
            { key: 'modelNo',       label: '모델명/규격',        type: 'text', ph: '예: Model-X100' },
            { key: 'licenseNo',     label: '허가(인증)번호',     type: 'text', ph: '발급 후 입력' },
            { key: 'hsCode',        label: 'HS 코드',            type: 'text', ph: '예: 9018.19' },
            { key: 'originCountry', label: '원산지',             type: 'text', ph: '예: Germany' },
            { key: 'submittedAt',   label: '제출일',             type: 'date', ph: '' },
            { key: 'approvedAt',    label: '허가일',             type: 'date', ph: '' },
            { key: 'expiresAt',     label: '만료일',             type: 'date', ph: '' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}</label>
              <input
                type={f.type}
                value={form[f.key] || ''}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.ph}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>등급 *</label>
              <select value={form.classNo} onChange={e => setForm(p => ({ ...p, classNo: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13 }}>
                {Object.entries(CLASS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label} ({v.reg})</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>진행 상태 *</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13 }}>
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>메모</label>
            <textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={3} placeholder="심사 이력, 보완 내용 등"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveForm} style={{ flex: 1, padding: '10px 0', background: '#2563EB', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>저장</button>
            <button onClick={() => { setForm(null); setEditId(null) }} style={{ padding: '10px 20px', background: 'white', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>취소</button>
          </div>
        </div>
      </div>
    )
  }

  // ── guide panel ────────────────────────────────────────────────────────────
  function GuidePanel() {
    const [selClass, setSelClass] = useState('2')
    const docs = DOCS_BY_CLASS[selClass]
    const tl = TIMELINE_BY_CLASS[selClass]
    const cfg = CLASS_CFG[selClass]
    const totalDays = tl.reduce((s, t) => s + t.days, 0)
    return (
      <div style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} color="#2563EB" />
            인허가 가이드
          </div>
          <button onClick={() => setShowGuide(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 13 }}>닫기</button>
        </div>
        {/* 등급 탭 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {Object.entries(CLASS_CFG).map(([k, v]) => (
            <button key={k} onClick={() => setSelClass(k)}
              style={{ padding: '6px 16px', borderRadius: 20, border: selClass === k ? 'none' : '1px solid #D1D5DB',
                background: selClass === k ? v.color : 'white', color: selClass === k ? 'white' : '#374151',
                fontWeight: selClass === k ? 700 : 400, fontSize: 13, cursor: 'pointer' }}>
              {v.label}
            </button>
          ))}
        </div>
        <div style={{ background: cfg.bg, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: cfg.color, fontWeight: 600 }}>
          {cfg.desc} — 규제 구분: <strong>{cfg.reg}</strong> &nbsp;|&nbsp; 예상 소요: <strong>약 {Math.round(totalDays/30)}개월</strong>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {/* 필요서류 */}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#374151' }}>필요 서류</div>
            {docs.map((d, i) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < docs.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <Circle size={14} color="#9CA3AF" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#374151' }}>{d.label}</span>
              </div>
            ))}
          </div>
          {/* 타임라인 */}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#374151' }}>표준 일정</div>
            {tl.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563EB', marginTop: 3, flexShrink: 0 }} />
                  {i < tl.length - 1 && <div style={{ width: 1, flex: 1, background: '#BFDBFE', marginTop: 2 }} />}
                </div>
                <div style={{ paddingBottom: i < tl.length - 1 ? 8 : 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{t.step}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{t.days >= 30 ? `약 ${Math.round(t.days/30)}개월` : `${t.days}일`} · {t.tip}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* 규제 링크 */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #E5E7EB' }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>참조 링크</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {REG_LINKS.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#2563EB', textDecoration: 'none',
                  padding: '4px 10px', border: '1px solid #BFDBFE', borderRadius: 6, background: '#EFF6FF' }}>
                <ExternalLink size={10} /> {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── product card ───────────────────────────────────────────────────────────
  // ── product card ───────────────────────────────────────────────────────────
  function ProductCard({ p }) {
    const cls = CLASS_CFG[p.classNo] || CLASS_CFG['2']
    const st = STATUS_CFG[p.status] || STATUS_CFG.preparing
    const docs = DOCS_BY_CLASS[p.classNo] || []
    const checkedCount = docs.filter(d => p.docs[d.id]).length
    const docPct = docs.length ? Math.round((checkedCount / docs.length) * 100) : 0
    const isExpanded = expandedId === p.id

    return (
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
        {/* card header */}
        <div style={{ padding: '14px 18px', background: 'white', cursor: 'pointer' }}
          onClick={() => setExpandedId(isExpanded ? null : p.id)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={18} color={cls.color} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.name || '(제품명 없음)'}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                {p.modelNo && <span style={{ marginRight: 10 }}>{p.modelNo}</span>}
                {p.licenseNo && <span style={{ marginRight: 10 }}>허가번호: {p.licenseNo}</span>}
                {p.originCountry && <span>원산지: {p.originCountry}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ padding: '3px 9px', borderRadius: 12, fontSize: 12, fontWeight: 700, color: cls.color, background: cls.bg }}>{cls.label}</span>
              <span style={{ padding: '3px 9px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: st.color, background: st.bg }}>{st.label}</span>
              {isExpanded ? <ChevronDown size={16} color="#9CA3AF" /> : <ChevronRight size={16} color="#9CA3AF" />}
            </div>
          </div>
          {/* doc progress mini bar */}
          {docs.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${docPct}%`, background: docPct === 100 ? '#10B981' : '#2563EB', borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 11, color: '#6B7280', flexShrink: 0 }}>서류 {checkedCount}/{docs.length}</span>
            </div>
          )}
        </div>

        {/* expanded section */}
        {isExpanded && (
          <div style={{ borderTop: '1px solid #F3F4F6', background: '#FAFAFA', padding: '16px 18px' }}>
            {/* dates row */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                { label: '제출일', val: p.submittedAt },
                { label: '허가일', val: p.approvedAt },
                { label: '만료일', val: p.expiresAt },
                { label: 'HS 코드', val: p.hsCode },
              ].map(item => item.val ? (
                <div key={item.label}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{item.val}</div>
                </div>
              ) : null)}
            </div>

            {/* doc checklist */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 8 }}
                onClick={() => toggleExpand(p.id, 'expandDocs')}>
                {p.expandDocs ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span style={{ fontSize: 13, fontWeight: 700 }}>서류 체크리스트 ({checkedCount}/{docs.length})</span>
              </div>
              {p.expandDocs && (
                <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px' }}>
                  {docs.map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                      borderBottom: docs.indexOf(d) < docs.length - 1 ? '1px solid #F9FAFB' : 'none', cursor: 'pointer' }}
                      onClick={() => toggleDoc(p.id, d.id)}>
                      {p.docs[d.id]
                        ? <CheckCircle size={16} color="#10B981" style={{ flexShrink: 0 }} />
                        : <Circle size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />}
                      <span style={{ fontSize: 13, color: p.docs[d.id] ? '#374151' : '#6B7280',
                        textDecoration: p.docs[d.id] ? 'none' : 'none' }}>{d.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* timeline */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 8 }}
                onClick={() => toggleExpand(p.id, 'expandTimeline')}>
                {p.expandTimeline ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span style={{ fontSize: 13, fontWeight: 700 }}>표준 진행 일정</span>
              </div>
              {p.expandTimeline && (
                <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: '12px 14px' }}>
                  {TIMELINE_BY_CLASS[p.classNo]?.map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB', marginTop: 4, flexShrink: 0 }} />
                        {i < (TIMELINE_BY_CLASS[p.classNo]?.length - 1) && <div style={{ width: 1, flex: 1, background: '#BFDBFE', marginTop: 2 }} />}
                      </div>
                      <div style={{ paddingBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{t.step}</span>
                        <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 8 }}>{t.days >= 30 ? `~${Math.round(t.days/30)}개월` : `${t.days}일`}</span>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>{t.tip}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* notes */}
            {p.notes && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#92400E' }}>
                {p.notes}
              </div>
            )}

            {/* actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => startEdit(p)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer', fontSize: 13 }}>
                <Pencil size={13} /> 수정
              </button>
              <button onClick={() => navigate('/import-clearance')}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', cursor: 'pointer', fontSize: 13 }}>
                <ExternalLink size={13} /> 수입통관 연계
              </button>
              <button onClick={() => navigate('/foreign-manufacturer')}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', cursor: 'pointer', fontSize: 13 }}>
                <ExternalLink size={13} /> 제조소 연계
              </button>
              <button onClick={() => deleteProduct(p.id)}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', fontSize: 13 }}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Shield size={28} color="#2563EB" />
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>품목 인허가 관리</h1>
              <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>의료기기 등급별 허가·인증·신고 현황 관리 | 식약처 MFDS 기준</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowGuide(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              <BookOpen size={14} /> 인허가 가이드
            </button>
            <button onClick={startAdd}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              <Plus size={16} /> 품목 추가
            </button>
          </div>
        </div>

        {/* Guide panel */}
        {showGuide && <GuidePanel />}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { label: '전체 품목', val: stats.total, color: '#374151' },
            { label: 'm��가 완료', val: stats.approved, color: '#059669' },
            { label: '심사/제출', val: stats.review,   color: '#2563EB' },
            { label: '준비중',    val: stats.preparing, color: '#D97706' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <div>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13 }}>
              <option value="all">전체 등급</option>
              {Object.entries(CLASS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13 }}>
              <option value="all">전체 상태</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <span style={{ fontSize: 13, color: '#9CA3AF', alignSelf: 'center' }}>{filtered.length}개 품목</span>
        </div>

        {/* Product list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
            <Shield size={40} color="#E5E7EB" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>등록된 품목이 없습니다</div>
            <div style={{ fontSize: 13, marginBottom: 20 }}>품목 추가 버튼을 눌러 인허가 관리를 시작하세요</div>
            <button onClick={startAdd} style={{ padding: '9px 20px', background: '#2563EB', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              첫 품목 추가하기
            </button>
          </div>
        ) : (
          filtered.map(p => <ProductCard key={p.id} p={p} />)
        )}

      </div>
      <FormModal />
    </AppLayout>
  )
}
