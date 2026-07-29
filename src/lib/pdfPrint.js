// src/lib/pdfPrint.js
// ISO 13485 QMS 문서 출력 유틸리티 — 브라우저 프린트 기반 PDF 생성
import { auth } from './auth'

// ── 공통 스타일 ───────────────────────────────────────────────
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

function getCompanyName() {
  return auth.current()?.company?.name || 'Qualytree'
}

function nowStr() {
  return new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function pageWrapper(docNo, title, isoClause, bodyHtml) {
  const company = getCompanyName()
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${title} — ${company}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<div class="qt-header">
  <div>
    <div class="qt-company">${company}</div>
    <div style="font-size:8.5pt;color:#666;margin-top:3px;">ISO 13485:2016 품질경영시스템</div>
  </div>
  <div class="qt-doc-info">
    문서번호: ${docNo}<br>
    출력일시: ${nowStr()}<br>
    ISO 조항: ${isoClause}<br>
    출력자: ${auth.current()?.name || '-'}
  </div>
</div>
<div class="qt-title">${title}</div>
${bodyHtml}
<div class="signature-area">
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">작성자</div></div>
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">검토자</div></div>
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">승인자</div></div>
</div>
<div class="footer">
  <span>${company} · 품질경영시스템 (QMS)</span>
  <span>문서번호: ${docNo} · ${nowStr()} 출력</span>
</div>
<div class="watermark-text">이 문서는 Qualytree QMS에서 자동 생성된 기록입니다.</div>
<script>window.onload=()=>{setTimeout(()=>{window.print()},300)}<\/script>
</body>
</html>`
}

// ── 심각도 배지 ───────────────────────────────────────────────
function severityBadge(sev) {
  if (!sev) return '<span class="badge badge-gray">-</span>'
  const map = { critical: ['badge-red', '치명'], major: ['badge-red', '중요'], minor: ['badge-orange', '경미'], low: ['badge-gray', '낮음'] }
  const [cls, label] = map[sev] || ['badge-gray', sev]
  return `<span class="badge ${cls}">${label}</span>`
}

function statusBadge(st) {
  if (!st) return '<span class="badge badge-gray">-</span>'
  const map = {
    open: ['badge-red', '미결'], under_review: ['badge-orange', '검토 중'], correcting: ['badge-orange', '조치 중'],
    closed: ['badge-green', '종결'], verified: ['badge-green', '검증완료'],
    pending: ['badge-gray', '대기'], in_progress: ['badge-orange', '진행 중'], done: ['badge-green', '완료'],
    planned: ['badge-gray', '계획'], completed: ['badge-orange', '완료(CAR대기)'],
  }
  const [cls, label] = map[st] || ['badge-gray', st]
  return `<span class="badge ${cls}">${label}</span>`
}

// ── NCR 보고서 ────────────────────────────────────────────────
export function printNCR(ncr) {
  const body = `
    <div class="qt-subtitle">부적합 보고서 (Non-Conformance Report)</div>
    <div class="section-title">1. 기본 정보</div>
    <table>
      <tr><th>NCR 번호</th><td>${ncr.id || '-'}</td><th>발생일</th><td>${ncr.detectedAt?.slice(0,10) || '-'}</td></tr>
      <tr><th>심각도</th><td>${severityBadge(ncr.severity)}</td><th>상태</th><td>${statusBadge(ncr.status)}</td></tr>
      <tr><th>발생 부서</th><td>${ncr.department || '-'}</td><th>발생 유형</th><td>${ncr.source || '-'}</td></tr>
      <tr><th>등록자</th><td colspan="3">${ncr.reportedBy || '-'}</td></tr>
    </table>

    <div class="section-title">2. 부적합 내용</div>
    <div style="margin-bottom:6px;font-size:9pt;color:#555;">제목</div>
    <div class="text-area-box" style="margin-bottom:12px;">${ncr.title || '-'}</div>
    <div style="margin-bottom:6px;font-size:9pt;color:#555;">상세 내용</div>
    <div class="text-area-box">${ncr.description || ncr.detail || '(내용 없음)'}</div>

    <div class="section-title">3. 원인 분석</div>
    <div class="text-area-box" style="min-height:80px;">${ncr.rootCause || '(미입력)'}</div>

    <div class="section-title">4. 즉각 조치 사항</div>
    <div class="text-area-box">${ncr.immediateAction || '(미입력)'}</div>

    <div class="section-title">5. 관련 ISO 조항</div>
    <table>
      <tr><th>ISO 13485 조항</th><td>${ncr.isoClause || '-'}</td></tr>
      <tr><th>관련 제품/공정</th><td>${ncr.product || ncr.process || '-'}</td></tr>
      <tr><th>연결된 CAPA</th><td>${ncr.capaId || '(미연결)'}</td></tr>
    </table>
  `
  openPrint(pageWrapper(ncr.id || 'NCR-XXXX', '부적합 보고서', 'ISO 13485 §8.3', body))
}

// ── CAPA 기록 ─────────────────────────────────────────────────
export function printCAPA(capa) {
  const body = `
    <div class="qt-subtitle">시정 및 예방조치 기록 (Corrective and Preventive Action)</div>
    <div class="section-title">1. 기본 정보</div>
    <table>
      <tr><th>CAPA 번호</th><td>${capa.id || '-'}</td><th>발행일</th><td>${capa.createdAt?.slice(0,10) || '-'}</td></tr>
      <tr><th>유형</th><td>${capa.type === 'corrective' ? '시정조치 (CA)' : capa.type === 'preventive' ? '예방조치 (PA)' : capa.type || '-'}</td><th>상태</th><td>${statusBadge(capa.status)}</td></tr>
      <tr><th>담당자</th><td>${capa.assignee || '-'}</td><th>완료 목표일</th><td>${capa.targetDate || '-'}</td></tr>
      <tr><th>관련 NCR</th><td colspan="3">${capa.ncrId || '(해당없음)'}</td></tr>
    </table>

    <div class="section-title">2. CAPA 제목 및 배경</div>
    <div class="text-area-box" style="margin-bottom:10px;font-weight:bold;">${capa.title || '-'}</div>
    <div class="text-area-box">${capa.background || capa.description || '(미입력)'}</div>

    <div class="section-title">3. 근본 원인 분석</div>
    <div class="text-area-box" style="min-height:80px;">${capa.rootCause || '(미입력)'}</div>

    <div class="section-title">4. 조치 계획</div>
    <div class="text-area-box">${capa.actionPlan || '(미입력)'}</div>

    <div class="section-title">5. 조치 결과 및 효과 검증</div>
    <table>
      <tr><th>조치 완료일</th><td>${capa.completedAt?.slice(0,10) || '(미완료)'}</td></tr>
      <tr><th>효과 검증 방법</th><td>${capa.verificationMethod || '(미입력)'}</td></tr>
      <tr><th>효과 검증 결과</th><td>${capa.verificationResult || '(미입력)'}</td></tr>
    </table>
  `
  openPrint(pageWrapper(capa.id || 'CAPA-XXXX', '시정 및 예방조치 기록', 'ISO 13485 §8.5.2 / §8.5.3', body))
}

// ── 내부감사 보고서 ───────────────────────────────────────────
export function printAudit(audit, cars = []) {
  const relatedCars = cars.filter(c => c.auditId === audit.id)
  const carsHtml = relatedCars.length === 0
    ? '<div style="color:#999;padding:8px;font-size:9pt;">발행된 CAR 없음</div>'
    : relatedCars.map((car, i) => `
      <tr>
        <td>${i+1}</td>
        <td>${car.id}</td>
        <td>${car.severity === 'major' ? '중요' : car.severity === 'minor' ? '경미' : '관찰'}</td>
        <td style="max-width:200px">${car.finding || '-'}</td>
        <td>${car.assignee || '-'}</td>
        <td>${car.dueDate || '-'}</td>
        <td>${statusBadge(car.status)}</td>
      </tr>`).join('')

  const body = `
    <div class="qt-subtitle">내부감사 보고서 (Internal Audit Report)</div>
    <div class="section-title">1. 감사 개요</div>
    <table>
      <tr><th>감사 번호</th><td>${audit.id || '-'}</td><th>감사일</th><td>${audit.auditDate || '-'}</td></tr>
      <tr><th>감사 유형</th><td>${audit.type === 'internal' ? '내부감사' : audit.type === 'supplier' ? '공급업체 감사' : audit.type || '-'}</td><th>상태</th><td>${statusBadge(audit.status)}</td></tr>
      <tr><th>감사 기준</th><td>${audit.standard || 'ISO 13485:2016'}</td><th>감사원</th><td>${audit.auditor || '-'}</td></tr>
      <tr><th>피감사 부서</th><td>${audit.auditee || '-'}</td><th>감사 범위</th><td>${audit.scope || '-'}</td></tr>
    </table>

    <div class="section-title">2. 감사 제목</div>
    <div class="text-area-box" style="font-weight:bold;">${audit.title || '-'}</div>

    <div class="section-title">3. 감사 결과 요약</div>
    <table>
      <tr>
        <th style="width:30px">No.</th>
        <th style="width:90px">구분</th>
        <th style="width:70px">심각도</th>
        <th>내용</th>
        <th style="width:60px">담당자</th>
        <th style="width:70px">목표일</th>
        <th style="width:70px">상태</th>
      </tr>
      ${carsHtml}
    </table>

    <div class="section-title">4. 종합 의견</div>
    <div class="text-area-box" style="min-height:80px;">${audit.conclusion || audit.notes || '(미입력)'}</div>

    <div class="section-title">5. 후속 조치 요약</div>
    <table>
      <tr><th>총 CAR 발행</th><td>${relatedCars.length}건</td><th>미결 CAR</th><td>${relatedCars.filter(c => c.status === 'open').length}건</td></tr>
      <tr><th>감사 종결 목표일</th><td colspan="3">${audit.closureDate || '(미정)'}</td></tr>
    </table>
  `
  openPrint(pageWrapper(audit.id || 'AUD-XXXX', '내부감사 보고서', 'ISO 13485 §8.2.2', body))
}

// ── CAR (시정조치 요청서) ─────────────────────────────────────
export function printCAR(car) {
  const body = `
    <div class="qt-subtitle">시정조치 요청서 (Corrective Action Request)</div>
    <div class="section-title">1. 기본 정보</div>
    <table>
      <tr><th>CAR 번호</th><td>${car.id || '-'}</td><th>발행일</th><td>${car.createdAt?.slice(0,10) || '-'}</td></tr>
      <tr><th>관련 감사</th><td>${car.auditId || '-'}</td><th>상태</th><td>${statusBadge(car.status)}</td></tr>
      <tr><th>심각도</th><td>${severityBadge(car.severity)}</td><th>관련 요건</th><td>${car.requirement || '-'}</td></tr>
      <tr><th>담당자</th><td>${car.assignee || '-'}</td><th>완료 목표일</th><td>${car.dueDate || '-'}</td></tr>
    </table>

    <div class="section-title">2. 부적합 / 관찰 사항</div>
    <div class="text-area-box">${car.finding || '-'}</div>

    <div class="section-title">3. 시정조치 계획</div>
    <div class="text-area-box" style="min-height:80px;">${car.actionPlan || '(미입력)'}</div>

    <div class="section-title">4. 시정조치 결과</div>
    <table>
      <tr><th>조치 완료일</th><td>${car.completedAt?.slice(0,10) || '(미완료)'}</td></tr>
      <tr><th>조치 내용</th><td>${car.actionTaken || '(미입력)'}</td></tr>
      <tr><th>검증 결과</th><td>${car.verificationResult || '(미입력)'}</td></tr>
    </table>
  `
  openPrint(pageWrapper(car.id || 'CAR-XXXX', '시정조치 요청서', 'ISO 13485 §8.2.2 / §8.5.2', body))
}

// ── 개선활동 보고서 ───────────────────────────────────────────
export function printImprovement(imp) {
  const typeMap = { process:'프로세스 개선', quality:'품질 개선', safety:'안전 개선', cost:'비용 절감', delivery:'납기 개선', morale:'업무 환경', preventive:'예방 조치' }
  const body = `
    <div class="qt-subtitle">개선활동 보고서 (Improvement Activity Report)</div>
    <div class="section-title">1. 기본 정보</div>
    <table>
      <tr><th>과제 번호</th><td>${imp.id || '-'}</td><th>등록일</th><td>${imp.createdAt?.slice(0,10) || '-'}</td></tr>
      <tr><th>개선 유형</th><td>${typeMap[imp.type] || imp.type || '-'}</td><th>상태</th><td>${statusBadge(imp.status)}</td></tr>
      <tr><th>우선순위</th><td>${imp.priority === 'high' ? '높음' : imp.priority === 'medium' ? '보통' : '낮음'}</td><th>담당자</th><td>${imp.assignee || '-'}</td></tr>
      <tr><th>관련 부서</th><td>${imp.dept || '-'}</td><th>완료 목표일</th><td>${imp.dueDate || '-'}</td></tr>
    </table>

    <div class="section-title">2. 과제명 및 배경</div>
    <div class="text-area-box" style="margin-bottom:10px;font-weight:bold;">${imp.title || '-'}</div>
    <div class="text-area-box">${imp.description || '(미입력)'}</div>

    <div class="section-title">3. 기대 효과</div>
    <div class="text-area-box">${imp.expectedEffect || '(미입력)'}</div>

    <div class="section-title">4. 실행 결과 및 효과 검증</div>
    <table>
      <tr><th>완료일</th><td>${imp.completedAt?.slice(0,10) || '(미완료)'}</td></tr>
      <tr><th>실제 효과</th><td>${imp.actualEffect || '(미입력)'}</td></tr>
    </table>
  `
  openPrint(pageWrapper(imp.id || 'IMP-XXXX', '개선활동 보고서', 'ISO 13485 §8.5.1', body))
}

// ── 작업지시 기록 ─────────────────────────────────────────────
export function printWorkOrder(wo) {
  const stages = wo.stages || []
  const stagesHtml = stages.length === 0
    ? '<tr><td colspan="4" style="color:#999;text-align:center;">공정 단계 없음</td></tr>'
    : stages.map((s, i) => `
      <tr>
        <td style="text-align:center">${i+1}</td>
        <td>${s.name || s.stageId || '-'}</td>
        <td style="text-align:center">${s.status === 'completed' ? '✓ 완료' : s.status === 'in_progress' ? '▶ 진행' : '○ 대기'}</td>
        <td>${s.completedAt?.slice(0,10) || '-'}</td>
      </tr>`).join('')

  const body = `
    <div class="qt-subtitle">작업지시서 / 전자배치기록 (Work Order / eBatch Record)</div>
    <div class="section-title">1. 작업지시 기본 정보</div>
    <table>
      <tr><th>WO 번호</th><td>${wo.woId || wo.id || '-'}</td><th>발행일</th><td>${wo.issuedAt?.slice(0,10) || wo.createdAt?.slice(0,10) || '-'}</td></tr>
      <tr><th>제품명</th><td>${wo.productName || '-'}</td><th>제품 모델</th><td>${wo.productModel || '-'}</td></tr>
      <tr><th>로트 번호</th><td>${wo.lotNumber || '-'}</td><th>생산 수량</th><td>${wo.quantity || '-'}</td></tr>
      <tr><th>우선순위</th><td>${wo.priority === 'urgent' ? '⚡ 긴급' : '일반'}</td><th>상태</th><td>${statusBadge(wo.status)}</td></tr>
      <tr><th>납기 목표일</th><td colspan="3">${wo.dueDate || '-'}</td></tr>
    </table>

    <div class="section-title">2. 공정 단계 진행 현황</div>
    <table>
      <tr><th style="width:40px">순서</th><th>공정명</th><th style="width:80px">상태</th><th style="width:90px">완료일</th></tr>
      ${stagesHtml}
    </table>

    <div class="section-title">3. 특기 사항</div>
    <div class="text-area-box" style="min-height:60px;">${wo.notes || wo.remark || '(없음)'}</div>
  `
  openPrint(pageWrapper(wo.woId || 'WO-XXXX', '작업지시서 / 전자배치기록', 'ISO 13485 §7.5', body))
}

// ── 공정검사성적서 (IPC Inspection Certificate) ─────────────────
export function printInspectionCert(insp, wo) {
  const resultBadge = (r) => {
    const map = { '합격': ['badge-green', '합격'], '조건부': ['badge-orange', '조건부합격'], '조건부합격': ['badge-orange', '조건부합격'], '불합격': ['badge-red', '불합격'], '검사중': ['badge-gray', '검사중'] }
    const [cls, label] = map[r] || ['badge-gray', r || '-']
    return `<span class="badge ${cls}">${label}</span>`
  }
  const body = `
    <div class="qt-subtitle">공정검사성적서 (In-Process Inspection Certificate)</div>
    <div class="section-title">1. 검사 기본 정보</div>
    <table>
      <tr><th>검사 ID</th><td>${insp.id || '-'}</td><th>검사일</th><td>${insp.date?.slice(0,10) || insp.date || '-'}</td></tr>
      <tr><th>작업지시(WO)</th><td>${insp.wo || '-'}</td><th>제품명</th><td>${wo?.product || '-'}</td></tr>
      <tr><th>검사 단계</th><td colspan="3">${insp.step || '-'}</td></tr>
      <tr><th>검사자</th><td>${insp.inspector || '-'}</td><th>결과</th><td>${resultBadge(insp.status || insp.result)}</td></tr>
    </table>

    <div class="section-title">2. 검사 규격 및 측정 결과</div>
    <table>
      <tr><th>검사 규격(기준)</th><td colspan="3">${insp.spec || '(없음)'}</td></tr>
      <tr><th>실측값</th><td colspan="3">${insp.measured || '(없음)'}</td></tr>
    </table>

    <div class="section-title">3. 첨부 자료</div>
    <div class="text-area-box" style="min-height:40px;">${insp.fileName ? `첨부: ${insp.fileName}` : '(첨부 없음)'}</div>

    <div class="section-title">4. 비고</div>
    <div class="text-area-box" style="min-height:60px;">${insp.note || '(없음)'}</div>
  `
  openPrint(pageWrapper(insp.id || 'IPC-XXXX', '공정검사성적서', 'ISO 13485 §8.2.6', body))
}

// ── 청결·오염 모니터링 성적서 ───────────────────────────────
export function printCleanlinessCert(rec, spec) {
  const resultMap = { pass: ['badge-green', '합격'], fail: ['badge-red', '불합격'], conditional: ['badge-orange', '조건부합격'] }
  const [cls, label] = resultMap[rec.result] || ['badge-gray', rec.result || '-']
  const resultBadge = `<span class="badge ${cls}">${label}</span>`
  const body = `
    <div class="qt-subtitle">청결·오염 모니터링 성적서 (Cleanliness Monitoring Certificate)</div>
    <div class="section-title">1. 기본 정보</div>
    <table>
      <tr><th>기록 ID</th><td>${rec.id || '-'}</td><th>일자</th><td>${rec.date || '-'}</td></tr>
      <tr><th>제품/사양</th><td>${(spec && spec.productName) || '-'}</td><th>로트 번호</th><td>${rec.lotNo || '-'}</td></tr>
      <tr><th>결과</th><td colspan="3">${resultBadge}</td></tr>
    </table>

    <div class="section-title">2. 측정 결과</div>
    <table>
      <tr><th>미립자 측정값</th><td>${rec.particleResult || '(없음)'}</td><th>미생물 측정값</th><td>${rec.microbialResult || '(없음)'}</td></tr>
      <tr><th>온도</th><td>${rec.temperature ? rec.temperature + ' ℃' : '(없음)'}</td><th>습도</th><td>${rec.humidity ? rec.humidity + ' %RH' : '(없음)'}</td></tr>
      <tr><th>차압</th><td colspan="3">${rec.pressureDiff ? rec.pressureDiff + ' Pa' : '(없음)'}</td></tr>
    </table>

    <div class="section-title">3. 비고</div>
    <div class="text-area-box" style="min-height:60px;">${rec.notes || '(없음)'}</div>
  `
  openPrint(pageWrapper(rec.id || 'CLN-XXXX', '청결·오염 모니터링 성적서', 'ISO 13485 §7.5.2', body))
}

// ── 멸균 배치 성적서 ─────────────────────────────────────────
export function printSterileBatchCert(batch, spec) {
  const resultMap = { pass: ['badge-green', '합격'], fail: ['badge-red', '불합격'], conditional: ['badge-orange', '조건부합격'] }
  const [cls, label] = resultMap[batch.result] || ['badge-gray', batch.result || '-']
  const resultBadge = `<span class="badge ${cls}">${label}</span>`
  const body = `
    <div class="qt-subtitle">멸균 배치 성적서 (Sterilization Batch Certificate)</div>
    <div class="section-title">1. 배치 기본 정보</div>
    <table>
      <tr><th>배치/로트 번호</th><td>${batch.batchNo || '-'}</td><th>멸균 일자</th><td>${batch.date || '-'}</td></tr>
      <tr><th>제품명</th><td>${batch.productName || '-'}</td><th>생산 로트</th><td>${batch.lotNo || '-'}</td></tr>
      <tr><th>멸균 방법</th><td>${batch.sterileMethod || '-'}</td><th>연결된 사양</th><td>${spec ? (spec.productName + ' (SAL ' + spec.salTarget + ')') : '(직접 입력)'}</td></tr>
      <tr><th>합/불 판정</th><td colspan="3">${resultBadge}</td></tr>
    </table>

    <div class="section-title">2. 실측 사이클 파라미터</div>
    <table>
      <tr><th>온도</th><td>${batch.actualTemp ? batch.actualTemp + ' ℃' : '(없음)'}</td><th>시간</th><td>${batch.actualTime ? batch.actualTime + ' 분' : '(없음)'}</td></tr>
      <tr><th>압력</th><td>${batch.actualPressure ? batch.actualPressure + ' bar' : '(없음)'}</td><th>선량</th><td>${batch.actualDose || '(없음)'}</td></tr>
    </table>

    <div class="section-title">3. 멸균 검증 결과</div>
    <table>
      <tr><th>바이오버든 결과</th><td>${batch.bioburdenResult ? batch.bioburdenResult + ' CFU/개' : '(없음)'}</td><th>달성 SAL</th><td>${batch.salAchieved || '(없음)'}</td></tr>
    </table>

    <div class="section-title">4. 비고</div>
    <div class="text-area-box" style="min-height:60px;">${batch.notes || '(없음)'}</div>
  `
  openPrint(pageWrapper(batch.batchNo || 'SB-XXXX', '멸균 배치 성적서', 'ISO 13485 §7.5.7', body))
}

// ── 리콜 통보 대상 고객 목록 (리콜 시뮬레이션) ───────────────────
export function printRecallNotice({ lot, recallClass, reason, hits = [] }) {
  const classMap = { I: 'Class I — 즉시 리콜', II: 'Class II — 신속 리콜', III: 'Class III — 일반 리콜' }
  const totalQty = hits.reduce((s, h) => s + (parseInt(h.qty) || 0), 0)
  const rowsHtml = hits.length === 0
    ? '<tr><td colspan="5" style="color:#999;text-align:center;">통보 대상 고객 없음</td></tr>'
    : hits.map((h, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${h.customerName || '-'}</td>
        <td>${h.customerContact || '-'}</td>
        <td>${h.customerAddress || '-'}</td>
        <td style="text-align:right">${h.qty || '-'}</td>
      </tr>`).join('')

  const body = `
    <div class="qt-subtitle">리콜 통보 대상 고객 목록 (Recall Notification List)</div>
    <div class="section-title">1. 리콜 개요</div>
    <table>
      <tr><th>대상 LOT</th><td>${lot || '-'}</td><th>리콜 등급</th><td>${classMap[recallClass] || recallClass || '-'}</td></tr>
      <tr><th>통보 대상 고객 수</th><td>${hits.length}건</td><th>총 회수 수량</th><td>${totalQty}</td></tr>
      <tr><th>리콜 사유</th><td colspan="3">${reason || '(미입력)'}</td></tr>
    </table>

    <div class="section-title">2. 통보 대상 고객 목록</div>
    <table>
      <tr><th style="width:40px">번호</th><th>고객명</th><th>연락처</th><th>주소</th><th style="width:80px">수량</th></tr>
      ${rowsHtml}
    </table>

    <div class="section-title">3. 조치 사항</div>
    <div class="text-area-box" style="min-height:60px;">상기 고객에게 리콜 통보를 발송하고, 회수 완료 여부를 추적 관리한다. 필요 시 규제당국(식약처 등)에 보고한다.</div>
  `
  openPrint(pageWrapper(`RCL-${lot || 'XXXX'}`, '리콜 통보 대상 고객 목록', 'ISO 13485 §8.3 / §7.5.9', body))
}

// ── 감사 체크리스트 ───────────────────────────────────────────
export function printAuditChecklist(checks = {}) {
  const ITEMS = [
    { iso: '4.1', item: '품질경영시스템 일반 요건' },
    { iso: '4.2', item: '문서화 요건 (매뉴얼·절차·기록)' },
    { iso: '5.1', item: '경영진 책임 및 의지' },
    { iso: '5.4', item: '품질목표 및 계획' },
    { iso: '6.2', item: '인적 자원 (교육·역량)' },
    { iso: '6.3', item: '기반구조 (설비·환경)' },
    { iso: '7.2', item: '고객 관련 프로세스' },
    { iso: '7.3', item: '설계 및 개발' },
    { iso: '7.4', item: '구매 (공급업체 관리)' },
    { iso: '7.5', item: '생산 및 서비스 제공' },
    { iso: '7.6', item: '모니터링 및 측정장치 관리' },
    { iso: '8.2.1', item: '고객만족 모니터링' },
    { iso: '8.2.4', item: '제품 모니터링 및 측정' },
    { iso: '8.3', item: '부적합 제품 관리' },
    { iso: '8.4', item: '데이터 분석' },
    { iso: '8.5', item: '개선 (CAPA)' },
  ]

  const rowsHtml = ITEMS.map(it => {
    const val = checks[it.iso] || 'pending'
    const mark = val === 'ok' ? '✓ 적합' : val === 'nc' ? '✗ 부적합' : val === 'na' ? 'N/A' : '○ 미확인'
    const color = val === 'ok' ? '#27ae60' : val === 'nc' ? '#c0392b' : '#888'
    return `<tr>
      <td style="text-align:center;font-family:monospace;font-weight:bold;">§${it.iso}</td>
      <td>${it.item}</td>
      <td style="text-align:center;color:${color};font-weight:bold;">${mark}</td>
      <td style="min-width:160px;color:#999;font-size:8pt;">&nbsp;</td>
    </tr>`
  }).join('')

  const ok = ITEMS.filter(it => checks[it.iso] === 'ok').length
  const nc = ITEMS.filter(it => checks[it.iso] === 'nc').length

  const body = `
    <div class="qt-subtitle">ISO 13485:2016 내부감사 체크리스트</div>
    <table style="margin-bottom:16px">
      <tr><th>감사일</th><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><th>감사원</th><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td></tr>
      <tr><th>피감사 부서</th><td>&nbsp;</td><th>감사 번호</th><td>&nbsp;</td></tr>
    </table>
    <table>
      <tr>
        <th style="width:55px">ISO 조항</th>
        <th>심사 항목</th>
        <th style="width:80px">결과</th>
        <th style="width:160px">비고 / 부적합 내용</th>
      </tr>
      ${rowsHtml}
    </table>
    <div class="section-title">결과 요약</div>
    <table>
      <tr>
        <th style="width:25%">총 심사 항목</th><td style="width:25%">${ITEMS.length}항목</td>
        <th style="width:25%">적합</th><td style="width:25%;color:#27ae60;font-weight:bold">${ok}항목</td>
      </tr>
      <tr>
        <th>부적합</th><td style="color:#c0392b;font-weight:bold">${nc}항목</td>
        <th>적합률</th><td style="font-weight:bold">${Math.round(ok/ITEMS.length*100)}%</td>
      </tr>
    </table>
  `
  openPrint(pageWrapper('AUD-CL-001', 'ISO 13485 내부감사 체크리스트', 'ISO 13485 §8.2.2', body))
}

// ── 프린트 창 열기 ────────────────────────────────────────────
function openPrint(html) {
  const w = window.open('', '_blank', 'width=860,height=1000,scrollbars=yes')
  if (!w) { alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.'); return }
  w.document.write(html)
  w.document.close()
}

// ── 일괄 출력 (여러 레코드를 한 PDF에) ───────────────────────
export function printBatch(records) {
  // 각 레코드를 구분선으로 이어 붙여 출력
  const pages = records.map((r, i) => {
    const div = i < records.length - 1 ? '<div class="page-break"></div>' : ''
    return `<div>${r}</div>${div}`
  }).join('')
  const company = getCompanyName()
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>QMS 일괄 출력 — ${company}</title>
<style>${BASE_CSS}</style>
</head>
<body>${pages}<script>window.onload=()=>{setTimeout(()=>{window.print()},400)}<\/script></body>
</html>`
  openPrint(html)
}
