import React, { useState, useEffect } from 'react'
import { Printer, FileText, CheckSquare, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

const ACCENT = '#0369A1'
const ACCENT_SOFT = '#F0F9FF'

const SECTIONS = [
  {
    id: 'oem', title: 'OEM 위탁관리',
    docs: [
      { key: 'qualytree.oem_full', label: 'OEM 전공정위탁', sub: '수탁사·계약·협약·감사', lists: ['contractors','contracts','qualityAgreements','audits'] },
      { key: 'qualytree.oem_partial', label: 'OEM 일부공정위탁', sub: '공정·계약·협약·감사', lists: ['processes','contracts','qualityAgreements','audits'] },
    ]
  },
  {
    id: 'gmp', title: 'GMP 심사 준비',
    docs: [
      { key: 'qualytree.gmp_self_inspection', label: 'GMP 자가점검', sub: '점검항목·결과', lists: ['items'] },
      { key: 'qualytree.kgmp_hub', label: 'KGMP 허브', sub: '이물·검사·보고', lists: ['items'] },
    ]
  },
  {
    id: 'quality', title: '품질시스템 기록',
    docs: [
      { key: 'qualytree.risks', label: '위험관리', sub: 'ISO 14971 위험 목록', lists: ['risks'] },
      { key: 'qualytree.audits', label: '내부심사', sub: '심사 일정·결과', lists: ['audits'] },
      { key: 'qualytree.calibrations', label: '교정 관리', sub: '장비·교정 이력', lists: ['items'] },
      { key: 'qualytree.suppliers', label: '공급업체', sub: '공급업체 평가 목록', lists: ['suppliers'] },
      { key: 'qualytree.complaints', label: '고객불만', sub: '불만·처리 이력', lists: ['complaints'] },
      { key: 'qualytree.ncrs', label: '부적합(NCR)', sub: '부적합 기록 목록', lists: ['ncrs'] },
    ]
  },
  {
    id: 'regulatory', title: '인허가 관련',
    docs: [
      { key: 'qualytree.regulatory_products', label: '인허가 품목', sub: '품목별 인허가 현황', lists: ['products'] },
      { key: 'qualytree.foreign_manufacturers', label: '외국제조소', sub: '외국 제조소 등록 목록', lists: ['manufacturers'] },
    ]
  },
]

function loadData(key, lists) {
  try {
    const s = localStorage.getItem(key)
    if (!s) return {}
    const d = JSON.parse(s)
    const counts = {}
    lists.forEach(l => { counts[l] = Array.isArray(d[l]) ? d[l].length : Array.isArray(d) ? d.length : 0 })
    return counts
  } catch { return {} }
}

const PRINT_STYLE = `
@media print {
  body * { visibility: hidden; }
  #print-area, #print-area * { visibility: visible; }
  #print-area { position: fixed; top: 0; left: 0; width: 100%; background: #fff; padding: 20px; }
  .no-print { display: none !important; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
}
`

const Card = ({ title, sub, total, icon: Icon }) => (
  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
    <div style={{ width: 40, height: 40, borderRadius: 10, background: ACCENT_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={18} color={ACCENT} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{title}</div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{sub}</div>
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color: total > 0 ? ACCENT : '#d1d5db' }}>{total}</div>
  </div>
)

const SectionBlock = ({ sec, dataCounts, open, onToggle, onPrint }) => {
  const total = sec.docs.reduce((s, d) => s + (dataCounts[d.key] || 0), 0)
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{sec.title}</div>
          <span style={{ background: total > 0 ? '#dbeafe' : '#f3f4f6', color: total > 0 ? '#1d4ed8' : '#9ca3af', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{total}건</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="no-print" onClick={e => { e.stopPropagation(); onPrint(sec) }} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid '+ACCENT, background: ACCENT_SOFT, color: ACCENT, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Printer size={12} />인쇄
          </button>
          {open ? <ChevronUp size={16} color='#9ca3af' /> : <ChevronDown size={16} color='#9ca3af' />}
        </div>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6', padding: '0 18px 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 12 }}>
            <thead><tr style={{ background: '#f9fafb' }}>
              {['문서명', '설명', '등록 건수'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {sec.docs.map((doc, i) => {
                const cnt = dataCounts[doc.key] || 0
                return (
                  <tr key={doc.key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{doc.label}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{doc.sub}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 700, color: cnt > 0 ? ACCENT : '#d1d5db' }}>{cnt}</span>
                      <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 4 }}>건</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function PrintExportHub() {
  const [dataCounts, setDataCounts] = useState({})
  const [openSecs, setOpenSecs] = useState({})
  const [printTarget, setPrintTarget] = useState(null)
  const [lastPrinted, setLastPrinted] = useState(null)

  useEffect(() => {
    const counts = {}
    SECTIONS.forEach(sec => {
      sec.docs.forEach(doc => {
        const c = loadData(doc.key, doc.lists)
        counts[doc.key] = Object.values(c).reduce((s, v) => s + v, 0)
      })
    })
    setDataCounts(counts)
  }, [])

  const totalRecords = Object.values(dataCounts).reduce((s, v) => s + v, 0)
  const totalDocs = SECTIONS.reduce((s, sec) => s + sec.docs.length, 0)
  const activeDocs = Object.values(dataCounts).filter(v => v > 0).length

  const toggleSec = id => setOpenSecs(o => ({ ...o, [id]: !o[id] }))

  const handlePrint = (sec) => {
    setPrintTarget(sec)
    setTimeout(() => {
      window.print()
      setLastPrinted(sec.title)
      setPrintTarget(null)
    }, 200)
  }

  const handlePrintAll = () => {
    setPrintTarget(null)
    setTimeout(() => {
      window.print()
      setLastPrinted('전체')
    }, 200)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 28px' }}>
      <style>{PRINT_STYLE}</style>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: ACCENT_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Printer size={22} color={ACCENT} strokeWidth={1.7} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>제출용 문서 출력</h1>
            <p style={{ margin: 0, fontSize: 13, color: '