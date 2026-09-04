import React, { useState, useEffect } from 'react'
import { Printer, FileText, CheckSquare, Square, CheckCircle, AlertCircle } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { auth } from '../lib/auth'

// ── helpers ──────────────────────────────────────────────────────────────────
function getLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

function fmtDate(s) {
  if (!s) return '-'
  try { return new Date(s).toLocaleDateString('ko-KR') } catch { return s }
}

function printHtml(html, title) {
  const w = window.open('', '_blank', 'width=920,height=750')
  if (!w) { alert('팝업 차단을 해제해주세요'); return }
  w.document.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8"><title>${title}</title>
<style>
  body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;padding:28px 36px;color:#111;font-size:13px}
  h1{font-size:18px;border-bottom:2px solid #1d4ed8;padding-bottom:8px;margin-bottom:4px}
  h2{font-size:14px;margin-top:20px;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
  .meta{font-size:12px;color:#6b7280;line-height:1.7;text-align:right}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#eff6ff;padding:7px 9px;border:1px solid #bfdbfe;text-align:left;font-size:12px;font-weight:600}
  td{padding:7px 9px;border:1px solid #e5e7eb;vertical-align:top}
  .badge{display:inline-block;padding:1px 8px;border-radius:12px;font-size:11px;font-weight:600}
  .pass{background:#d1fae5;color:#065f46}.fail{background:#fee2e2;color:#991b1b}
  .partial{background:#fef3c7;color:#92400e}.na{background:#f3f4f6;color:#6b7280}
  .open{background:#dbeafe;color:#1e40af}.closed{background:#d1fae5;color:#065f46}
  .warn{background:#fef3c7;color:#92400e}
  .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;display:flex;justify-content:space-between}
  @media print{button{display:none!important}}
</style>
</head><body>
${html}
<div class="footer"><span>${title}</span><span>Qualytree 출력</span></div>
<script>setTimeout(()=>window.print(),500)</script>
</body></html>`)
  w.document.close()
}

// ── doc generators ─────────────────────────────────────────────────────────────

function genGmpSelfInspection(company) {
  const raw = getLS('qualytree.gmp_self_inspection_v2', null)
  if (!raw || !raw.sessions) return null
  const sessions = raw.sessions.filter(s => s.status === 'final')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  if (!sessions.length) return null
  const s = sessions[0]

  const LABELS = { pass: '적͕�', fail: '부적합', partial: '부분적합', na: '해당없음' }
  const BADGE  = { pass: 'pass', fail: 'fail', partial: 'partial', na: 'na' }

  const rows = Object.entries(s.results || {}).map(([id, r]) => `
    <tr>
      <td style="width:100px">${id}</td>
      <td style="width:90px"><span class="badge ${BADGE[r.status] || 'na'}">${LABELS[r.status] || r.status || '-'}</span></td>
      <td>${(r.memo || '').replace(/</g,'&lt;')}</td>
    </tr>`).join('')

  return `
<div class="header">
  <div>
    <h1>GMP 자가점검 결과서</h1>
    <p style="margin:2px 0;color:#374151">총점: <strong>${s.score ?? '-'}점</strong> &nbsp;|&nbsp; 상태: 최종확정</p>
  </div>
  <div class="meta">
    ${company}<br>
    점검일: ${fmtDate(s.date)}<br>
    점검자: ${(s.inspector || '-').replace(/</g,'&lt;')}<br>
    유형: ${(s.type || '-').replace(/</g,'&lt;')}
  </div>
</div>
<table>
  <thead><tr><th>항목번호</th><th>결과</th><th>메모</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="3" style="color:#9ca3af">결과 없음</td></tr>'}</tbody>
</table>`
}

function genCalibration(company) {
  const data = getLS('qualytree.calibration', [])
  if (!data.length) return null
  const rows = data.map(r => {
    const st = r.status === '정상' ? 'pass' : r.status === '만료' ? 'fail' : 'warn'
    return `<tr>
      <td>$x(r.name||'-').replace(/</g,'&lt;')}</td>
      <td>${(r.id||r.assetId||'-')}</td>
      <td>${(r.location||'-')}</td>
      <td>${fmtDate(r.calibrationDate||r.lastDate)}</td>
      <td>${fmtDate(r.nextDate||r.nextCalibrationDate)}</td>
      <td><span class="badge ${st}">${r.status||'-'}</span></td>
    </tr>`
  }).join('')
  return `
<div class="header">
  <div><h1>교정 장비 현황표</h1></div>
  <div class="meta">${company}<br>출력일: ${fmtDate(new Date().toISOString())}</div>
</div>
<table>
  <thead><tr><th>장비명</th><th>관리번호</th><th>위치</th><th>최근교정일</th><th>다음교정일</th><th>상태</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`
}

function genCapa(company) {
  const data = getLS('qualytree.capa', [])
  if (!data.length) return null
  const rows = data.map(r => {
    const st = (r.status === '완료' || r.status === 'closed') ? 'closed' : 'open'
    return `<tr>
      <td style="white-space:nowrap">${fmtDate(r.createdAt||r.date)}</td>
      <td>${((r.title||r.description||'-')).slice(0,60).replace(/</g,'&lt;')}</td>
      <td>${(r.category||r.type||'-')}</td>
      <td>$x(r.assignee||'-')}</td>
      <td style="white-space:nowrap">${fmtDate(r.dueDate)}</td>
      <td><span class="badge ${st}">${r.status||'-'}</span></td>
    </tr>`
  }).join('')
  return `
<div class="header">
  <div><h1>CAPA 현황 보고서</h1></div>
  <div class="meta">${company}<br>출력일: ${fmtDate(new Date().toISOString())}</div>
</div>
<table>
  <thead><tr><th>등록일</th><th>내용</th><th>유형</th><th>담당자</th><th>목표일</th><th>상태</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`
}

function genCompetency(company) {
  const data = getLS('qualytree.competency_records', [])
  if (!data.length) return null
  const rows = data.map(r => `<tr>
    <td>${(r.name||'-').replace(/</g,'&lt;')}</td>
    <td>${(r.department||r.dept||'-')}</td>
    <td>${(r.position||r.role||'-')}</td>
    <td style="text-align:center">${Array.isArray(r.education)?r.education.length:'-'}건</td>
    <td style="white-space:nowrap">${fmtDate(r.updatedAt||r.lastUpdated)}</td>
  </tr>`).join('')
  return `
<div class="header">
  <div><h1>역량 관리 현황</h1></div>
  <div class="meta">${company}<br>출력일: ${fmtDate(new Date().toISOString())}</div>
</div>
<table>
  <thead><tr><th>성명</th><th>부서</th><th>직위</th><th>교육이수</th><th>최종수정일</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`
}

function genSuppliers(company) {
  const data = getLS('qualytree.suppliers', [])
  if (!data.length) return null
  const rows = data.map(r => {
    const gBadge = r.grade==='A'?'pass':r.grade==='C'||r.grade==='D'?'fail':'partial'
    const sBadge = r.status==='승인'||r.status==='approved'?'pass':r.status==='정지'?'fail':'warn'
    return `<tr>
      <td>$x(r.name||'-').replace(/</g,'&lt;')}</td>
      <td>${(r.category||r.type||'-')}</td>
      <td>${(r.country||'-')}</td>
      <td style="white-space:nowrap">${fmtDate(r.lastEvalDate||r.evaluationDate)}</td>
      <td><span class="badge ${gBadge}">${r.grade||'-'}</span></td>
      <td><span class="badge ${sBadge}">${r.status||'-'}</span></td>
    </tr>`
  }).join('')
  return `
<div class="header">
  <div><h1>공급업체 평가 현황</h1></div>
  <div class="meta">${company}<br>출력일: ${fmtDate(new Date().toISOString())}</div>
</div>
<table>
  <thead><tr><th>업체명</th><th>품목유형</th><th>국가</th><th>최근평가일</th><th>등급</th><th>상태</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`
}

function genNcr(company) {
  const data = getLS('qualytree.ncr', [])
  if (!data.length) return null
  const rows = data.map(r => {
    const st = (r.status==='완료'||r.status==='closed'||r.status==='처리완료') ? 'closed' : 'open'
    return `<tr>
      <td>${(r.ncrNo||r.id||'-')}</td>
      <td style="white-space:nowrap">${fmtDate(r.discoveredAt||r.date||r.createdAt)}</td>
      <td>${((r.description||r.title||r.content||'-')).slice(0,60).replace(/</g,'&lt;')}</td>
      <td>$x(r.category||r.type||'-')}</td>
      <td>${(r.assignee||'-')}</td>
      <td><span class="badge ${st}">${r.status||'-'}</span></td>
    </tr>`
  }).join('')
  return `
<div class="header">
  <div><h1>부적합(NCR) 현황</h1></div>
  <div class="meta">${company}<br>출력일: ${fmtDate(new Date().toISOString())}</div>
</div>
<table>
  <thead><tr><th>NCR번호</th><th>발생일</th><th>내용</th><th>유형</th><th>담당자</th><th>상태</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`
}

// ── doc registry ───────────────────────────────────────────────────────────────
const DOC_TYPES = [
  {
    id: 'gmp_self', category: 'GMP 심사',
    title: 'GMP 자가점검 결과서',
    desc: '최근 확정된 자가점검 결과',
    lsKey: 'qualytree.gmp_self_inspection_v2',
    gen: genGmpSelfInspection,
  },
  {
    id: 'calibration', category: '설비·교정',
    title: '교정 장비 현황표',
    desc: '전체 교정 장비 목록 및 상태',
    lsKey: 'qualytree.calibration',
    gen: genCalibration,
  },
  {
    id: 'capa', category: '품질 개선',
    title: 'CAPA 현황 보고서',
    desc: '시정·예방 조치 전체 목록',
    lsKey: 'qualytree.capa',
    gen: genCapa,
  },
  {
    id: 'competency', category: '인적자원',
    title: '역량 관리 현황',
    desc: '인원별 교육이수 및 역량 기록',
    lsKey: 'qualytree.competency_records',
    gen: genCompetency,
  },
  {
    id: 'suppliers', category: '공급업체',
    title: '공급업체 평가 현황',
    desc: '공급업체 등급 및 승인 상태',
    lsKey: 'qualytree.suppliers',
    gen: genSuppliers,
  },
  {
    id: 'ncr', category: '부적합',
    title: '부적합(NCR) 현황',
    desc: 'NCR 부적합 처리 전체 목록',
    lsKey: 'qualytree.ncr',
    gen: gelNcr,
  },
]

// ── main component ─────────────────────────────────────────────────────────────
export default function PrintExportHub() {
  const [user, setUser]           = useState(null)
  const [selected, setSelected]   = useState({})
  const [printing, setPrinting]   = useState(false)
  const [printStatus, setPrintStatus] = useState({}) // id -> 'done'|'skip'
  const [docCounts, setDocCounts] = useState({})

  useEffect(() => {
    const u = auth.current ? auth.current() : auth.getUser?.() || null
    setUser(u)
    const counts = {}
    DOC_TYPES.forEach(d => {
      try {
        const raw = JSON.parse(localStorage.getItem(d.lsKey))
        if (d.id === 'gmp_self') {
          counts[d.id] = (raw?.sessions?.filter(s => s.status === 'final').length) || 0
        } else {
          counts[d.id] = Array.isArray(raw) ? raw.length : 0
        }
      } catch { counts[d.id] = 0 }
    })
    setDocCounts(counts)
  }, [])

  const companyLine = user?.user_metadata?.company || user?.email || '회사명'

  function toggleSelect(id) {
    setSelected(s => ({ ...s, [id]: !s[id] }))
  }

  function toggleAll() {
    const hasAny = Object.values(selected).some(Boolean)
    if (hasAny) {
      setSelected({})
    } else {
      const all = {}
      DOC_TYPES.forEach(d => { if ((docCounts[d.id] || 0) > 0) all[d.id] = true })
      setSelected(all)
    }
  }

  function printOne(doc) {
    const html = doc.gen(companyLine)
    if (!html) { alert('출력할 데이터가 없습니다'); return }
    printHtml(html, doc.title)
  }

  async function printBatch() {
    const toPrint = DOC_TYPES.filter(d => selected[d.id])
    if (!toPrint.length) { alert('출력할 문서를 선택하세요'); return }
    setPrinting(true)
    setPrintStatus({})
    for (const doc of toPrint) {
      const html = doc.gen(companyLine)
      if (!html) {
        setPrintStatus(s => ({ ...s, [doc.id]: 'skip' }))
      } else {
        printHtml(html, doc.title)
        setPrintStatus(s => ({ ...s, [doc.id]: 'done' }))
        await new Promise(r => setTimeout(r, 1400))
      }
    }
    setPrinting(false)
  }

  const categories = [...new Set(DOC_TYPES.map(d => d.category))]
  const selectedCount = Object.values(selected).filter(Boolean).length

  const btn = (label, onClick, disabled, primary) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 16px', borderRadius: 7, border: primary ? 'none' : '1px solid #d1d5db',
        background: disabled ? '#e5e7eb' : primary ? '#2563eb' : 'white',
        color: disabled ? '#9ca3af' : primary ? 'white' : '#374151',
        cursor: disabled ? 'default' : 'pointer',
        fontWeight: 600, fontSize: 13,
        display: 'flex', alignItems: 'center', gap: 5
      }}
    >{label}</button>
  )

  return (
    <AppLayout>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Printer size={28} color="#2563eb" />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>문서 출력 센터</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>제출용 문서를 항목별로 선택해 PDF로 출력합니다</p>
          </div>
        </div>

        {/* Batch bar */}
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
          padding: '14px 16px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
        }}>
          {btn(Object.values(selected).some(Boolean) ? '전체 해제' : '전체 선택', toggleAll, false, false)}
          <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>
            {selectedCount > 0 ? `${selectedCount}개 문서 선택됨` : '출력할 문서를 선택하세요'}
          </span>
          {btn(
            <><Printer size={14} />{printing ? '출력 중...' : `${selectedCount}개 일괄 출력`}</>,
            printBatch, printing || selectedCount === 0, true
          )}
        </div>

        {/* Doc list by category */}
        {categories.map(cat => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{cat}</div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              {DOC_TYPES.filter(d => d.category === cat).map((doc, i, arr) => {
                const count = docCounts[doc.id] || 0
                const isSelected = !!selected[doc.id]
                const status = printStatus[doc.id]
                const hasData = count > 0
                return (
                  <div
                    key={doc.id}
                    onClick={() => hasData && toggleSelect(doc.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                      background: isSelected ? '#eff6ff' : 'white',
                      borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none',
                      cursor: hasData ? 'pointer' : 'default',
                      transition: 'background 0.15s'
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{ color: hasData ? (isSelected ? '#2563eb' : '#9ca3af') : '#e5e7eb', flexShrink: 0 }}>
                      {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                    </div>

                    {/* Icon */}
                    <FileText size={16} color={hasData ? '#374151' : '#d1d5db'} style={{ flexShrink: 0 }} />

                    {/* Title + desc */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: hasData ? '#111827' : '#9ca3af' }}>{doc.title}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
                        {doc.desc} &nbsp;·&nbsp;
                        {hasData ? <span style={{ color: '#2563eb', fontWeight: 600 }}>{count}건</span> : <span>데이터 없음</span>}
                      </div>
                    </div>

                    {/* Status icon */}
                    {status === 'done' && <CheckCircle size={18} color="#10b981" />}
                    {status === 'skip' && <AlertCircle size={18} color="#f59e0b" title="데이터 없음" />}

                    {/* Single print btn */}
                    {hasData && !status && (
                      <button
                        onClick={e => { e.stopPropagation(); printOne(doc) }}
                        style={{
                          padding: '5px 12px', borderRadius: 6, border: '1px solid #d1d5db',
                          background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0
                        }}
                      >
                        <Printer size={12} /> 출력
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Footer note */}
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8, lineHeight: 1.6 }}>
          * 팝업 차단이 해제되어 있어야 합니다.&nbsp; 출력 대화상자에서 <strong>PDF로 저장</strong>을 선택하세요.
          <br />* 일괄 출력 시 문서 간 1.4초 간격으로 순차 인쇄창이 열립니다.
        </p>
      </div>
    </AppLayout>
  )
}
