import React, { useState, useEffect } from 'react'
import { Printer, FileText, CheckSquare, Square, CheckCircle, AlertCircle } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { auth } from '../lib/auth'

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

function fmtDate(s) {
  if (!s) return '-'
  try { return new Date(s).toLocaleDateString('ko-KR') } catch { return s }
}

function printHtml(html, title) {
  const w = window.open('', '_blank', 'width=920,height=750')
  if (!w) { alert('íŒì—… ì°¨ë‹¨ì„ í•´ì œí•´ì£¼ì„¸ìš”'); return }
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
<div class="footer"><span>${title}</span><span>Qualytree ì¶œë ¥</span></div>
<script>setTimeout(()=>window.print(),500)</script>
</body></html>`)
  w.document.close()
}

// â”€â”€ doc generators â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function genGmpSelfInspection(company) {
  const raw = getLS('qualytree.gmp_self_inspection_v2', null)
  if (!raw || !raw.sessions) return null
  const sessions = raw.sessions.filter(s => s.status === 'final')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  if (!sessions.length) return null
  const s = sessions[0]

  const LABELS = { pass: 'ì Í•©', fail: 'ë¶€ì í•©', partial: 'ë¶€ë¶„ì í•©', na: 'í•´ë‹¹ì—†ìŒ' }
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
    <h1>GMP ìžê°€ì ê²€ ê²°ê³¼ì„œ</h1>
    <p style="margin:2px 0;color:#374151">ì´ì : <strong>${s.score ?? '-'}ì </strong> &nbsp;|&nbsp; ìƒíƒœ: ìµœì¢…í™•ì •</p>
  </div>
  <div class="meta">
    ${company}<br>
    ì ê²€ì¼: ${fmtDate(s.date)}<br>
    ì ê²€ìž: ${(s.inspector || '-').replace(/</g,'&lt;')}<br>
    ìœ í˜•: ${(s.type || '-').replace(/</g,'&lt;')}
  </div>
</div>
<table>
  <thead><tr><th>í•­ëª©ë²ˆí˜¸</th><th>ê²°ê³¼</th><th>ë©”ëª¨</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="3" style="color:#9ca3af">ê²°ê³¼ ì—†ìŒ</td></tr>'}</tbody>
</table>`
}

function genCalibration(company) {
  const data = getLS('qualytree.calibration', [])
  if (!data.length) return null
  const rows = data.map(r => {
    const st = r.status === 'ì •ìƒ' ? 'pass' : r.status === 'ë§Œë£Œ' ? 'fail' : 'warn'
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
  <div><h1>êµì • ìž¥ë¹„ í˜„í™©í‘œ</h1></div>
  <div class="meta">${company}<br>ì¶œë ¥ì¼: ${fmtDate(new Date().toISOString())}</div>
</div>
<table>
  <thead><tr><th>ìž¥ë¹„ëª…</th><th>ê´€ë¦¬ë²ˆí˜¸</th><th>ìœ„ì¹˜</th><th>ìµœê·¼êµì •ì¼</th><th>ë‹¤ìŒêµì •ì¼</th><th>ìƒíƒœ</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`
}

function genCapa(company) {
  const data = getLS('qualytree.capa', [])
  if (!data.length) return null
  const rows = data.map(r => {
    const st = (r.status === 'ì™„ë£Œ' || r.status === 'closed') ? 'closed' : 'open'
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
  <div><h1>CAPA í˜„í™© ë³´ê³ ì„œ</h1></div>
  <div class="meta">${company}<br>ì¶œë ¥ì¼: ${fmtDate(new Date().toISOString())}</div>
</div>
<table>
  <thead><tr><th>ë“±ë¡ì¼</th><th>ë‚´ìš©</th><th>ìœ í˜•</th><th>ë‹´ë‹¹ìž</th><th>ëª©í‘œì¼</th><th>ìƒíƒœ</th></tr></thead>
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
    <td style="text-align:center">${Array.isArray(r.education)?r.education.length:'-'}ê±´</td>
    <td style="white-space:nowrap">${fmtDate(r.updatedAt||r.lastUpdated)}</td>
  </tr>`).join('')
  return `
<div class="header">
  <div><h1>ì—­ëŸ‰ ê´€ë¦¬ í˜„í™©</h1></div>
  <div class="meta">${company}<br>ì¶œë ¥ì¼: ${fmtDate(new Date().toISOString())}</div>
</div>
<table>
  <thead><tr><th>ì„±ëª…</th><th>ë¶€ì„œ</th><th>ì§ìœ„</th><th>êµìœ¡ì´ìˆ˜</th><th>ìµœì¢…ìˆ˜ì •ì¼</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`
}

function genSuppliers(company) {
  const data = getLS('qualytree.suppliers', [])
  if (!data.length) return null
  const rows = data.map(r => {
    const gBadge = r.grade==='A'?'pass':r.grade==='C'||r.grade==='D'?'fail':'partial'
    const sBadge = r.status==='ìŠ¹ì¸'||r.status==='approved'?'pass':r.status==='ì •ì§€'?'fail':'warn'
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
  <div><h1>ê³µê¸‰ì—…ì²´ í‰ê°€ í˜„í™©</h1></div>
  <div class="meta">${company}<br>ì¶œë ¥ì¼: ${fmtDate(new Date().toISOString())}</div>
</div>
<table>
  <thead><tr><th>ì—…ì²´ëª…</th><th>í’ˆëª©ìœ í˜•</th><th>êµ­ê°€</th><th>ìµœê·¼í‰ê°€ì¼</th><th>ë“±ê¸‰</th><th>ìƒíƒœ</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`
}

function genNcr(company) {
  const data = getLS('qualytree.ncr', [])
  if (!data.length) return null
  const rows = data.map(r => {
    const st = (r.status==='ì™„ë£Œ'||r.status==='closed'||r.status==='ì²˜ë¦¬ì™„ë£Œ') ? 'closed' : 'open'
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
  <div><h1>ë¶€ì í•©(NCR) í˜„í™©</h1></div>
  <div class="meta">${company}<br>ì¶œë ¥ì¼: ${fmtDate(new Date().toISOString())}</div>
</div>
<table>
  <thead><tr><th>NCRë²ˆí˜¸</th><th>ë°œìƒì¼</th><th>ë‚´ìš©</th><th>ìœ í˜•</th><th>ë‹´ë‹¹ìž</th><th>ìƒíƒœ</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`
}

// â”€â”€ doc registry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DOC_TYPES = [
  {
    id: 'gmp_self', category: 'GMP ì‹¬ì‚¬',
    title: 'GMP ìžê°€ì ê²€ ê²°ê³¼ì„œ',
    desc: 'ìµœê·¼ í™•ì •ëœ ìžê°€ì ê²€ ê²°ê³¼',
    lsKey: 'qualytree.gmp_self_inspection_v2',
    gen: genGmpSelfInspection,
  },
  {
    id: 'calibration', category: 'ì„¤ë¹„Â·êµì •',
    title: 'êµì • ìž¥ë¹„ í˜„í™©í‘œ',
    desc: 'ì „ì²´ êµì • ìž¥ë¹„ ëª©ë¡ ë° ìƒíƒœ',
    lsKey: 'qualytree.calibration',
    gen: genCalibration,
  },
  {
    id: 'capa', category: 'í’ˆì§ˆ ê°œì„ ',
    title: 'CAPA í˜„í™© ë³´ê³ ì„œ',
    desc: 'ì‹œì •Â·ì˜ˆë°© ì¡°ì¹˜ ì „ì²´ ëª©ë¡',
    lsKey: 'qualytree.capa',
    gen: genCapa,
  },
  {
    id: 'competency', category: 'ì¸ì ìžì›',
    title: 'ì—­ëŸ‰ ê´€ë¦¬ í˜„í™©',
    desc: 'ì¸ì›ë³„ êµìœ¡ì´ìˆ˜ ë° ì—­ëŸ‰ ê¸°ë¡',
    lsKey: 'qualytree.competency_records',
    gen: genCompetency,
  },
  {
    id: 'suppliers', category: 'ê³µê¸‰ì—…ì²´',
    title: 'ê³µê¸‰ì—…ì²´ í‰ê°€ í˜„í™©',
    desc: 'ê³µê¸‰ì—…ì²´ ë“±ê¸‰ ë° ìŠ¹ì¸ ìƒíƒœ',
    lsKey: 'qualytree.suppliers',
    gen: genSuppliers,
  },
  {
    id: 'ncr', category: 'ë¶€ì í•©',
    title: 'ë¶€ì í•©(NCR) í˜„í™©',
    desc: 'NCR ë¶€ì í•© ì²˜ë¦¬ ì „ì²´ ëª©ë¡',
    lsKey: 'qualytree.ncr',
    gen: genNcr,
  },
]

// â”€â”€ main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  const companyLine = user?.user_metadata?.company || user?.email || 'íšŒì‚¬ëª…'

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
    if (!html) { alert('ì¶œë ¥í•  ë°ì´í„°ê°€ ì—†ìŠµë‹ˆë‹¤'); return }
    printHtml(html, doc.title)
  }

  async function printBatch() {
    const toPrint = DOC_TYPES.filter(d => selected[d.id])
    if (!toPrint.length) { alert('ì¶œë ¥í•  ë¬¸ì„œë¥¼ ì„ íƒí•˜ì„¸ìš”'); return }
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
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>ë¬¸ì„œ ì¶œë ¥ ì„¼í„°</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>ì œì¶œìš© ë¬¸ì„œë¥¼ í•­ëª©ë³„ë¡œ ì„ íƒí•´ PDFë¡œ ì¶œë ¥í•©ë‹ˆë‹¤</p>
          </div>
        </div>

        {/* Batch bar */}
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
          padding: '14px 16px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
        }}>
          {btn(Object.values(selected).some(Boolean) ? 'ì „ì²´ í•´ì œ' : 'ì „ì²´ ì„ íƒ', toggleAll, false, false)}
          <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>
            {selectedCount > 0 ? `${selectedCount}ê°œ ë¬¸ì„œ ì„ íƒë¨` : 'ì¶œë ¥í•  ë¬¸ì„œë¥¼ ì„ íƒí•˜ì„¸ìš”'}
          </span>
          {btn(
            <><Printer size={14} />{printing ? 'ì¶œë ¥ ì¤‘...' : `${selectedCount}ê°œ ì¼ê´„ ì¶œë ¥`}</>,
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
                        {doc.desc} &nbsp;Â·&nbsp;
                        {hasData ? <span style={{ color: '#2563eb', fontWeight: 600 }}>{count}ê±´</span> : <span>ë°ì´í„° ì—†ìŒ</span>}
                      </div>
                    </div>

                    {/* Status icon */}
                    {status === 'done' && <CheckCircle size={18} color="#10b981" />}
                    {status === 'skip' && <AlertCircle size={18} color="#f59e0b" title="ë°ì´í„° ì—†ìŒ" />}

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
                        <Printer size={12} /> ì¶œë ¥
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
          * íŒì—… ì°¨ë‹¨ì´ í•´ì œë˜ì–´ ìžˆì–´ì•¼ í•©ë‹ˆë‹¤.&nbsp; ì¶œë ¥ ëŒ€í™”ìƒìžì—ì„œ <strong>PDFë¡œ ì €ìž¥</strong>ì„ ì„ íƒí•˜ì„¸ìš”.
          <br />* ì¼ê´„ ì¶œë ¥ ì‹œ ë¬¸ì„œ ê°„ 1.4ì´ˆ ê°„ê²©ìœ¼ë¡œ ìˆœì°¨ ì¸ì‡„ì°½ì´ ì—´ë¦½ë‹ˆë‹¤.
        </p>
      </div>
    </AppLayout>
  )
}
