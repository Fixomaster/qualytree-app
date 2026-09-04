// src/lib/pdfPrint.js
// ISO 13485 QMS ë¬¸ì ì¶ë ¥ ì í¸ë¦¬í° â ë¸ë¼ì°ì  íë¦°í¸ ê¸°ë° PDF ìì±
import { auth } from './auth'

// ââ ê³µíµ ì¤íì¼ âââââââââââââââââââââââââââââââââââââââââââââââ
const BASE_CSS = `
  @page { size: A4; margin: 18mm 20mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Malgun Gothic', 'Noto Sans KR', Arial, sans-serif;
    font-size: 10pt;
    color: #1a1a1a;
    line-height: 1.5;
  }
  .qt-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2.5px solid #1a1a1a;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .qt-company { font-size: 13pt; font-weight: 800; color: #1a3a2a; }
  .qt-company-sub { font-size: 9pt; color: #555; margin-top: 2px; }
  .qt-doc-info { text-align: right; font-size: 8.5pt; color: #555; line-height: 1.6; }
  .qt-title {
    font-size: 17pt;
    font-weight: 800;
    text-align: center;
    margin: 14px 0 16px;
    letter-spacing: 0.05em;
    color: #1a1a1a;
  }
  .qt-subtitle {
    text-align: center;
    font-size: 9pt;
    color: #666;
    margin-bottom: 20px;
    font-style: italic;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0 14px;
    font-size: 9.5pt;
  }
  th {
    background: #f0f4f0;
    border: 1px solid #bbb;
    padding: 6px 10px;
    font-weight: 700;
    text-align: left;
    white-space: nowrap;
    width: 120px;
    color: #1a3a2a;
  }
  td {
    border: 1px solid #bbb;
    padding: 6px 10px;
    vertical-align: top;
  }
  .section-title {
    font-size: 11pt;
    font-weight: 700;
    color: #1a3a2a;
    border-left: 4px solid #1a3a2a;
    padding-left: 8px;
    margin: 18px 0 8px;
  }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 8.5pt;
    font-weight: 700;
    border: 1px solid currentColor;
  }
  .badge-red { color: #c0392b; background: #ffeaea; }
  .badge-orange { color: #e67e22; background: #fff4e6; }
  .badge-green { color: #27ae60; background: #e8f8ee; }
  .badge-gray { color: #555; background: #f4f4f4; }
  .signature-area {
    margin-top: 40px;
    display: flex;
    justify-content: flex-end;
    gap: 40px;
    padding-top: 10px;
    border-top: 1px dashed #ccc;
  }
  .sig-box {
    text-align: center;
    width: 130px;
  }
  .sig-line {
    border-top: 1.5px solid #333;
    margin-bottom: 5px;
    height: 30px;
  }
  .sig-label { font-size: 8.5pt; color: #444; }
  .footer {
    margin-top: 30px;
    border-top: 1px solid #ccc;
    padding-top: 8px;
    display: flex;
    justify-content: space-between;
    font-size: 7.5pt;
    color: #999;
  }
  .watermark-text {
    text-align: center;
    font-size: 8pt;
    color: #aaa;
    margin-top: 8px;
    font-style: italic;
  }
  .text-area-box {
    border: 1px solid #bbb;
    border-radius: 4px;
    padding: 10px;
    min-height: 60px;
    background: #fafafa;
    font-size: 9.5pt;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  .checklist-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 0;
    border-bottom: 1px solid #eee;
    font-size: 9pt;
  }
  .check-box {
    width: 14px; height: 14px;
    border: 1.5px solid #555;
    border-radius: 2px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    font-size: 11px;
    color: #1a3a2a;
    font-weight: bold;
  }
`

function getCompanyInfo() {
  const master = (() => { try { return JSON.parse(localStorage.getItem('qualytree.company_master')) || {} } catch { return {} } })()
  const authCo = (auth.current && auth.current()?.company) || {}
  return {
    name: master.companyName || authCo.name || 'Qualytree',
    ceoName: master.ceoName || '',
    bizNumber: master.bizNumber || '',
    address: [master.addressRoad || master.address, master.addressDetail].filter(Boolean).join(' '),
    phone: master.tel || master.phone || '',
    licenseNo: master.gmpLicenseNo || master.licenseNo || '',
    nameEn: master.companyNameEn || '',
  }
}
function getCompanyName() {
  return getCompanyInfo().name
}

function nowStr() {
  return new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function pageWrapper(docNo, title, isoClause, bodyHtml) {
  const co = getCompanyInfo()
  const company = co.name
  const coSub = [co.ceoName ? '대표이사: ' + co.ceoName : '', co.bizNumber ? '사업자: ' + co.bizNumber : ''].filter(Boolean).join(' | ')
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${title} â ${company}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<div class="qt-header">
  <div>
    <div class="qt-company">${company}</div>${coSub ? '<div class="qt-company-sub">' + coSub + '</div>' : ''}
    <div style="font-size:8.5pt;color:#666;margin-top:3px;">ISO 13485:2016 íì§ê²½ììì¤í</div>
  </div>
  <div class="qt-doc-info">
    ë¬¸ìë²í¸: ${docNo}<br>
    ì¶ë ¥ì¼ì: ${nowStr()}<br>
    ISO ì¡°í­: ${isoClause}<br>
    ì¶ë ¥ì: ${auth.current()?.name || '-'}
  </div>
</div>
<div class="qt-title">${title}</div>
${bodyHtml}
<div class="signature-area">
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">ìì±ì</div></div>
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">ê²í ì</div></div>
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">ì¹ì¸ì</div></div>
</div>
<div class="footer">
  <span>${company} Â· íì§ê²½ììì¤í (QMS)</span>
  <span>ë¬¸ìë²í¸: ${docNo} Â· ${nowStr()} ì¶ë ¥</span>
</div>
<div class="watermark-text">ì´ ë¬¸ìë Qualytree QMSìì ìë ìì±ë ê¸°ë¡ìëë¤.</div>
<script>window.onload=()=>{setTimeout(()=>{window.print()},300)}<\/script>
</body>
</html>`
}

// ââ ì¬ê°ë ë°°ì§ âââââââââââââââââââââââââââââââââââââââââââââââ
function severityBadge(sev) {
  if (!sev) return '<span class="badge badge-gray">-</span>'
  const map = { critical: ['badge-red', 'ì¹ëª'], major: ['badge-red', 'ì¤ì'], minor: ['badge-orange', 'ê²½ë¯¸'], low: ['badge-gray', 'ë®ì'] }
  const [cls, label] = map[sev] || ['badge-gray', sev]
  return `<span class="badge ${cls}">${label}</span>`
}

function statusBadge(st) {
  if (!st) return '<span class="badge badge-gray">-</span>'
  const map = {
    open: ['badge-red', 'ë¯¸ê²°'], under_review: ['badge-orange', 'ê²í  ì¤'], correcting: ['badge-orange', 'ì¡°ì¹ ì¤'],
    closed: ['badge-green', 'ì¢ê²°'], verified: ['badge-green', 'ê²ì¦ìë£'],
    pending: ['badge-gray', 'ëê¸°'], in_progress: ['badge-orange', 'ì§í ì¤'], done: ['badge-green', 'ìë£'],
    planned: ['badge-gray', 'ê³í'], completed: ['badge-orange', 'ìë£(CARëê¸°)'],
  }
  const [cls, label] = map[st] || ['badge-gray', st]
  return `<span class="badge ${cls}">${label}</span>`
}

// ââ NCR ë³´ê³ ì ââââââââââââââââââââââââââââââââââââââââââââââââ
export function printNCR(ncr) {
  const body = `
    <div class="qt-subtitle">ë¶ì í© ë³´ê³ ì (Non-Conformance Report)</div>
    <div class="section-title">1. ê¸°ë³¸ ì ë³´</div>
    <table>
      <tr><th>NCR ë²í¸</th><td>${ncr.id || '-'}</td><th>ë°ìì¼</th><td>${ncr.detectedAt?.slice(0,10) || '-'}</td></tr>
      <tr><th>ì¬ê°ë</th><td>${severityBadge(ncr.severity)}</td><th>ìí</th><td>${statusBadge(ncr.status)}</td></tr>
      <tr><th>ë°ì ë¶ì</th><td>${ncr.department || '-'}</td><th>ë°ì ì í</th><td>${ncr.source || '-'}</td></tr>
      <tr><th>ë±ë¡ì</th><td colspan="3">${ncr.reportedBy || '-'}</td></tr>
    </table>

    <div class="section-title">2. ë¶ì í© ë´ì©</div>
    <div style="margin-bottom:6px;font-size:9pt;color:#555;">ì ëª©</div>
    <div class="text-area-box" style="margin-bottom:12px;">${ncr.title || '-'}</div>
    <div style="margin-bottom:6px;font-size:9pt;color:#555;">ìì¸ ë´ì©</div>
    <div class="text-area-box">${ncr.description || ncr.detail || '(ë´ì© ìì)'}</div>

    <div class="section-title">3. ìì¸ ë¶ì</div>
    <div class="text-area-box" style="min-height:80px;">${ncr.rootCause || '(ë¯¸ìë ¥)'}</div>

    <div class="section-title">4. ì¦ê° ì¡°ì¹ ì¬í­</div>
    <div class="text-area-box">${ncr.immediateAction || '(ë¯¸ìë ¥)'}</div>

    <div class="section-title">5. ê´ë ¨ ISO ì¡°í­</div>
    <table>
      <tr><th>ISO 13485 ì¡°í­</th><td>${ncr.isoClause || '-'}</td></tr>
      <tr><th>ê´ë ¨ ì í/ê³µì </th><td>${ncr.product || ncr.process || '-'}</td></tr>
      <tr><th>ì°ê²°ë CAPA</th><td>${ncr.capaId || '(ë¯¸ì°ê²°)'}</td></tr>
    </table>
  `
  openPrint(pageWrapper(ncr.id || 'NCR-XXXX', 'ë¶ì í© ë³´ê³ ì', 'ISO 13485 Â§8.3', body))
}

// ââ CAPA ê¸°ë¡ âââââââââââââââââââââââââââââââââââââââââââââââââ
export function printCAPA(capa) {
  const body = `
    <div class="qt-subtitle">ìì  ë° ìë°©ì¡°ì¹ ê¸°ë¡ (Corrective and Preventive Action)</div>
    <div class="section-title">1. ê¸°ë³¸ ì ë³´</div>
    <table>
      <tr><th>CAPA ë²í¸</th><td>${capa.id || '-'}</td><th>ë°íì¼</th><td>${capa.createdAt?.slice(0,10) || '-'}</td></tr>
      <tr><th>ì í</th><td>${capa.type === 'corrective' ? 'ìì ì¡°ì¹ (CA)' : capa.type === 'preventive' ? 'ìë°©ì¡°ì¹ (PA)' : capa.type || '-'}</td><th>ìí</th><td>${statusBadge(capa.status)}</td></tr>
      <tr><th>ë´ë¹ì</th><td>${capa.assignee || '-'}</td><th>ìë£ ëª©íì¼</th><td>${capa.targetDate || '-'}</td></tr>
      <tr><th>ê´ë ¨ NCR</th><td colspan="3">${capa.ncrId || '(í´ë¹ìì)'}</td></tr>
    </table>

    <div class="section-title">2. CAPA ì ëª© ë° ë°°ê²½</div>
    <div class="text-area-box" style="margin-bottom:10px;font-weight:bold;">${capa.title || '-'}</div>
    <div class="text-area-box">${capa.background || capa.description || '(ë¯¸ìë ¥)'}</div>

    <div class="section-title">3. ê·¼ë³¸ ìì¸ ë¶ì</div>
    <div class="text-area-box" style="min-height:80px;">${capa.rootCause || '(ë¯¸ìë ¥)'}</div>

    <div class="section-title">4. ì¡°ì¹ ê³í</div>
    <div class="text-area-box">${capa.actionPlan || '(ë¯¸ìë ¥)'}</div>

    <div class="section-title">5. ì¡°ì¹ ê²°ê³¼ ë° í¨ê³¼ ê²ì¦</div>
    <table>
      <tr><th>ì¡°ì¹ ìë£ì¼</th><td>${capa.completedAt?.slice(0,10) || '(ë¯¸ìë£)'}</td></tr>
      <tr><th>í¨ê³¼ ê²ì¦ ë°©ë²</th><td>${capa.verificationMethod || '(ë¯¸ìë ¥)'}</td></tr>
      <tr><th>í¨ê³¼ ê²ì¦ ê²°ê³¼</th><td>${capa.verificationResult || '(ë¯¸ìë ¥)'}</td></tr>
    </table>
  `
  openPrint(pageWrapper(capa.id || 'CAPA-XXXX', 'ìì  ë° ìë°©ì¡°ì¹ ê¸°ë¡', 'ISO 13485 Â§8.5.2 / Â§8.5.3', body))
}

// ââ ë´ë¶ê°ì¬ ë³´ê³ ì âââââââââââââââââââââââââââââââââââââââââââ
export function printAudit(audit, cars = []) {
  const relatedCars = cars.filter(c => c.auditId === audit.id)
  const carsHtml = relatedCars.length === 0
    ? '<div style="color:#999;padding:8px;font-size:9pt;">ë°íë CAR ìì</div>'
    : relatedCars.map((car, i) => `
      <tr>
        <td>${i+1}</td>
        <td>${car.id}</td>
        <td>${car.severity === 'major' ? 'ì¤ì' : car.severity === 'minor' ? 'ê²½ë¯¸' : 'ê´ì°°'}</td>
        <td style="max-width:200px">${car.finding || '-'}</td>
        <td>${car.assignee || '-'}</td>
        <td>${car.dueDate || '-'}</td>
        <td>${statusBadge(car.status)}</td>
      </tr>`).join('')

  const body = `
    <div class="qt-subtitle">ë´ë¶ê°ì¬ ë³´ê³ ì (Internal Audit Report)</div>
    <div class="section-title">1. ê°ì¬ ê°ì</div>
    <table>
      <tr><th>ê°ì¬ ë²í¸</th><td>${audit.id || '-'}</td><th>ê°ì¬ì¼</th><td>${audit.auditDate || '-'}</td></tr>
      <tr><th>ê°ì¬ ì í</th><td>${audit.type === 'internal' ? 'ë´ë¶ê°ì¬' : audit.type === 'supplier' ? 'ê³µê¸ìì²´ ê°ì¬' : audit.type || '-'}</td><th>ìí</th><td>${statusBadge(audit.status)}</td></tr>
      <tr><th>ê°ì¬ ê¸°ì¤</th><td>${audit.standard || 'ISO 13485:2016'}</td><th>ê°ì¬ì</th><td>${audit.auditor || '-'}</td></tr>
      <tr><th>í¼ê°ì¬ ë¶ì</th><td>${audit.auditee || '-'}</td><th>ê°ì¬ ë²ì</th><td>${audit.scope || '-'}</td></tr>
    </table>

    <div class="section-title">2. ê°ì¬ ì ëª©</div>
    <div class="text-area-box" style="font-weight:bold;">${audit.title || '-'}</div>

    <div class="section-title">3. ê°ì¬ ê²°ê³¼ ìì½</div>
    <table>
      <tr>
        <th style="width:30px">No.</th>
        <th style="width:90px">êµ¬ë¶</th>
        <th style="width:70px">ì¬ê°ë</th>
        <th>ë´ì©</th>
        <th style="width:60px">ë´ë¹ì</th>
        <th style="width:70px">ëª©íì¼</th>
        <th style="width:70px">ìí</th>
      </tr>
      ${carsHtml}
    </table>

    <div class="section-title">4. ì¢í© ìê²¬</div>
    <div class="text-area-box" style="min-height:80px;">${audit.conclusion || audit.notes || '(ë¯¸ìë ¥)'}</div>

    <div class="section-title">5. íì ì¡°ì¹ ìì½</div>
    <table>
      <tr><th>ì´ CAR ë°í</th><td>${relatedCars.length}ê±´</td><th>ë¯¸ê²° CAR</th><td>${relatedCars.filter(c => c.status === 'open').length}ê±´</td></tr>
      <tr><th>ê°ì¬ ì¢ê²° ëª©íì¼</th><td colspan="3">${audit.closureDate || '(ë¯¸ì )'}</td></tr>
    </table>
  `
  openPrint(pageWrapper(audit.id || 'AUD-XXXX', 'ë´ë¶ê°ì¬ ë³´ê³ ì', 'ISO 13485 Â§8.2.2', body))
}

// ââ CAR (ìì ì¡°ì¹ ìì²­ì) âââââââââââââââââââââââââââââââââââââ
export function printCAR(car) {
  const body = `
    <div class="qt-subtitle">ìì ì¡°ì¹ ìì²­ì (Corrective Action Request)</div>
    <div class="section-title">1. ê¸°ë³¸ ì ë³´</div>
    <table>
      <tr><th>CAR ë²í¸</th><td>${car.id || '-'}</td><th>ë°íì¼</th><td>${car.createdAt?.slice(0,10) || '-'}</td></tr>
      <tr><th>ê´ë ¨ ê°ì¬</th><td>${car.auditId || '-'}</td><th>ìí</th><td>${statusBadge(car.status)}</td></tr>
      <tr><th>ì¬ê°ë</th><td>${severityBadge(car.severity)}</td><th>ê´ë ¨ ìê±´</th><td>${car.requirement || '-'}</td></tr>
      <tr><th>ë´ë¹ì</th><td>${car.assignee || '-'}</td><th>ìë£ ëª©íì¼</th><td>${car.dueDate || '-'}</td></tr>
    </table>

    <div class="section-title">2. ë¶ì í© / ê´ì°° ì¬í­</div>
    <div class="text-area-box">${car.finding || '-'}</div>

    <div class="section-title">3. ìì ì¡°ì¹ ê³í</div>
    <div class="text-area-box" style="min-height:80px;">${car.actionPlan || '(ë¯¸ìë ¥)'}</div>

    <div class="section-title">4. ìì ì¡°ì¹ ê²°ê³¼</div>
    <table>
      <tr><th>ì¡°ì¹ ìë£ì¼</th><td>${car.completedAt?.slice(0,10) || '(ë¯¸ìë£)'}</td></tr>
      <tr><th>ì¡°ì¹ ë´ì©</th><td>${car.actionTaken || '(ë¯¸ìë ¥)'}</td></tr>
      <tr><th>ê²ì¦ ê²°ê³¼</th><td>${car.verificationResult || '(ë¯¸ìë ¥)'}</td></tr>
    </table>
  `
  openPrint(pageWrapper(car.id || 'CAR-XXXX', 'ìì ì¡°ì¹ ìì²­ì', 'ISO 13485 Â§8.2.2 / Â§8.5.2', body))
}

// ââ ê°ì íë ë³´ê³ ì âââââââââââââââââââââââââââââââââââââââââââ
export function printImprovement(imp) {
  const typeMap = { process:'íë¡ì¸ì¤ ê°ì ', quality:'íì§ ê°ì ', safety:'ìì  ê°ì ', cost:'ë¹ì© ì ê°', delivery:'ë©ê¸° ê°ì ', morale:'ìë¬´ íê²½', preventive:'ìë°© ì¡°ì¹' }
  const body = `
    <div class="qt-subtitle">ê°ì íë ë³´ê³ ì (Improvement Activity Report)</div>
    <div class="section-title">1. ê¸°ë³¸ ì ë³´</div>
    <table>
      <tr><th>ê³¼ì  ë²í¸</th><td>${imp.id || '-'}</td><th>ë±ë¡ì¼</th><td>${imp.createdAt?.slice(0,10) || '-'}</td></tr>
      <tr><th>ê°ì  ì í</th><td>${typeMap[imp.type] || imp.type || '-'}</td><th>ìí</th><td>${statusBadge(imp.status)}</td></tr>
      <tr><th>ì°ì ìì</th><td>${imp.priority === 'high' ? 'ëì' : imp.priority === 'medium' ? 'ë³´íµ' : 'ë®ì'}</td><th>ë´ë¹ì</th><td>${imp.assignee || '-'}</td></tr>
      <tr><th>ê´ë ¨ ë¶ì</th><td>${imp.dept || '-'}</td><th>ìë£ ëª©íì¼</th><td>${imp.dueDate || '-'}</td></tr>
    </table>

    <div class="section-title">2. ê³¼ì ëª ë° ë°°ê²½</div>
    <div class="text-area-box" style="margin-bottom:10px;font-weight:bold;">${imp.title || '-'}</div>
    <div class="text-area-box">${imp.description || '(ë¯¸ìë ¥)'}</div>

    <div class="section-title">3. ê¸°ë í¨ê³¼</div>
    <div class="text-area-box">${imp.expectedEffect || '(ë¯¸ìë ¥)'}</div>

    <div class="section-title">4. ì¤í ê²°ê³¼ ë° í¨ê³¼ ê²ì¦</div>
    <table>
      <tr><th>ìë£ì¼</th><td>${imp.completedAt?.slice(0,10) || '(ë¯¸ìë£)'}</td></tr>
      <tr><th>ì¤ì  í¨ê³¼</th><td>${imp.actualEffect || '(ë¯¸ìë ¥)'}</td></tr>
    </table>
  `
  openPrint(pageWrapper(imp.id || 'IMP-XXXX', 'ê°ì íë ë³´ê³ ì', 'ISO 13485 Â§8.5.1', body))
}

// ââ ììì§ì ê¸°ë¡ âââââââââââââââââââââââââââââââââââââââââââââ
export function printWorkOrder(wo) {
  const stages = wo.stages || []
  const stagesHtml = stages.length === 0
    ? '<tr><td colspan="4" style="color:#999;text-align:center;">ê³µì  ë¨ê³ ìì</td></tr>'
    : stages.map((s, i) => `
      <tr>
        <td style="text-align:center">${i+1}</td>
        <td>${s.name || s.stageId || '-'}</td>
        <td style="text-align:center">${s.status === 'completed' ? 'â ìë£' : s.status === 'in_progress' ? 'â¶ ì§í' : 'â ëê¸°'}</td>
        <td>${s.completedAt?.slice(0,10) || '-'}</td>
      </tr>`).join('')

  const body = `
    <div class="qt-subtitle">ììì§ìì / ì ìë°°ì¹ê¸°ë¡ (Work Order / eBatch Record)</div>
    <div class="section-title">1. ììì§ì ê¸°ë³¸ ì ë³´</div>
    <table>
      <tr><th>WO ë²í¸</th><td>${wo.woId || wo.id || '-'}</td><th>ë°íì¼</th><td>${wo.issuedAt?.slice(0,10) || wo.createdAt?.slice(0,10) || '-'}</td></tr>
      <tr><th>ì íëª</th><td>${wo.productName || '-'}</td><th>ì í ëª¨ë¸</th><td>${wo.productModel || '-'}</td></tr>
      <tr><th>ë¡í¸ ë²í¸</th><td>${wo.lotNumber || '-'}</td><th>ìì° ìë</th><td>${wo.quantity || '-'}</td></tr>
      <tr><th>ì°ì ìì</th><td>${wo.priority === 'urgent' ? 'â¡ ê¸´ê¸' : 'ì¼ë°'}</td><th>ìí</th><td>${statusBadge(wo.status)}</td></tr>
      <tr><th>ë©ê¸° ëª©íì¼</th><td colspan="3">${wo.dueDate || '-'}</td></tr>
    </table>

    <div class="section-title">2. ê³µì  ë¨ê³ ì§í íí©</div>
    <table>
      <tr><th style="width:40px">ìì</th><th>ê³µì ëª</th><th style="width:80px">ìí</th><th style="width:90px">ìë£ì¼</th></tr>
      ${stagesHtml}
    </table>

    <div class="section-title">3. í¹ê¸° ì¬í­</div>
    <div class="text-area-box" style="min-height:60px;">${wo.notes || wo.remark || '(ìì)'}</div>
  `
  openPrint(pageWrapper(wo.woId || 'WO-XXXX', 'ììì§ìì / ì ìë°°ì¹ê¸°ë¡', 'ISO 13485 Â§7.5', body))
}

// ââ ê³µì ê²ì¬ì±ì ì (IPC Inspection Certificate) âââââââââââââââââ
export function printInspectionCert(insp, wo) {
  const resultBadge = (r) => {
    const map = { 'í©ê²©': ['badge-green', 'í©ê²©'], 'ì¡°ê±´ë¶': ['badge-orange', 'ì¡°ê±´ë¶í©ê²©'], 'ì¡°ê±´ë¶í©ê²©': ['badge-orange', 'ì¡°ê±´ë¶í©ê²©'], 'ë¶í©ê²©': ['badge-red', 'ë¶í©ê²©'], 'ê²ì¬ì¤': ['badge-gray', 'ê²ì¬ì¤'] }
    const [cls, label] = map[r] || ['badge-gray', r || '-']
    return `<span class="badge ${cls}">${label}</span>`
  }
  const body = `
    <div class="qt-subtitle">ê³µì ê²ì¬ì±ì ì (In-Process Inspection Certificate)</div>
    <div class="section-title">1. ê²ì¬ ê¸°ë³¸ ì ë³´</div>
    <table>
      <tr><th>ê²ì¬ ID</th><td>${insp.id || '-'}</td><th>ê²ì¬ì¼</th><td>${insp.date?.slice(0,10) || insp.date || '-'}</td></tr>
      <tr><th>ììì§ì(WO)</th><td>${insp.wo || '-'}</td><th>ì íëª</th><td>${wo?.product || '-'}</td></tr>
      <tr><th>ê²ì¬ ë¨ê³</th><td colspan="3">${insp.step || '-'}</td></tr>
      <tr><th>ê²ì¬ì</th><td>${insp.inspector || '-'}</td><th>ê²°ê³¼</th><td>${resultBadge(insp.status || insp.result)}</td></tr>
    </table>

    <div class="section-title">2. ê²ì¬ ê·ê²© ë° ì¸¡ì  ê²°ê³¼</div>
    <table>
      <tr><th>ê²ì¬ ê·ê²©(ê¸°ì¤)</th><td colspan="3">${insp.spec || '(ìì)'}</td></tr>
      <tr><th>ì¤ì¸¡ê°</th><td colspan="3">${insp.measured || '(ìì)'}</td></tr>
    </table>

    <div class="section-title">3. ì²¨ë¶ ìë£</div>
    <div class="text-area-box" style="min-height:40px;">${insp.fileName ? `ì²¨ë¶: ${insp.fileName}` : '(ì²¨ë¶ ìì)'}</div>

    <div class="section-title">4. ë¹ê³ </div>
    <div class="text-area-box" style="min-height:60px;">${insp.note || '(ìì)'}</div>
  `
  openPrint(pageWrapper(insp.id || 'IPC-XXXX', 'ê³µì ê²ì¬ì±ì ì', 'ISO 13485 Â§8.2.6', body))
}

// ââ ììê²ì¬ì±ì ì âââââââââââââââââââââââââââââââââââââââââââ
export function printIqcCert(rec) {
  const resultMap = { 'í©ê²©': ['badge-green', 'í©ê²©'], 'ì¡°ê±´ë¶': ['badge-orange', 'ì¡°ê±´ë¶í©ê²©'], 'ë¶í©ê²©': ['badge-red', 'ë¶í©ê²©'], 'ê²ì¬ëê¸°': ['badge-gray', 'ê²ì¬ëê¸°'] }
  const [cls, label] = resultMap[rec.status] || ['badge-gray', rec.status || '-']
  const resultBadge = `<span class="badge ${cls}">${label}</span>`
  const rows = (rec.checkResults || []).map((r) => `
    <tr>
      <td>${r.name || '-'}</td>
      <td>${r.spec || '(ì í ìì)'}</td>
      <td>${r.measured || '-'}</td>
      <td>${r.result === 'pass' ? '<span class="badge badge-green">í©ê²©</span>' : '<span class="badge badge-red">ë¶í©ê²©</span>'}</td>
    </tr>`).join('')
  const decisionBlock = rec.qcDecision ? `
    <div class="section-title">4. íì§ì±ìì ê²°ì </div>
    <table>
      <tr><th>ê²°ì </th><td>${rec.qcDecision.decision || '-'}</td><th>ê²°ì ì</th><td>${rec.qcDecision.decidedBy || '-'}</td></tr>
      <tr><th>ê²°ì ì¼</th><td colspan="3">${(rec.qcDecision.decidedAt || '').slice(0,10) || '-'}</td></tr>
    </table>
    <div class="text-area-box" style="min-height:40px;">${rec.qcDecision.note || '(ë¹ê³  ìì)'}</div>
  ` : ''
  const body = `
    <div class="qt-subtitle">ììê²ì¬ì±ì ì (Incoming Quality Inspection Certificate)</div>
    <div class="section-title">1. ê²ì¬ ê¸°ë³¸ ì ë³´</div>
    <table>
      <tr><th>IQCë²í¸</th><td>${rec.id || '-'}</td><th>ê²ì¬ì¼</th><td>${rec.date || '-'}</td></tr>
      <tr><th>ë°ì£¼ë²í¸(PO)</th><td>${rec.po || '-'}</td><th>íë ¥ìì²´</th><td>${rec.vendor || '-'}</td></tr>
      <tr><th>íëª©</th><td>${rec.items || '-'}</td><th>ìë</th><td>${rec.qty || '-'}</td></tr>
      <tr><th>ê²ì¬ì</th><td>${rec.inspector || '-'}</td><th>ê²°ê³¼</th><td>${resultBadge}</td></tr>
    </table>

    <div class="section-title">2. ê²ì¬ í­ëª© ë° ì¸¡ì  ê²°ê³¼</div>
    <table>
      <tr><th>ê²ì¬í­ëª©</th><th>ê·ê²©(ê¸°ì¤)</th><th>ì¸¡ì ê°</th><th>íì </th></tr>
      ${rows || '<tr><td colspan="4">(ê²ì¬ í­ëª© ìì)</td></tr>'}
    </table>

    <div class="section-title">3. ë¶ì í© ì¬í­</div>
    <div class="text-area-box" style="min-height:40px;">${rec.nc && rec.nc !== 'â' ? rec.nc : '(ë¶ì í© ìì)'}</div>
    ${decisionBlock}
  `
  openPrint(pageWrapper(rec.id || 'IQC-XXXX', 'ììê²ì¬ì±ì ì', 'ISO 13485 Â§7.4.3', body))
}

// ââ ì²­ê²°Â·ì¤ì¼ ëª¨ëí°ë§ ì±ì ì âââââââââââââââââââââââââââââââ
export function printCleanlinessCert(rec, spec) {
  const resultMap = { pass: ['badge-green', 'í©ê²©'], fail: ['badge-red', 'ë¶í©ê²©'], conditional: ['badge-orange', 'ì¡°ê±´ë¶í©ê²©'] }
  const [cls, label] = resultMap[rec.result] || ['badge-gray', rec.result || '-']
  const resultBadge = `<span class="badge ${cls}">${label}</span>`
  const body = `
    <div class="qt-subtitle">ì²­ê²°Â·ì¤ì¼ ëª¨ëí°ë§ ì±ì ì (Cleanliness Monitoring Certificate)</div>
    <div class="section-title">1. ê¸°ë³¸ ì ë³´</div>
    <table>
      <tr><th>ê¸°ë¡ ID</th><td>${rec.id || '-'}</td><th>ì¼ì</th><td>${rec.date || '-'}</td></tr>
      <tr><th>ì í/ì¬ì</th><td>${(spec && spec.productName) || '-'}</td><th>ë¡í¸ ë²í¸</th><td>${rec.lotNo || '-'}</td></tr>
      <tr><th>ê²°ê³¼</th><td colspan="3">${resultBadge}</td></tr>
    </table>

    <div class="section-title">2. ì¸¡ì  ê²°ê³¼</div>
    <table>
      <tr><th>ë¯¸ë¦½ì ì¸¡ì ê°</th><td>${rec.particleResult || '(ìì)'}</td><th>ë¯¸ìë¬¼ ì¸¡ì ê°</th><td>${rec.microbialResult || '(ìì)'}</td></tr>
      <tr><th>ì´ë¬¼ ê²ì¬ ê²°ê³¼</th><td colspan="3">${rec.foreignMatterResult || '(ìì)'}</td></tr>
      <tr><th>ì¨ë</th><td>${rec.temperature ? rec.temperature + ' â' : '(ìì)'}</td><th>ìµë</th><td>${rec.humidity ? rec.humidity + ' %RH' : '(ìì)'}</td></tr>
      <tr><th>ì°¨ì</th><td colspan="3">${rec.pressureDiff ? rec.pressureDiff + ' Pa' : '(ìì)'}</td></tr>
    </table>

    <div class="section-title">3. ë¹ê³ </div>
    <div class="text-area-box" style="min-height:60px;">${rec.notes || '(ìì)'}</div>
  `
  openPrint(pageWrapper(rec.id || 'CLN-XXXX', 'ì²­ê²°Â·ì¤ì¼ ëª¨ëí°ë§ ì±ì ì', 'ISO 13485 Â§7.5.2', body))
}

// ââ ë©¸ê·  ë°°ì¹ ì±ì ì âââââââââââââââââââââââââââââââââââââââââ
export function printSterileBatchCert(batch, spec) {
  const resultMap = { pass: ['badge-green', 'í©ê²©'], fail: ['badge-red', 'ë¶í©ê²©'], conditional: ['badge-orange', 'ì¡°ê±´ë¶í©ê²©'] }
  const [cls, label] = resultMap[batch.result] || ['badge-gray', batch.result || '-']
  const resultBadge = `<span class="badge ${cls}">${label}</span>`
  const body = `
    <div class="qt-subtitle">ë©¸ê·  ë°°ì¹ ì±ì ì (Sterilization Batch Certificate)</div>
    <div class="section-title">1. ë°°ì¹ ê¸°ë³¸ ì ë³´</div>
    <table>
      <tr><th>ë°°ì¹/ë¡í¸ ë²í¸</th><td>${batch.batchNo || '-'}</td><th>ë©¸ê·  ì¼ì</th><td>${batch.date || '-'}</td></tr>
      <tr><th>ì íëª</th><td>${batch.productName || '-'}</td><th>ìì° ë¡í¸</th><td>${batch.lotNo || '-'}</td></tr>
      <tr><th>ë©¸ê·  ë°©ë²</th><td>${batch.sterileMethod || '-'}</td><th>ì°ê²°ë ì¬ì</th><td>${spec ? (spec.productName + ' (SAL ' + spec.salTarget + ')') : '(ì§ì  ìë ¥)'}</td></tr>
      <tr><th>í©/ë¶ íì </th><td colspan="3">${resultBadge}</td></tr>
    </table>

    <div class="section-title">2. ì¤ì¸¡ ì¬ì´í´ íë¼ë¯¸í°</div>
    <table>
      <tr><th>ì¨ë</th><td>${batch.actualTemp ? batch.actualTemp + ' â' : '(ìì)'}</td><th>ìê°</th><td>${batch.actualTime ? batch.actualTime + ' ë¶' : '(ìì)'}</td></tr>
      <tr><th>ìë ¥</th><td>${batch.actualPressure ? batch.actualPressure + ' bar' : '(ìì)'}</td><th>ì ë</th><td>${batch.actualDose || '(ìì)'}</td></tr>
    </table>

    <div class="section-title">3. ë©¸ê·  ê²ì¦ ê²°ê³¼</div>
    <table>
      <tr><th>ë°ì´ì¤ë²ë  ê²°ê³¼</th><td>${batch.bioburdenResult ? batch.bioburdenResult + ' CFU/ê°' : '(ìì)'}</td><th>ë¬ì± SAL</th><td>${batch.salAchieved || '(ìì)'}</td></tr>
    </table>

    <div class="section-title">4. ë¹ê³ </div>
    <div class="text-area-box" style="min-height:60px;">${batch.notes || '(ìì)'}</div>
  `
  openPrint(pageWrapper(batch.batchNo || 'SB-XXXX', 'ë©¸ê·  ë°°ì¹ ì±ì ì', 'ISO 13485 Â§7.5.7', body))
}

// ââ ë©¸ê· ê´ë¦¬ ì ì°¨ì (ì¬ì²ë¦¬Â·ë¼ë²¨ë§ ì ì±) âââââââââââââââââââââââââ
export function printSterilizationProcedure(policy) {
  const sec = (label, val) => `
    <div class="section-title">${label}</div>
    <div class="text-area-box" style="min-height:50px;">${val ? String(val).replace(/\n/g, '<br/>') : '(ë¯¸ìë ¥)'}</div>
  `
  const revRows = (policy.revisionHistory || []).length === 0
    ? '<tr><td colspan="4" style="color:#999;text-align:center;">ê°ì  ì´ë ¥ ìì</td></tr>'
    : policy.revisionHistory.map(r => `
      <tr><td>${r.date || '-'}</td><td>${r.revision || '-'}</td><td>${r.by || '-'}</td><td>${r.summary || '-'}</td></tr>
    `).join('')
  const body = `
    <div class="qt-subtitle">ë©¸ê· ê´ë¦¬ ì ì°¨ì (Sterilization Management Procedure)</div>
    <table>
      <tr><th>ê°ì ë²í¸</th><td>${policy.revision || '-'}</td><th>ë°íì¼</th><td>${policy.issueDate || '-'}</td></tr>
      <tr><th>ì¹ì¸ì</th><td colspan="3">${policy.approvedBy || '-'}</td></tr>
    </table>
    ${sec('1. ì ì© ë²ì', policy.scope)}
    ${sec('2. ë¨í ì¬ì© ëªì (Â§7.5.7 íì)', policy.singleUseStatement)}
    ${sec('3. ì¬ì²ë¦¬ ì ì±', policy.reprocessingPolicy)}
    ${sec('4. ë¼ë²¨ë§ ìêµ¬ì¬í­', policy.labelingReqs)}
    ${sec('5. ì í¨ê¸°ê° ì¶ì  ë°©ë²', policy.expiryTrackingMethod)}
    ${sec('6. ìí í ë©¸ê·  ëª¨ëí°ë§', policy.postMarketMonitoring)}
    <div class="section-title">7. ê°ì  ì´ë ¥</div>
    <table>
      <tr><th style="width:90px">ë ì§</th><th style="width:80px">ê°ì ë²í¸</th><th style="width:100px">ìì±ì</th><th>ë´ì© ìì½</th></tr>
      ${revRows}
    </table>
  `
  openPrint(pageWrapper(policy.revision || 'STR-SOP', 'ë©¸ê· ê´ë¦¬ ì ì°¨ì', 'ISO 13485 Â§7.5.7', body))
}

// ââ ë¦¬ì½ íµë³´ ëì ê³ ê° ëª©ë¡ (ë¦¬ì½ ìë®¬ë ì´ì) âââââââââââââââââââ
export function printRecallNotice({ lot, recallClass, reason, hits = [] }) {
  const classMap = { I: 'Class I â ì¦ì ë¦¬ì½', II: 'Class II â ì ì ë¦¬ì½', III: 'Class III â ì¼ë° ë¦¬ì½' }
  const totalQty = hits.reduce((s, h) => s + (parseInt(h.qty) || 0), 0)
  const rowsHtml = hits.length === 0
    ? '<tr><td colspan="5" style="color:#999;text-align:center;">íµë³´ ëì ê³ ê° ìì</td></tr>'
    : hits.map((h, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${h.customerName || '-'}</td>
        <td>${h.customerContact || '-'}</td>
        <td>${h.customerAddress || '-'}</td>
        <td style="text-align:right">${h.qty || '-'}</td>
      </tr>`).join('')

  const body = `
    <div class="qt-subtitle">ë¦¬ì½ íµë³´ ëì ê³ ê° ëª©ë¡ (Recall Notification List)</div>
    <div class="section-title">1. ë¦¬ì½ ê°ì</div>
    <table>
      <tr><th>ëì LOT</th><td>${lot || '-'}</td><th>ë¦¬ì½ ë±ê¸</th><td>${classMap[recallClass] || recallClass || '-'}</td></tr>
      <tr><th>íµë³´ ëì ê³ ê° ì</th><td>${hits.length}ê±´</td><th>ì´ íì ìë</th><td>${totalQty}</td></tr>
      <tr><th>ë¦¬ì½ ì¬ì </th><td colspan="3">${reason || '(ë¯¸ìë ¥)'}</td></tr>
    </table>

    <div class="section-title">2. íµë³´ ëì ê³ ê° ëª©ë¡</div>
    <table>
      <tr><th style="width:40px">ë²í¸</th><th>ê³ ê°ëª</th><th>ì°ë½ì²</th><th>ì£¼ì</th><th style="width:80px">ìë</th></tr>
      ${rowsHtml}
    </table>

    <div class="section-title">3. ì¡°ì¹ ì¬í­</div>
    <div class="text-area-box" style="min-height:60px;">ìê¸° ê³ ê°ìê² ë¦¬ì½ íµë³´ë¥¼ ë°ì¡íê³ , íì ìë£ ì¬ë¶ë¥¼ ì¶ì  ê´ë¦¬íë¤. íì ì ê·ì ë¹êµ­(ìì½ì² ë±)ì ë³´ê³ íë¤.</div>
  `
  openPrint(pageWrapper(`RCL-${lot || 'XXXX'}`, 'ë¦¬ì½ íµë³´ ëì ê³ ê° ëª©ë¡', 'ISO 13485 Â§8.3 / Â§7.5.9', body))
}

// ââ ê°ì¬ ì²´í¬ë¦¬ì¤í¸ âââââââââââââââââââââââââââââââââââââââââââ
export function printAuditChecklist(checks = {}) {
  const ITEMS = [
    { iso: '4.1', item: 'íì§ê²½ììì¤í ì¼ë° ìê±´' },
    { iso: '4.2', item: 'ë¬¸ìí ìê±´ (ë§¤ë´ì¼Â·ì ì°¨Â·ê¸°ë¡)' },
    { iso: '5.1', item: 'ê²½ìì§ ì±ì ë° ìì§' },
    { iso: '5.4', item: 'íì§ëª©í ë° ê³í' },
    { iso: '6.2', item: 'ì¸ì  ìì (êµì¡Â·ì­ë)' },
    { iso: '6.3', item: 'ê¸°ë°êµ¬ì¡° (ì¤ë¹Â·íê²½)' },
    { iso: '7.2', item: 'ê³ ê° ê´ë ¨ íë¡ì¸ì¤' },
    { iso: '7.3', item: 'ì¤ê³ ë° ê°ë°' },
    { iso: '7.4', item: 'êµ¬ë§¤ (ê³µê¸ìì²´ ê´ë¦¬)' },
    { iso: '7.5', item: 'ìì° ë° ìë¹ì¤ ì ê³µ' },
    { iso: '7.6', item: 'ëª¨ëí°ë§ ë° ì¸¡ì ì¥ì¹ ê´ë¦¬' },
    { iso: '8.2.1', item: 'ê³ ê°ë§ì¡± ëª¨ëí°ë§' },
    { iso: '8.2.4', item: 'ì í ëª¨ëí°ë§ ë° ì¸¡ì ' },
    { iso: '8.3', item: 'ë¶ì í© ì í ê´ë¦¬' },
    { iso: '8.4', item: 'ë°ì´í° ë¶ì' },
    { iso: '8.5', item: 'ê°ì  (CAPA)' },
  ]

  const rowsHtml = ITEMS.map(it => {
    const val = checks[it.iso] || 'pending'
    const mark = val === 'ok' ? 'â ì í©' : val === 'nc' ? 'â ë¶ì í©' : val === 'na' ? 'N/A' : 'â ë¯¸íì¸'
    const color = val === 'ok' ? '#27ae60' : val === 'nc' ? '#c0392b' : '#888'
    return `<tr>
      <td style="text-align:center;font-family:monospace;font-weight:bold;">Â§${it.iso}</td>
      <td>${it.item}</td>
      <td style="text-align:center;color:${color};font-weight:bold;">${mark}</td>
      <td style="min-width:160px;color:#999;font-size:8pt;">&nbsp;</td>
    </tr>`
  }).join('')

  const ok = ITEMS.filter(it => checks[it.iso] === 'ok').length
  const nc = ITEMS.filter(it => checks[it.iso] === 'nc').length

  const body = `
    <div class="qt-subtitle">ISO 13485:2016 ë´ë¶ê°ì¬ ì²´í¬ë¦¬ì¤í¸</div>
    <table style="margin-bottom:16px">
      <tr><th>ê°ì¬ì¼</th><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><th>ê°ì¬ì</th><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td></tr>
      <tr><th>í¼ê°ì¬ ë¶ì</th><td>&nbsp;</td><th>ê°ì¬ ë²í¸</th><td>&nbsp;</td></tr>
    </table>
    <table>
      <tr>
        <th style="width:55px">ISO ì¡°í­</th>
        <th>ì¬ì¬ í­ëª©</th>
        <th style="width:80px">ê²°ê³¼</th>
        <th style="width:160px">ë¹ê³  / ë¶ì í© ë´ì©</th>
      </tr>
      ${rowsHtml}
    </table>
    <div class="section-title">ê²°ê³¼ ìì½</div>
    <table>
      <tr>
        <th style="width:25%">ì´ ì¬ì¬ í­ëª©</th><td style="width:25%">${ITEMS.length}í­ëª©</td>
        <th style="width:25%">ì í©</th><td style="width:25%;color:#27ae60;font-weight:bold">${ok}í­ëª©</td>
      </tr>
      <tr>
        <th>ë¶ì í©</th><td style="color:#c0392b;font-weight:bold">${nc}í­ëª©</td>
        <th>ì í©ë¥ </th><td style="font-weight:bold">${Math.round(ok/ITEMS.length*100)}%</td>
      </tr>
    </table>
  `
  openPrint(pageWrapper('AUD-CL-001', 'ISO 13485 ë´ë¶ê°ì¬ ì²´í¬ë¦¬ì¤í¸', 'ISO 13485 Â§8.2.2', body))
}

// ââ íì§ì±ìì(ì ì¡°ê´ë¦¬ì) ìëªì¥ ââââââââââââââââââââââââââââ
// #19 â ì¹ì¸ ì ìê²©ì¦Â·ìëªì¥ íì¼ì ìë ì²¨ë¶íëë¡ ìêµ¬íë ëì ,
// ì§ì  ì ë³´(ì±ëªÂ·ì§ìÂ·ì§ì ì¼)ì ì¹ì¸ ì ë³´ë¥¼ ë°íì¼ë¡ ìëªì¥ì ì¦ì ìë ìì±í´ ì¶ë ¥íë¤.
export function printQmAppointmentLetter(qm) {
  const company = getCompanyName()
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>ìëªì¥ â ${company}</title>
<style>
  @page { size: A4; margin: 30mm 26mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Malgun Gothic', 'Noto Sans KR', Arial, sans-serif; color: #1a1a1a; }
  .frame { border: 3px double #1a3a2a; padding: 48px 40px; min-height: 680px; position: relative; }
  .letter-title { text-align: center; font-size: 30pt; font-weight: 800; letter-spacing: 0.3em; color: #1a3a2a; margin-bottom: 44px; }
  .letter-body { font-size: 13pt; line-height: 2.1; text-align: center; margin-bottom: 56px; }
  .letter-name { font-size: 17pt; font-weight: 800; }
  .letter-role { font-size: 13pt; font-weight: 600; margin: 18px 0 0; }
  .letter-desc { font-size: 11.5pt; color: #444; line-height: 1.9; margin-top: 28px; }
  .letter-basis { font-size: 9.5pt; color: #777; margin-top: 10px; }
  .letter-footer { text-align: center; margin-top: 60px; }
  .letter-date { font-size: 12pt; margin-bottom: 26px; }
  .letter-company { font-size: 15pt; font-weight: 800; color: #1a3a2a; letter-spacing: 0.08em; }
  .letter-ceo { font-size: 12.5pt; margin-top: 10px; }
  .stamp-hint { font-size: 9pt; color: #aaa; margin-top: 6px; }
</style>
</head>
<body>
<div class="frame">
  <div class="letter-title">ì&nbsp;&nbsp;ëª&nbsp;&nbsp;ì¥</div>
  <div class="letter-body">
    <div class="letter-name">${qm.name || '-'}</div>
    <div class="letter-role">${qm.title ? qm.title + ' Â· ' : ''}íì§ì±ìì(ì ì¡°ê´ë¦¬ì)</div>
    <div class="letter-desc">
      ì ì¬ëì ãìë£ê¸°ê¸°ë²ã ë° ISO 13485:2016 Â§5.5.2ì ë°ë¼<br>
      ì°ë¦¬ íì¬ì íì§ì±ìì(ì ì¡°ê´ë¦¬ì)ë¡ ìëªí©ëë¤.
    </div>
    <div class="letter-basis">ì§ì ì¼: ${qm.appointedDate || '-'} Â· ì¹ì¸ì¼: ${qm.approvedAt ? new Date(qm.approvedAt).toLocaleDateString('ko-KR') : '-'}</div>
  </div>
  <div class="letter-footer">
    <div class="letter-date">${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    <div class="letter-company">${company}</div>
    <div class="letter-ceo">ëíì´ì¬ ${qm.approvedBy || ''} (ì¸)</div>
    <div class="stamp-hint">ë³¸ ìëªì¥ì Qualytree QMSìì ì¹ì¸ ì ë³´ì ë°ë¼ ìë ìì±ëììµëë¤.</div>
  </div>
</div>
<script>window.onload=()=>{setTimeout(()=>{window.print()},300)}<\/script>
</body>
</html>`
  openPrint(html)
}

// ââ íë¦°í¸ ì°½ ì´ê¸° ââââââââââââââââââââââââââââââââââââââââââââ
function openPrint(html) {
  const w = window.open('', '_blank', 'width=860,height=1000,scrollbars=yes')
  if (!w) { alert('íìì´ ì°¨ë¨ëììµëë¤. íì íì© í ë¤ì ìëíì¸ì.'); return }
  w.document.write(html)
  w.document.close()
}

// ââ ì¶í ì  ë³´ì¡´ìí ì ê² ì±ì ì âââââââââââââââââââââââââââââ
export function printPreservationCheckCert(chk) {
  const vm = { pass: ['badge-green', 'ì í©'], fail: ['badge-red', 'ë¶ì í©'], pending: ['badge-orange', 'ì ê² ì¤'] }
  const [cls, label] = vm[chk.verdict] || ['badge-gray', chk.verdict || '-']
  const verdictBadge = `<span class="badge ${cls}">${label}</span>`
  const items = (chk.checkItems || []).map(i => {
    const r = i.result === 'pass' ? 'ì í©' : i.result === 'fail' ? 'ë¶ì í©' : 'ë¯¸íì '
    return `<tr><td>${i.name}</td><td>${r}</td></tr>`
  }).join('')
  const body = `
    <div class="qt-subtitle">ì¶í ì  ë³´ì¡´ìí ì ê² ì±ì ì (Pre-shipment Preservation Check Certificate)</div>
    <div class="section-title">1. ê¸°ë³¸ ì ë³´</div>
    <table>
      <tr><th>ê¸°ë¡ ID</th><td>${chk.id || '-'}</td><th>ì ê²ì¼</th><td>${chk.checkedDate || '-'}</td></tr>
      <tr><th>ì íëª</th><td>${chk.productName || '-'}</td><th>LOT ë²í¸</th><td>${chk.lotNo || '-'}</td></tr>
      <tr><th>ì¶í ìë</th><td>${chk.qty || '-'}</td><th>ì¶íì² ê³ ê°</th><td>${chk.destinationCustomer || '-'}</td></tr>
      <tr><th>ì ê²ì</th><td>${chk.checkedBy || '-'}</td><th>ì°ê²° ì¶ì ì± ID</th><td>${chk.linkedDistId || '(ìì)'}</td></tr>
      <tr><th>ì¢í© íì </th><td colspan="3">${verdictBadge}</td></tr>
    </table>

    <div class="section-title">2. ì ê² í­ëª©</div>
    <table>
      <tr><th>í­ëª©</th><th>ê²°ê³¼</th></tr>
      ${items || '<tr><td colspan="2">(ìì)</td></tr>'}
    </table>

    <div class="section-title">3. ë¹ê³ </div>
    <div class="text-area-box" style="min-height:60px;">${chk.notes || '(ìì)'}</div>
  `
  openPrint(pageWrapper(chk.id || 'PCK-XXXX', 'ì¶í ì  ë³´ì¡´ìí ì ê² ì±ì ì', 'ISO 13485 Â§7.5.11', body))
}

// ââ ì¼ê´ ì¶ë ¥ (ì¬ë¬ ë ì½ëë¥¼ í PDFì) âââââââââââââââââââââââ
export function printBatch(records) {
  // ê° ë ì½ëë¥¼ êµ¬ë¶ì ì¼ë¡ ì´ì´ ë¶ì¬ ì¶ë ¥
  const pages = records.map((r, i) => {
    const div = i < records.length - 1 ? '<div class="page-break"></div>' : ''
    return `<div>${r}</div>${div}`
  }).join('')
  const company = getCompanyName()
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>QMS ì¼ê´ ì¶ë ¥ â ${company}</title>
<style>${BASE_CSS}</style>
</head>
<body>${pages}<script>window.onload=()=>{setTimeout(()=>{window.print()},400)}<\/script></body>
</html>`
  openPrint(html)
}
