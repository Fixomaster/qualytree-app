import React, { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import { auth } from '../lib/auth'
import { Building2, Save, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react'

const ACCENT = '#0F766E'
const LS_KEY = 'qualytree.company_master'

const FIELDS = [
  { section: '기본 정보', items: [
    { key: 'companyName', label: '회사명 (상호)', placeholder: '예: (주)퀄리트리', required: true },
    { key: 'companyNameEn', label: '영문 회사명', placeholder: 'Qualytree Co., Ltd.' },
    { key: 'bizNumber', label: '사업자등록번호', placeholder: '000-00-00000', required: true },
    { key: 'ceoName', label: '대표자', placeholder: '홍길동', required: true },
    { key: 'foundedDate', label: '설립일', type: 'date' },
    { key: 'companyType', label: '법인 유형', type: 'select', options: ['주식회사', '유한회사', '개인사업자', '기타'] },
  ]},
  { section: '주소 및 연락처', items: [
    { key: 'address', label: '본사 주소', placeholder: '서울특별시 강남구 ...' },
    { key: 'addressEn', label: '영문 주소', placeholder: 'Seoul, Korea' },
    { key: 'phone', label: '대표 전화', placeholder: '02-0000-0000' },
    { key: 'fax', label: '팩스', placeholder: '02-0000-0001' },
    { key: 'email', label: '대표 이메일', placeholder: 'info@company.com' },
    { key: 'website', label: '홈페이지', placeholder: 'https://www.company.com' },
  ]},
  { section: '의료기기 인허가 정보', items: [
    { key: 'mdLicenseNumber', label: '의료기기 제조업 허가번호', placeholder: '제0000호' },
    { key: 'mdLicenseDate', label: '허가일', type: 'date' },
    { key: 'gmpCertNumber', label: 'GMP 인증번호', placeholder: 'GMP-0000-000' },
    { key: 'gmpExpiry', label: 'GMP 인증 만료일', type: 'date' },
    { key: 'iso13485Number', label: 'ISO 13485 인증번호', placeholder: 'ISO13485-0000' },
    { key: 'iso13485Expiry', label: 'ISO 13485 만료일', type: 'date' },
    { key: 'certBody', label: '인증기관', placeholder: '예: KTR, TUV' },
  ]},
  { section: '품질 조직', items: [
    { key: 'qmgr', label: '품질관리자', placeholder: '홍길동' },
    { key: 'qmgrPhone', label: '품질관리자 연락처', placeholder: '010-0000-0000' },
    { key: 'raManager', label: '인허가 담당자', placeholder: '김철수' },
    { key: 'productScope', label: '제품 범위 (품목류)', placeholder: '예: 체외진단의료기기, 의료용품' },
    { key: 'employeeCount', label: '전체 임직원 수', placeholder: '50' },
  ]},
]

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch { return {} }
}
function save(d) { localStorage.setItem(LS_KEY, JSON.stringify(d)) }

function Input({ field, value, onChange }) {
  const base = { width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  if (field.type === 'select') return (
    <select value={value||''} onChange={e => onChange(e.target.value)} style={base}>
      <option value="">선택</option>
      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
  if (field.type === 'date') return (
    <input type="date" value={value||''} onChange={e => onChange(e.target.value)} style={base} />
  )
  return (
    <input type="text" value={value||''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder||''} style={base} />
  )
}

export default function CompanyMasterHub() {
  const user = auth.current()
  const [form, setForm] = useState(() => load())
  const [saved, setSaved] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)

  useEffect(() => {
    const d = load()
    setForm(d)
    const ts = localStorage.getItem(LS_KEY + '_ts')
    if (ts) setLastSaved(new Date(Number(ts)).toLocaleString('ko-KR'))
  }, [])

  function handleChange(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  function handleSave() {
    save(form)
    localStorage.setItem(LS_KEY + '_ts', Date.now().toString())
    setSaved(true)
    setLastSaved(new Date().toLocaleString('ko-KR'))
    setTimeout(() => setSaved(false), 3000)
  }

  function handleReset() {
    if (!confirm('모든 입력값을 초기화하시겠습니까?')) return
    setForm({})
    localStorage.removeItem(LS_KEY)
    localStorage.removeItem(LS_KEY + '_ts')
    setLastSaved(null)
    setSaved(false)
  }

  const requiredFields = FIELDS.flatMap(s => s.items).filter(f => f.required)
  const filledRequired = requiredFields.filter(f => form[f.key] && form[f.key].trim())
  const completionPct = requiredFields.length ? Math.round(filledRequired.length / requiredFields.length * 100) : 100

  return (
    <AppLayout user={user} title="회사 마스터">
      <div style={{ padding: '28px 32px', fontFamily: 'inherit', maxWidth: 860 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Building2 size={24} color={ACCENT} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>회사 마스터 데이터</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>회사 기본정보 — 문서 출력 및 허브 전반에 자동 반영됩니다</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {lastSaved && <span style={{ fontSize: 12, color: '#9CA3AF' }}>마지막 저장: {lastSaved}</span>}
        <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#6B7280' }}>
          <RotateCcw size={14} /> 초기화
        </button>
        <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 18px', background: saved ? '#16A34A' : ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 700, transition: 'background 0.2s' }}>
          {saved ? <><CheckCircle size={14} /> 저장됨</> : <><Save size={14} /> 저장</>}
        </button>
      </div>
    </div>

    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>필수 항목 완성도</span>
          <span style={{ fontSize: 13, color: '#166534', fontWeight: 700 }}>{filledRequired.length}/{requiredFields.length} ({completionPct}%)</span>
        </div>
        <div style={{ background: '#D1FAE5', borderRadius: 99, height: 8, overflow: 'hidden' }}>
          <div style={{ width: completionPct + '%', background: ACCENT, height: '100%', borderRadius: 99, transition: 'width 0.3s' }} />
        </div>
      </div>
    </div>

    {FIELDS.map(section => <div key={section.section} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid #F3F4F6' }}>{section.section}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {section.items.map(field => <div key={field.key}>
          <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 5, fontWeight: 600 }}>
            {field.label}{field.required && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
          </label>
          <Input field={field} value={form[field.key] || ''} onChange={val => handleChange(field.key, val)} />
        </div>)}
      </div>
    </div>)}

    {requiredFields.some(f => !form[f.key]) && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, marginTop: 8 }}>
      <AlertCircle size={16} color="#DC2626" />
      <span style={{ fontSize: 13, color: '#991B1B' }}>
        미입력 필수 항목: {requiredFields.filter(f => !form[f.key]).map(f => f.label).join(', ')}
      </span>
    </div>}
  </div>
    </AppLayout>
  )
}
