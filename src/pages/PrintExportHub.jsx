import React, { useState } from 'react'
import AppLayout from '../components/AppLayout'
import { auth } from '../lib/auth'
import { Printer, FileText, Download, ChevronDown, ChevronUp } from 'lucide-react'

const ACCENT = '#0369A1'
const ACCENT_SOFT = '#F0F9FF'

const SECTIONS = [
  {
    id: 'oem',
    title: 'OEM 위탁관리',
    desc: 'OEM 전공정·일부공정 위탁 현황',
    keys: ['qualytree.oem_full', 'qualytree.oem_partial'],
    labels: ['OEM 전공정위탁', 'OEM 일부공정위탁'],
  },
  {
    id: 'gmp',
    title: 'GMP 심사 준비',
    desc: 'GMP 자가점검, KGMP 허브',
    keys: ['qualytree.gmp_self_inspection', 'qualytree.kgmp_hub'],
    labels: ['GMP 자가점검', 'KGMP 허브'],
  },
  {
    id: 'qms',
    title: '품질시스템 기록',
    desc: '위험관리, 감사, 교정, 공급업체, 고객불만, NCR',
    keys: ['qualytree.risks', 'qualytree.audits', 'qualytree.calibrations', 'qualytree.suppliers', 'qualytree.complaints', 'qualytree.ncrs'],
    labels: ['위험관리', '감사', '교정', '공급업체', '고객불만', 'NCR'],
  },
  {
    id: 'reg',
    title: '인허가 관련',
    desc: '인허가 제품, 외국제조소',
    keys: ['qualytree.regulatory_products', 'qualytree.foreign_manufacturers'],
    labels: ['인허가 제품', '외국제조소'],
  },
]

function getSummary(keys) {
  let total = 0
  const detail = []
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) { detail.push(0); continue }
      const parsed = JSON.parse(raw)
      const arr = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? Object.values(parsed).flat().filter(Array.isArray).flat() : [])
      detail.push(arr.length)
      total += arr.length
    } catch { detail.push(0) }
  }
  return { total, detail }
}

function printSection(sectionId) {
  const el = document.getElementById('print-area-' + sectionId)
  if (!el) return
  const style = document.createElement('style')
  style.id = '_print_style_temp'
  style.textContent = '@media print { body > *:not(#print-root) { display: none !important; } #print-root > *:not(#print-area-' + sectionId + ') { display: none !important; } }'
  document.head.appendChild(style)
  setTimeout(() => { window.print(); setTimeout(() => { const s = document.getElementById('_print_style_temp'); if (s) s.remove() }, 500) }, 200)
}

function printAll() {
  setTimeout(() => window.print(), 200)
}

function SectionBlock({ sec, idx }) {
  const [open, setOpen] = useState(false)
  const { total, detail } = getSummary(sec.keys)

  return <div id={'print-area-' + sec.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer', background: open ? ACCENT_SOFT : '#fff' }} onClick={() => setOpen(o => !o)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <FileText size={18} color={ACCENT} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{sec.title}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{sec.desc}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, color: '#6B7280' }}>총 {total}건</span>
        <button onClick={e => { e.stopPropagation(); printSection(sec.id) }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
          <Printer size={13} /> 인쇄
        </button>
        {open ? <ChevronUp size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}
      </div>
    </div>
    {open && <div style={{ padding: '16px 20px', borderTop: '1px solid #E5E7EB' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '2px solid #E5E7EB' }}>
          <th style={{ padding: '8px 6px', textAlign: 'left', color: '#6B7280', fontWeight: 600 }}>구분</th>
          <th style={{ padding: '8px 6px', textAlign: 'right', color: '#6B7280', fontWeight: 600 }}>건수</th>
        </tr></thead>
        <tbody>{sec.labels.map((label, i) => <tr key={label} style={{ borderBottom: '1px solid #F3F4F6' }}>
          <td style={{ padding: '8px 6px' }}>{label}</td>
          <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, color: ACCENT }}>{detail[i] || 0}건</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </div>
    </AppLayout>
  )
}

export default function PrintExportHub() {
  const user = auth.current()
  return (
    <AppLayout user={user} title="문서 출력">
      <div id="print-root" style={{ padding: '28px 32px', fontFamily: 'inherit' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Printer size={24} color={ACCENT} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>문서 출력</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>제출용 문서를 섹션별 또는 전체 인쇄할 수 있습니다</p>
        </div>
      </div>
      <button onClick={printAll} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>
        <Printer size={16} /> 전체 인쇄
      </button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
      {SECTIONS.map(s => {
        const { total } = getSummary(s.keys)
        return <div key={s.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: ACCENT }}>{total}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{s.title}</div>
        </div>
      })}
    </div>
    {SECTIONS.map((sec, i) => <SectionBlock key={sec.id} sec={sec} idx={i} />)}
  </div>
}
