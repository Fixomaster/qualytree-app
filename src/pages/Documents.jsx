import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { auth } from '../lib/auth'
import { FileText, ClipboardCheck, BookOpen, ChevronDown, ChevronRight, Check, Info, Sparkles, Languages, Download, Upload, Trash2, Send } from 'lucide-react'
import { translateToEn } from '../lib/translate'
import { loadOrgChartImage } from '../lib/orgChartImage'

const OB_KEY = 'qualytree.onboarding'
const DOC_KEY = 'qualytree.documents'
const KGMP = '식약처 고시 「의료기기 제조 및 품질관리 기준」(별표2, 최신 개정본 확인)'

const GLOSSARY = [
  { t: '품질매뉴얼', en: 'Quality Manual', d: '품질경영시스템의 최상위 문서. 적용범위·제외사유·문서구조·프로세스 상호작용을 담습니다. (ISO 13485 §4.2.2)' },
  { t: '절차서', en: 'Procedure / SOP', d: '특정 업무를 누가·언제·어떻게 수행하는지 단계별로 정한 문서. 매뉴얼보다 구체적입니다.' },
  { t: 'SOP', en: 'Standard Operating Procedure', d: '표준작업절차. 절차서의 영문 표현으로, 반복 업무의 표준 방법을 글로 고정한 것입니다.' },
  { t: '부적합 (NC)', en: 'Nonconformance', d: '제품·공정·시스템이 정해진 요구사항(규격·절차)을 만족하지 못한 상태.' },
  { t: 'NCR', en: 'Nonconformance Report', d: '부적합 보고서. 무엇이·왜 벗어났는지 기록하고 처리(폐기·재작업·특채)를 결정하는 문서. (ISO 13485 §8.3)' },
  { t: 'CAPA', en: 'Corrective & Preventive Action', d: '시정 및 예방 조치. 근본원인을 찾아 재발을 막고(시정·§8.5.2) 비슷한 문제를 미리 막는(예방·§8.5.3) 활동.' },
  { t: '시정조치', en: 'Corrective Action', d: '이미 발생한 문제의 원인을 제거해 재발을 막는 조치. (ISO 13485 §8.5.2)' },
  { t: '예방조치', en: 'Preventive Action', d: '발생 가능성이 있는 문제를 사전에 막는 조치. (ISO 13485 §8.5.3)' },
  { t: '격리', en: 'Quarantine', d: '부적합(의심) 제품을 정상품과 분리·보관해 잘못 사용·출고되지 않도록 막아두는 것.' },
  { t: 'KGMP', en: 'Korea GMP', d: '의료기기 제조 및 품질관리 기준(식약처 고시). ISO 13485:2016 구조(§4~§8)를 채택하고 있습니다.' },
]

// ── 한·영 대조 .doc 내보내기 (NB 제출용, 의존성 없음 · Word 호환) ──
function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function bilingualDocHtml(title, sections) {
  const body = sections.map((s) =>
    '<h2 style="font-family:Malgun Gothic,sans-serif;font-size:13pt;color:#16352b">' + escHtml(s.label) + '</h2>' +
    '<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:10pt;table-layout:fixed">' +
    '<tr><th style="width:50%;background:#f1f6f3;text-align:left">한국어</th><th style="width:50%;background:#f1f6f3;text-align:left">English</th></tr>' +
    '<tr><td style="vertical-align:top;white-space:pre-wrap;font-family:Malgun Gothic,sans-serif">' + escHtml(s.ko) + '</td>' +
    '<td style="vertical-align:top;white-space:pre-wrap;font-family:Calibri,sans-serif">' + (s.en ? escHtml(s.en) : '<i style="color:#999">(영문 미생성)</i>') + '</td></tr></table><br/>'
  ).join('')
  return "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>" +
    escHtml(title) + "</title></head><body><h1 style=\"font-family:Malgun Gothic,sans-serif;font-size:16pt;color:#16352b\">" + escHtml(title) + "</h1>" + body + "</body></html>"
}
// .docx 텍스트 추출용 mammoth — CDN 런타임 로드(번들/의존성 불필요)
function loadMammoth() {
  if (window.mammoth) return Promise.resolve(window.mammoth)
  return new Promise((resolve, reject) => {
    const sc = document.createElement('script')
    sc.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js'
    sc.onload = () => resolve(window.mammoth)
    sc.onerror = () => reject(new Error('문서 변환 모듈(mammoth) 로드 실패 — 네트워크를 확인하세요.'))
    document.head.appendChild(sc)
  })
}

function downloadDoc(filename, html) {
  const blob = new Blob(['﻿' + html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ── 정식 KGMP 관리문서 양식 (문서관리 헤더 + 결재란 + 본문, 테두리 포함) ──
function fmtDate(x) { return x || new Date().toISOString().slice(0, 10) }
function docNumber(it, idx) {
  if (it && it.kind === 'manual') return 'QM' + (it.c != null && it.c !== '' ? '-' + it.c : '')
  return 'QP-' + String((idx || 0) + 1).padStart(2, '0')
}
function controlledSection(title, docNo, ctx, r, bodyText, extraHtml) {
  const rev = (r && r.rev) || 0
  const est = fmtDate(r && r.approvedAt)
  const author = (r && r.author) || ''
  const reviewer = (r && r.reviewedBy) || ''
  const approver = (r && r.approvedBy) || ''
  const rdate = (r && r.reviewedAt) || ''
  const adate = (r && r.approvedAt) || ''
  const F = 'font-family:Malgun Gothic,sans-serif'
  return (
    '<table border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;width:100%;' + F + ';font-size:10pt;margin-bottom:4px">' +
    '<tr>' +
    '<td rowspan="3" style="width:22%;text-align:center;font-size:13pt;font-weight:bold;vertical-align:middle">' + escHtml(ctx.name || '(회사명)') + '</td>' +
    '<td rowspan="3" style="width:46%;text-align:center;font-size:14pt;font-weight:bold;vertical-align:middle">' + escHtml(title) + '</td>' +
    '<td style="width:16%;background:#f1f6f3">문서번호</td><td style="width:16%">' + escHtml(docNo) + '</td></tr>' +
    '<tr><td style="background:#f1f6f3">개정번호</td><td>Rev.' + String(rev).padStart(2, '0') + '</td></tr>' +
    '<tr><td style="background:#f1f6f3">제·개정일</td><td>' + escHtml(est) + '</td></tr>' +
    '</table>' +
    '<table border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;width:100%;' + F + ';font-size:10pt;margin-bottom:12px;text-align:center">' +
    '<tr style="background:#f1f6f3"><td style="width:16%">구분</td><td style="width:28%">작성</td><td style="width:28%">검토</td><td style="width:28%">승인</td></tr>' +
    '<tr style="height:44px"><td style="background:#f1f6f3">담당</td><td>' + escHtml(author) + '</td><td>' + escHtml(reviewer) + '</td><td>' + escHtml(approver) + '</td></tr>' +
    '<tr><td style="background:#f1f6f3">일자</td><td>' + (author ? escHtml(est) : '') + '</td><td>' + escHtml(rdate) + '</td><td>' + escHtml(adate) + '</td></tr>' +
    '</table>' +
    (extraHtml || '') +
    '<div style="' + F + ';font-size:10.5pt;white-space:pre-wrap;line-height:1.6">' + escHtml(bodyText || '(내용 미작성)') + '</div>'
  )
}
// 온보딩/회사·조직에서 캡처해 저장한 조직도 이미지를, "조직도" 챕터 문서에 그대로 삽입하기 위한 HTML.
function orgChartImageHtml(it) {
  if (!it || it.kind !== 'manual') return ''
  const isOrgChapter = it.c === '2' || /조직도/.test(it.name || '')
  if (!isOrgChapter) return ''
  const img = loadOrgChartImage()
  if (!img || !img.dataUrl) return ''
  return '<div style="margin:4px 0 14px 0;text-align:center"><img src="' + img.dataUrl + '" style="max-width:100%;border:1px solid #dfe4e8;border-radius:6px" /></div>'
}
function controlledDocHtml(title, docNo, ctx, r, extraHtml) {
  let inner = controlledSection(title, docNo, ctx, r, r && r.content, extraHtml)
  if (r && r.contentEn) {
    inner += '<br clear="all" style="page-break-before:always" />' +
      controlledSection(title + ' (English)', docNo, ctx, { ...r, content: r.contentEn }, r.contentEn)
  }
  return "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>" +
    escHtml(title) + "</title></head><body>" + inner + "</body></html>"
}

// ── 품질문서 통합본 (품질매뉴얼 + 절차서 전체를 하나의 문서로) ──
const STATUS_LABEL = { effective: '발효', pending: '승인대기', review: '검토중', obsolete: '폐기', draft: '작성중' }
function combinedCoverHtml(ctx, groups) {
  const F = 'font-family:Malgun Gothic,sans-serif'
  const entries = groups.flatMap((g) => g.entries)
  const rows = entries.map(({ it, r, docNo }) =>
    '<tr><td style="' + F + '">' + escHtml(it.label) + '</td>' +
    '<td style="text-align:center;' + F + '">' + escHtml(docNo) + '</td>' +
    '<td style="text-align:center;' + F + '">Rev.' + String(r.rev || 0).padStart(2, '0') + '</td>' +
    '<td style="text-align:center;' + F + '">' + escHtml(STATUS_LABEL[r.status] || '작성중') + '</td>' +
    '<td style="text-align:center;' + F + '">' + escHtml(r.approvedAt || '-') + '</td></tr>'
  ).join('')
  return (
    '<div style="text-align:center;margin-bottom:24px">' +
    '<div style="' + F + ';font-size:12pt;color:#5a6a63">' + escHtml(ctx.name) + '</div>' +
    '<div style="' + F + ';font-size:20pt;font-weight:bold;color:#16352b;margin:8px 0">품질문서 통합본</div>' +
    '<div style="' + F + ';font-size:10pt;color:#8a9a93">생성일 ' + fmtDate() + ' · 총 ' + entries.length + '개 문서</div>' +
    '</div>' +
    '<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;' + F + ';font-size:10pt">' +
    '<tr style="background:#f1f6f3"><th style="text-align:left">문서명</th><th>문서번호</th><th>개정</th><th>상태</th><th>발효일</th></tr>' +
    rows +
    '</table>'
  )
}
function combinedDocHtml(ctx, groups) {
  let body = '<br clear="all" style="page-break-before:always" />' + combinedCoverHtml(ctx, groups)
  groups.forEach((g) => {
    if (!g.entries.length) return
    body += '<br clear="all" style="page-break-before:always" />' +
      '<h1 style="font-family:Malgun Gothic,sans-serif;font-size:15pt;color:#16352b;border-bottom:2px solid #16352b;padding-bottom:6px">' + escHtml(g.heading) + '</h1>'
    g.entries.forEach(({ it, r, docNo }, i) => {
      if (i > 0) body += '<br clear="all" style="page-break-before:always" />'
      body += controlledSection(it.label, docNo, ctx, r, r.content, orgChartImageHtml(it))
      if (r.contentEn) {
        body += '<br clear="all" style="page-break-before:always" />' +
          controlledSection(it.label + ' (English)', docNo, ctx, { ...r, content: r.contentEn }, r.contentEn)
      }
    })
  })
  return "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>품질문서 통합본</title></head><body>" + body + "</body></html>"
}

// ── 회사 컨텍스트 ──
function getCtx() {
  let ob = {}
  try { ob = JSON.parse(localStorage.getItem(OB_KEY) || '{}') } catch { /* */ }
  const c = ob.company || {}
  const certMap = { kgmp: 'KGMP', iso13485: 'ISO 13485', ce: 'CE MDR', fda: 'FDA QMSR', mdsap: 'MDSAP' }
  const certs = Object.entries(ob.certs || {}).filter(([, v]) => v).map(([k]) => certMap[k] || k)
  return {
    name: c.name || '(회사명)', ceo: c.ceo || '(대표이사)', qmRep: c.qmRep || '(품질책임자)',
    certs, products: ob.products || [], depts: ob.departments || [],
  }
}
const certText = (ctx) => (ctx.certs.length ? ctx.certs.join(', ') : 'KGMP / ISO 13485')
const prodList = (ctx) => (ctx.products.length ? ctx.products.map((p) => `   · ${p.name}${p.grade ? ` (${p.grade}등급)` : ''}${p.classNo ? ` [분류 ${p.classNo}]` : ''}`).join('\n') : '   · (등록된 제품 없음 — 제품 등록 후 갱신)')
const deptList = (ctx) => (ctx.depts.length ? ctx.depts.map((d) => `   · ${d.name}`).join('\n') : '   · (조직 정보 없음)')

function hdr(title, iso, kgmp) {
  return `${title}\n근거: ISO 13485:2016 ${iso}  /  KGMP ${KGMP} ${kgmp}\n※ AI가 생성한 기본 초안입니다. 최신 고시 원문(law.go.kr · mfds.go.kr)과 대조하여 회사 실정에 맞게 검토·확정하세요.\n${'─'.repeat(44)}\n`
}

// ── 품질매뉴얼 장별 초안 ──
function genManual(c, name, ctx) {
  const co = ctx.name
  switch (String(c)) {
    case '0': return hdr(`[0. ${name}]`, '§4.1, §4.2.2', '§4.1, §4.2.2') +
      `1. 회사 개요\n   - 회사명: ${co}\n   - 대표이사: ${ctx.ceo}\n   - 품질책임자: ${ctx.qmRep}\n\n2. 적용 범위 (Scope)\n   본 품질경영시스템은 ${co}가 수행하는 의료기기의 설계·개발·제조·판매 활동에 적용한다.\n   적용 제품:\n${prodList(ctx)}\n\n3. 적용 표준 / 인증\n   ${certText(ctx)}\n\n4. 제외 및 비적용 (ISO 13485 §4.2.2 — 제외 시 사유 명시 필수)\n   - 예) 설계·개발(§7.3): 해당/비해당 및 사유 [작성]\n   - 비적용 조항은 §6·§7·§8 범위에서만 가능하며 각각 사유를 기재한다.\n`
    case '1': return hdr(`[1. ${name}]`, '§5.3(품질방침), §5.4.1(품질목표)', '§5.3, §5.4.1') +
      `1. 품질방침\n   ${co}는 환자와 고객의 안전을 최우선으로 하고, 의료기기법 및 ${certText(ctx)} 요구사항을 준수하며, 품질경영시스템의 지속적 개선을 통해 신뢰받는 의료기기를 제공한다. 본 방침은 전 임직원에게 전달·이해되며 정기적으로 적절성을 검토한다.\n\n2. 품질목표 (측정 가능하게 설정 — 예시)\n   - 출하 부적합률 [목표]% 이하\n   - 고객 불만 처리 기한 준수율 [목표]% 이상\n   - 내부감사 지적사항 시정조치 완료율 100%\n   품질목표는 매년 경영검토(§5.6)에서 검토·갱신한다.\n`
    case '2': return hdr(`[2. ${name}]`, '§5.5.1(책임과 권한), §5.5.2(경영대리인)', '§5.5') +
      `1. 조직도\n   대표이사(${ctx.ceo}) 산하 조직:\n${deptList(ctx)}\n\n2. 책임과 권한\n   - 대표이사: 품질경영시스템 수립·자원 제공·경영검토 주관 (§5.1)\n   - 품질책임자/경영대리인(${ctx.qmRep}): QMS의 수립·유지 보장, 법규 적합성 보증, 경영진 보고, 규제기관 연락 창구 (§5.5.2)\n   - 각 부서장: 담당 업무의 품질 확보 및 절차 준수\n   ※ 의료기기법상 '품질책임자'의 직무·자격 요건을 함께 반영할 것.\n`
    case '3': return hdr(`[3. ${name}]`, '§2(인용규격), §3(용어와 정의)', '§2, §3') +
      `1. 인용 규격\n   - ${KGMP}\n   - ISO 13485:2016 의료기기 품질경영시스템\n   - ISO 14971 위험관리${ctx.certs.includes('FDA QMSR') ? '\n   - 21 CFR Part 820 (US QMSR)' : ''}${ctx.certs.includes('CE MDR') ? '\n   - EU MDR 2017/745' : ''}\n\n2. 용어와 정의\n   - 의료기기, 부적합, 시정조치, 예방조치, 위험, 밸리데이션 등은 인용 규격의 정의를 따른다.\n`
    case '4': return hdr(`[4. ${name}]`, '§4.1, §4.2(문서화 요구사항)', '§4.1, §4.2') +
      `1. 일반 요구사항 (§4.1)\n   ${co}는 본 기준에 따라 QMS를 문서화·실행·유지하고 효과성을 지속적으로 개선한다. 프로세스, 순서 및 상호작용을 파악·관리한다.\n\n2. 문서화 구조 (§4.2.1) — 4단계\n   1단계 품질매뉴얼 → 2단계 절차서 → 3단계 지침/작업표준 → 4단계 양식·기록\n\n3. 의료기기 파일 (§4.2.3)\n   제품(군)별로 사양·제조·검사·설치·서비스 문서를 파일로 유지한다.\n\n4. 문서관리(§4.2.4) 및 기록관리(§4.2.5)\n   별도 「문서관리 절차서」·「기록관리 절차서」에 따른다.\n`
    case '5': return hdr(`[5. ${name}]`, '§5.1~§5.6 (특히 §5.6 경영검토)', '§5') +
      `1. 경영 의지 (§5.1) / 고객 중심 (§5.2)\n2. 품질방침(§5.3) 및 기획(§5.4)\n3. 책임·권한·의사소통 (§5.5)\n4. 경영검토 (§5.6)\n   - 주기: 연 [N]회 이상\n   - 입력: 감사결과, 고객피드백/불만, 공정·제품 적합성, 부적합·CAPA 현황, 이전 조치 후속, 변경, 개선 권고, 법규 변경\n   - 출력: QMS 개선, 제품 개선, 자원 필요사항, 법규 대응\n`
    case '6': return hdr(`[6. ${name}]`, '§6.1~§6.4 (인적자원·기반시설·작업환경/오염관리)', '§6') +
      `1. 자원 제공 (§6.1)\n2. 인적자원 (§6.2): 직무별 역량 기준·교육훈련·평가 → 「교육훈련 절차서」\n3. 기반시설 (§6.3): 건물·설비·장비·유틸리티 관리 → 「장비관리 절차서」\n4. 작업환경 및 오염관리 (§6.4): 청정도·복장·위생, 멸균/무균 제품 시 오염관리(§6.4.2)\n`
    case '7': return hdr(`[7. ${name}]`, '§7.1~§7.6 (기획·고객·설계개발·구매·생산·모니터링장치)', '§7') +
      `대상 제품:\n${prodList(ctx)}\n\n1. 제품실현 기획 (§7.1) — 위험관리(ISO 14971) 포함\n2. 고객 관련 프로세스 (§7.2)\n3. 설계 및 개발 (§7.3) — 해당 시 → 「설계개발 절차서」\n4. 구매 (§7.4) — 공급자 평가 → 「구매관리 절차서」\n5. 생산 및 서비스 제공 (§7.5) — 공정관리·밸리데이션(§7.5.6)·식별/추적성(§7.5.8~9)·보존(§7.5.11)\n6. 모니터링 및 측정장치 관리 (§7.6) — 교정\n`
    case '8': return hdr(`[8. ${name}]`, '§8.1~§8.5 (피드백·불만·내부감사·부적합·데이터분석·CAPA)', '§8') +
      `1. 일반 (§8.1)\n2. 모니터링 및 측정 (§8.2): 피드백(§8.2.1)·불만처리(§8.2.2)·규제기관 보고(§8.2.3)·내부감사(§8.2.4)\n3. 부적합 제품 관리 (§8.3) → 「부적합품 절차서」\n4. 데이터 분석 (§8.4)\n5. 개선 (§8.5): 시정조치(§8.5.2)·예방조치(§8.5.3) → 「시정조치/예방조치 절차서」\n`
    default: return hdr(`[${name}]`, '해당 조항 확인', '해당 조항 확인') +
      `1. 목적\n   본 장의 목적을 기재한다.\n\n2. 적용 범위\n   ${co}의 관련 활동에 적용한다.\n\n3. 세부 내용\n   [작성]\n`
  }
}

// ── 절차서 초안 (키워드→조항 매핑) ──
const PCLAUSE = [
  [/문서/, '§4.2.4', 'KGMP §4.2.4'], [/기록/, '§4.2.5', 'KGMP §4.2.5'],
  [/경영검토|경영 검토/, '§5.6', 'KGMP §5.6'], [/교육|훈련|역량|인적/, '§6.2', 'KGMP §6.2'],
  [/장비|설비|시설|기반/, '§6.3', 'KGMP §6.3'], [/작업환경|환경관리|오염|청정/, '§6.4', 'KGMP §6.4'],
  [/위험|리스크/, '§7.1 (ISO 14971 연계)', 'KGMP §7.1'], [/불만|고객/, '§7.2 / §8.2.1~2', 'KGMP §7.2/§8.2'], [/계약/, '§7.2', 'KGMP §7.2'], [/자재/, '§7.5.11 / §7.4.3', 'KGMP §7.5.11'],
  [/설계|개발/, '§7.3', 'KGMP §7.3'], [/구매/, '§7.4', 'KGMP §7.4'],
  [/멸균/, '§7.5.7', 'KGMP §7.5.7'], [/밸리데이션|유효성/, '§7.5.6', 'KGMP §7.5.6'],
  [/공정|생산|제조|프로세스/, '§7.5.1', 'KGMP §7.5'], [/식별|추적|UDI/, '§7.5.8~9 / 의료기기법 UDI', 'KGMP §7.5.8'],
  [/보존|취급|포장|보관/, '§7.5.11', 'KGMP §7.5.11'], [/검사|시험|측정장치|모니터링/, '§7.6 / §8.2.6', 'KGMP §7.6'],
  [/내부감사|내부심사/, '§8.2.4', 'KGMP §8.2.4'], [/부적합/, '§8.3', 'KGMP §8.3'],
  [/데이터/, '§8.4', 'KGMP §8.4'], [/시정/, '§8.5.2', 'KGMP §8.5.2'], [/예방/, '§8.5.3', 'KGMP §8.5.3'],
  [/안전성|시판후|감시|부작용/, '§8.2.3 / 의료기기법 부작용보고', 'KGMP §8.2.3'],
  [/소프트웨어/, '§4.1.6 / §7.5.6', 'KGMP §4.1.6'], [/사용적합성/, '§7.3 (IEC 62366-1)', 'KGMP §7.3'],
]
function genProc(name, ctx) {
  const m = PCLAUSE.find(([re]) => re.test(name))
  const iso = m ? m[1] : '해당 조항 확인'
  const kgmp = m ? ('별표2 ' + m[2].replace('KGMP ', '')) : '별표2 해당 조항'
  const base = name.replace(/\s*절차서$/, '')
  return hdr(`[${name}]`, iso, kgmp) +
    `1. 목적\n   본 절차는 ${ctx.name}의 ${base} 업무를 표준화하여 ${certText(ctx)} 요구사항에 적합하게 수행함을 목적으로 한다.\n\n` +
    `2. 적용 범위\n   ${ctx.name}의 ${base} 관련 모든 활동에 적용한다.\n\n` +
    `3. 용어의 정의\n   - (필요한 용어를 정의한다)\n\n` +
    `4. 책임과 권한\n   - 품질책임자(${ctx.qmRep}): 본 절차의 수립·개정 및 이행 감독\n   - 해당 부서장: 절차 준수 및 기록 유지\n\n` +
    `5. 업무 절차\n   5.1 [단계 1 — 입력/조건]\n   5.2 [단계 2 — 수행/판정]\n   5.3 [단계 3 — 승인/기록]\n\n` +
    `6. 관련 기록 및 양식\n   - [양식번호 / 기록명 기재]  (보관기간은 「기록관리 절차서」 따름)\n\n` +
    `7. 개정 이력\n   Rev.0  최초 제정  ${new Date().toISOString().slice(0, 10)}\n`
}

export default function Documents() {
  const user = auth.current()
  const me = (user && (user.name || user.email)) || '사용자'
  const ob = (() => { try { return JSON.parse(localStorage.getItem(OB_KEY) || '{}') } catch { return {} } })()
  const ctx = getCtx()
  const manualChapters = (ob.manual && Array.isArray(ob.manual.chapters)) ? ob.manual.chapters.filter((c) => c.included !== false) : []
  const procedures = Array.isArray(ob.procedures) ? ob.procedures.filter((p) => p.applicable !== false) : []
  // "조직도" 챕터 판별 + 온보딩/회사·조직에서 캡처해 둔 조직도 이미지 (있으면 그대로 문서에 표시·포함)
  const isOrgChapter = (it) => it.kind === 'manual' && (it.c === '2' || /조직도/.test(it.name || ''))
  const orgChartImg = loadOrgChartImage()

  const [docs, setDocs] = useState(() => { try { return JSON.parse(localStorage.getItem(DOC_KEY) || '{}') } catch { return {} } })
  useEffect(() => { try { localStorage.setItem(DOC_KEY, JSON.stringify(docs)) } catch { /* */ } }, [docs])

  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'manual')
  const [openId, setOpenId] = useState(null)

  // 외부 페이지(KGMP 허브 등)에서 ?tab=procedures&openName=문서관리 로 특정 절차서를
  // 직접 열람·수정할 수 있도록 딥링크 지원
  useEffect(() => {
    const openName = searchParams.get('openName')
    if (!openName) return
    const pool = tab === 'manual' ? manualChapters : procedures
    const match = pool.find((it) => (it.name || '').includes(openName))
    if (match) {
      setOpenId((tab === 'manual' ? 'M-' : 'P-') + match.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, tab])

  const today = () => new Date().toISOString().slice(0, 10)
  // 레거시 상태(done 등) 정규화 — review/pending/effective 외에는 모두 작성중(draft)
  const norm = (r) => { const st = r && r.status; return (st === 'review' || st === 'pending' || st === 'effective' || st === 'obsolete') ? st : 'draft' }
  const patchDoc = (id, fn) => setDocs((d) => { const cur = d[id] || { status: 'draft', rev: 0, history: [] }; return { ...d, [id]: fn({ ...cur }) } })
  const hist = (r, action) => ([...(r.history || []), { rev: r.rev || 0, action, by: me, at: today() }])

  const setContent = (id, v) => patchDoc(id, (r) => ({ ...r, content: v, updatedAt: Date.now(), author: r.author || me, status: norm(r) === 'draft' ? 'draft' : r.status }))
  const submitReview = (id) => patchDoc(id, (r) => ({ ...r, status: 'review', author: r.author || me, history: hist(r, '검토 요청') }))
  const reject = (id) => patchDoc(id, (r) => ({ ...r, status: 'draft', reviewedBy: me, reviewedAt: today(), history: hist(r, '반려') }))
  const reviewDone = (id) => patchDoc(id, (r) => ({ ...r, status: 'pending', reviewedBy: me, reviewedAt: today(), history: hist(r, '검토 완료 · 승인 상신') }))
  const approve = (id) => patchDoc(id, (r) => ({ ...r, status: 'effective', approvedBy: me, approvedAt: today(), history: hist(r, '승인 · 발효') }))
  const revise = (id) => patchDoc(id, (r) => { const nr = (r.rev || 0) + 1; return { ...r, status: 'draft', rev: nr, reviewedBy: null, reviewedAt: null, approvedBy: null, approvedAt: null, history: [...(r.history || []), { rev: nr, action: '개정 시작', by: me, at: today() }] } })
  const obsolete = (id) => {
    const reason = window.prompt('폐기 사유를 입력하세요 (ISO 13485 §4.2.4 — 의도치 않은 사용 방지):', '')
    if (reason == null) return
    if (!reason.trim()) { window.alert('폐기 사유는 필수입니다.'); return }
    patchDoc(id, (r) => ({ ...r, status: 'obsolete', obsoletedBy: me, obsoletedAt: today(), obsoleteReason: reason.trim(), history: hist(r, '폐기: ' + reason.trim()) }))
  }
  const distribute = (id) => {
    const recipient = window.prompt('배포 대상(부서·성명)을 입력하세요:', '')
    if (recipient == null || !recipient.trim()) return
    patchDoc(id, (r) => ({ ...r, distribution: [...(r.distribution || []), { recipient: recipient.trim(), rev: r.rev || 0, by: me, at: today() }] }))
  }

  const items = tab === 'manual'
    ? manualChapters.map((c) => ({ id: 'M-' + c.id, label: (c.c ? c.c + '. ' : '') + c.name, c: c.c, name: c.name, kind: 'manual' }))
    : tab === 'procedures'
      ? procedures.map((p) => ({ id: 'P-' + p.id, label: p.name, name: p.name, kind: 'proc' }))
      : []
  const statusId = (it) => (it.kind === 'manual' ? 'MANUAL' : it.id); const effCount = items.filter((it) => norm(docs[statusId(it)] || {}) === 'effective').length

  // ── 한→영 번역 (용어집 주입, 버튼식 수동 갱신 + 스탈 + 수동수정 잠금) ──
  const glossaryPairs = GLOSSARY.map((g) => ({ ko: g.t, en: g.en }))
  const [translating, setTranslating] = useState(null)
  const setContentEn = (id, v) => patchDoc(id, (r) => ({ ...r, contentEn: v, enEdited: true, enUpdatedAt: Date.now(), enSrcAt: r.updatedAt || Date.now() }))
  const isStale = (r) => !!r.contentEn && (r.updatedAt || 0) > (r.enSrcAt || 0)
  const doTranslate = async (id) => {
    const r = docs[id] || {}
    if (!r.content) { window.alert('먼저 한글 내용을 작성하세요.'); return }
    if (r.contentEn && r.enEdited && !window.confirm('직접 수정한 영문이 있습니다. 자동 번역으로 덮어쓸까요?')) return
    setTranslating(id)
    try {
      const en = await translateToEn(r.content, glossaryPairs)
      patchDoc(id, (rr) => ({ ...rr, contentEn: en, enEdited: false, enUpdatedAt: Date.now(), enSrcAt: rr.updatedAt || Date.now() }))
    } catch (e) {
      window.alert('영문 번역 실패: ' + ((e && e.message) || e) + '\n운영자에게 ANTHROPIC_API_KEY 환경변수 설정을 확인 요청하세요.')
    } finally { setTranslating(null) }
  }
  const translateAllNeeded = async () => {
    const targets = items.filter((it) => { const r = docs[it.id] || {}; const sr = docs[statusId(it)] || {}; return r.content && norm(sr) !== 'effective' && (!r.contentEn || isStale(r)) })
    if (targets.length === 0) { window.alert('영문 생성/갱신이 필요한 항목이 없습니다.'); return }
    if (!window.confirm(targets.length + '개 항목의 영문을 생성/갱신합니다. 진행할까요?')) return
    for (const it of targets) {
      setTranslating(it.id)
      try {
        const r = docs[it.id]
        const en = await translateToEn(r.content, glossaryPairs)
        patchDoc(it.id, (rr) => ({ ...rr, contentEn: en, enEdited: false, enUpdatedAt: Date.now(), enSrcAt: rr.updatedAt || Date.now() }))
      } catch (e) { window.alert('번역 실패 (' + it.label + '): ' + ((e && e.message) || e)); break }
    }
    setTranslating(null)
  }

  const exportOne = (it, idx) => {
    const r = docs[it.id] || {}
    if (!r.content) { window.alert('내보낼 내용이 없습니다.'); return }
    downloadDoc((it.label || 'document').replace(/[\\/:*?"<>|]/g, '_') + '.doc', controlledDocHtml(it.label, docNumber(it, idx), ctx, { ...r, ...(docs[statusId(it)] || {}) }, orgChartImageHtml(it)))
  }
  const openPreview = (it, idx) => {
    const r = docs[it.id] || {}
    if (!r.content) { window.alert('미리볼 내용이 없습니다. 먼저 작성하거나 업로드하세요.'); return }
    const w = window.open('', '_blank')
    if (w) { w.document.write(controlledDocHtml(it.label, docNumber(it, idx), ctx, { ...r, ...(docs[statusId(it)] || {}) }, orgChartImageHtml(it))); w.document.close() }
    else window.alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.')
  }
  const exportAll = () => {
    const targets = items.map((it, idx) => ({ it, idx })).filter(({ it }) => (docs[it.id] || {}).content)
    if (targets.length === 0) { window.alert('내보낼 문서가 없습니다.'); return }
    targets.forEach(({ it, idx }, i) => {
      setTimeout(() => {
        const r = docs[it.id] || {}
        downloadDoc((it.label || 'document').replace(/[\\/:*?"<>|]/g, '_') + '.doc', controlledDocHtml(it.label, docNumber(it, idx), ctx, { ...r, ...(docs[statusId(it)] || {}) }, orgChartImageHtml(it)))
      }, i * 400)
    })
    window.alert(targets.length + '개 문서를 정식 양식 .doc로 각각 내려받습니다. (브라우저가 "여러 파일 다운로드 허용"을 물으면 허용해 주세요)')
  }

  // ── 품질문서 통합본 (품질매뉴얼 + 절차서 전체 — 항목을 수정한 뒤 하나의 문서로 확인/다운로드) ──
  const combinedGroups = () => {
    const build = (list, kind) => list.map((base, idx) => {
      const it = kind === 'manual'
        ? { id: 'M-' + base.id, label: (base.c ? base.c + '. ' : '') + base.name, c: base.c, name: base.name, kind: 'manual' }
        : { id: 'P-' + base.id, label: base.name, name: base.name, kind: 'proc' }
      const rContent = docs[it.id] || {}
      const r = { ...rContent, ...(docs[statusId(it)] || {}) }
      return { it, idx, r, docNo: docNumber(it, idx) }
    }).filter(({ r }) => !!r.content)
    return [
      { heading: '품질매뉴얼', entries: build(manualChapters, 'manual') },
      { heading: '절차서', entries: build(procedures, 'proc') },
    ]
  }
  const combinedTotalWritten = () => combinedGroups().reduce((n, g) => n + g.entries.length, 0)
  const combinedTotalAll = manualChapters.length + procedures.length
  const previewCombined = () => {
    const groups = combinedGroups()
    if (combinedTotalWritten() === 0) { window.alert('아직 작성된 문서가 없습니다.'); return }
    const w = window.open('', '_blank')
    if (w) { w.document.write(combinedDocHtml(ctx, groups)); w.document.close() }
    else window.alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.')
  }
  const downloadCombined = () => {
    const groups = combinedGroups()
    if (combinedTotalWritten() === 0) { window.alert('아직 작성된 문서가 없습니다.'); return }
    downloadDoc((ctx.name || 'Qualytree').replace(/[\\/:*?"<>|]/g, '_') + '_품질문서_통합본_' + today().replace(/-/g, '') + '.doc', combinedDocHtml(ctx, groups))
  }

  // 기존 문서 업로드 → 본문(한글)에 채움 (.docx는 mammoth로 텍스트 추출). 이후 편집·번역·내보내기·영문일괄에 그대로 포함.
  const onUpload = async (it, file) => {
    const r = docs[it.id] || {}
    if (r.content && !window.confirm('이미 작성된 내용이 있습니다. 업로드한 문서로 덮어쓸까요?')) return
    try {
      let text = ''
      if (/\.docx$/i.test(file.name)) {
        const mammoth = await loadMammoth()
        const ab = await file.arrayBuffer()
        const res = await mammoth.extractRawText({ arrayBuffer: ab })
        text = (res && res.value) || ''
      } else {
        text = await file.text()
      }
      if (!text.trim()) { window.alert('문서에서 텍스트를 추출하지 못했습니다.\n지원: .docx / .txt / .md (구버전 .doc·.hwp·스캔 PDF는 미지원 — .docx로 저장 후 올려주세요)'); return }
      setContent(it.id, text); setOpenId(it.id)
      window.alert('업로드 완료. 내용을 검토·수정한 뒤, 상단 "영문 일괄 생성·갱신" 또는 문서별 "영문 생성"으로 영문을 만들 수 있어요.')
    } catch (e) { window.alert('업로드 처리 실패: ' + ((e && e.message) || e)) }
  }

  const draftFor = (it) => (it.kind === 'manual' ? genManual(it.c, it.name, ctx) : genProc(it.name, ctx))
  const genOne = (it) => {
    if (docs[it.id]?.content && !window.confirm('이미 작성된 내용이 있습니다. AI 초안으로 덮어쓸까요?')) return
    setContent(it.id, draftFor(it)); setOpenId(it.id)
  }
  const genAllEmpty = () => {
    const targets = items.filter((it) => !docs[it.id]?.content)
    if (targets.length === 0) { window.alert('비어있는 항목이 없습니다.'); return }
    if (!window.confirm(`비어있는 ${targets.length}개 항목에 AI 기본 초안을 생성합니다. 진행할까요?`)) return
    setDocs((d) => { const n = { ...d }; targets.forEach((it) => { const cur = n[it.id] || { status: 'draft', rev: 0, history: [] }; n[it.id] = { ...cur, content: draftFor(it), author: cur.author || me, updatedAt: Date.now() } }); return n })
  }

  const badge = (r) => {
    if (!r || !r.content) return ['미작성', 'bg-slate-100 text-slate-400']
    const st = norm(r)
    if (st === 'obsolete') return ['폐기됨 Rev.' + (r.rev || 0), 'bg-rose-100 text-rose-600']
    if (st === 'effective') return ['발효 Rev.' + (r.rev || 0), 'bg-emerald-100 text-emerald-700']
    if (st === 'pending') return ['승인 대기', 'bg-violet-100 text-violet-700']
    if (st === 'review') return ['검토 중', 'bg-amber-100 text-amber-700']
    return ['작성 중', 'bg-slate-100 text-slate-500']
  }

  // 결재선 노드
  const ApprovalLine = ({ r }) => {
    const st = norm(r)
    const node = (label, who, date, active, done) => (
      <div className={`flex-1 rounded-lg border px-2.5 py-1.5 text-center ${done ? 'border-emerald-300 bg-emerald-50' : active ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
        <div className="text-[10px] text-slate-400">{label}</div>
        <div className={`text-[12px] font-medium ${done ? 'text-emerald-700' : active ? 'text-amber-700' : 'text-slate-400'}`}>{who || (active ? '진행 중' : '대기')}</div>
        {date && <div className="text-[10px] text-slate-400">{date}</div>}
      </div>
    )
    return (
      <div className="flex items-stretch gap-1.5 my-2 text-left">
        {node('작성', r.author, null, st === 'draft', !!r.author && st !== 'draft')}
        <div className="self-center text-slate-300">›</div>
        {node('검토', r.reviewedBy, r.reviewedAt, st === 'review', st === 'pending' || st === 'effective')}
        <div className="self-center text-slate-300">›</div>
        {node('승인(발효)', r.approvedBy, r.approvedAt, st === 'pending', st === 'effective')}
      </div>
    )
  }

  const obsoleteItems = [
    ...manualChapters.map((c) => ({ id: 'M-' + c.id, label: (c.c ? c.c + '. ' : '') + c.name })),
    ...procedures.map((p) => ({ id: 'P-' + p.id, label: p.name })),
  ].filter((it) => (docs[it.id] || {}).status === 'obsolete')

  const tabs = [
    { k: 'manual', label: '품질매뉴얼', icon: FileText, n: manualChapters.length },
    { k: 'procedures', label: '절차서', icon: ClipboardCheck, n: procedures.length },
    { k: 'obsolete', label: '폐기문서목록', icon: Trash2, n: obsoleteItems.length },
    { k: 'glossary', label: '용어 사전', icon: BookOpen },
  ]

  return (
    <AppLayout user={user} title="품질 문서" subtitle="품질매뉴얼 · 절차서 작성·결재">
      <div className="px-6 py-6 max-w-5xl mx-auto">
        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-sky-50 border border-sky-200 text-[12.5px] text-sky-800">
          <Info size={15} className="shrink-0 mt-0.5" />
          <span><b>결재선</b>: 작성 → <b>검토 요청</b> → <b>검토 완료·승인 상신</b> → <b>대표 승인·발효</b>(Rev.0). 발효되면 편집이 잠기고, 고치려면 <b>개정</b>(Rev.1↑)을 시작합니다. AI 초안은 ISO 13485 / KGMP 조항 근거와 함께 채워지며, 최신 고시 원문과 대조해 확정하세요.</span>
        </div>

        <div className="mb-4 flex items-center justify-between gap-2 flex-wrap p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
          <div className="text-[12.5px] text-emerald-900">
            <b>품질문서 통합본</b> — 품질매뉴얼 · 절차서 전체를 하나의 문서로. 항목을 수정한 뒤 다시 눌러 최신 내용을 반영하세요.
            <span className="text-emerald-700"> (작성됨 {combinedTotalWritten()} / {combinedTotalAll})</span>
          </div>
          <div className="flex gap-2">
            <button onClick={previewCombined} className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50">
              통합 문서 미리보기
            </button>
            <button onClick={downloadCombined} className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
              <Download size={14} /> 통합 문서 다운로드 (.doc)
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {tabs.map((tb) => {
            const Icon = tb.icon
            const on = tab === tb.k
            return (
              <button key={tb.k} onClick={() => setTab(tb.k)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[13px] font-medium transition ${on ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                <Icon size={15} /> {tb.label}{typeof tb.n === 'number' && <span className="text-[11px] text-slate-400">({tb.n})</span>}
              </button>
            )
          })}
        </div>

        {tab === 'glossary' && (
          <div className="grid gap-2">
            {GLOSSARY.map((g) => (
              <div key={g.t} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-[13.5px] font-semibold text-slate-800">{g.t} <span className="text-[11px] font-normal text-slate-400">{g.en}</span></div>
                <div className="text-[12.5px] text-slate-600 mt-1 leading-relaxed">{g.d}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'obsolete' && (
          <div className="grid gap-2">
            {obsoleteItems.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg text-[13px] text-slate-400">
                폐기된 문서가 없습니다. 발효 문서에서 "폐기" 버튼으로 등록할 수 있습니다.
              </div>
            ) : (
              obsoleteItems.map((it) => {
                const r = docs[it.id] || {}
                return (
                  <div key={it.id} className="rounded-lg border border-rose-200 bg-rose-50/40 p-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[13px] font-medium text-slate-800">{it.label}</span>
                      <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">폐기됨 Rev.{r.rev || 0}</span>
                    </div>
                    <div className="text-[11.5px] text-slate-500 mt-1">폐기일 {r.obsoletedAt} · 처리자 {r.obsoletedBy}</div>
                    <div className="text-[12px] text-slate-600 mt-1">사유: {r.obsoleteReason}</div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {(tab === 'manual' || tab === 'procedures') && (
          <>
            {items.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg text-[13px] text-slate-400">
                온보딩에서 {tab === 'manual' ? '매뉴얼 목차를 구성' : '절차서를 선택'}하면 여기에 나타납니다.
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-[12.5px] text-slate-500">발효 완료 <b className="text-emerald-700">{effCount}</b> / {items.length}</div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={exportAll} className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">
                      <Download size={14} /> 정식 양식 .doc 일괄
                    </button>
                    <button onClick={translateAllNeeded} className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-lg border border-sky-300 text-sky-700 hover:bg-sky-50">
                      <Languages size={14} /> 영문 일괄 생성·갱신
                    </button>
                    <button onClick={genAllEmpty} className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700">
                      <Sparkles size={14} /> 비어있는 항목 AI 초안 일괄 생성
                    </button>
                  </div>
                </div>
                <div className="grid gap-2">
                  {items.map((it, idx) => {
                    const r = docs[it.id] || {}; const sr = docs[statusId(it)] || {}
                    const open = openId === it.id
                    const [bLabel, bCls] = badge({ ...sr, content: r.content })
                    const st = norm(sr)
                    const eff = st === 'effective'
                    const editable = st === 'draft'
                    return (
                      <div key={it.id} className={`rounded-lg border bg-white ${eff ? 'border-emerald-200' : 'border-slate-200'}`}>
                        <button onClick={() => setOpenId(open ? null : it.id)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
                          {open ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
                          <span className="flex-1 text-[13px] font-medium text-slate-800">{it.label}</span>
                          <span className={`text-[10.5px] px-2 py-0.5 rounded-full ${bCls}`}>{bLabel}</span>
                        </button>
                        {open && (
                          <div className="px-3 pb-3">
                            {isOrgChapter(it) && (
                              orgChartImg && orgChartImg.dataUrl ? (
                                <div className="mb-3 rounded-lg border border-slate-200 overflow-hidden">
                                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                                    <span>온보딩/회사·조직에서 저장한 조직도 이미지</span>
                                    <span>저장일 {new Date(orgChartImg.capturedAt).toLocaleString('ko-KR')}</span>
                                  </div>
                                  <img src={orgChartImg.dataUrl} alt="조직도" className="w-full" />
                                </div>
                              ) : (
                                <div className="mb-3 flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
                                  <Info size={14} className="shrink-0 mt-0.5" />
                                  <span>저장된 조직도 이미지가 없습니다. "회사·조직" 페이지(또는 온보딩 조직도 단계)에서 "조직도 이미지로 저장"을 누르면 여기에 그대로 표시·포함됩니다.</span>
                                </div>
                              )
                            )}
                            {r.content && <ApprovalLine r={sr} />}
                            {editable && (
                              <div className="flex justify-end gap-2 mb-2">
                                <label className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer">
                                  <Upload size={13} /> 기존 문서 업로드
                                  <input type="file" accept=".docx,.txt,.md,.text,text/plain" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onUpload(it, f); e.target.value = '' }} />
                                </label>
                                <button onClick={() => genOne(it)} className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-lg border border-violet-300 text-violet-700 hover:bg-violet-50">
                                  <Sparkles size={13} /> AI 초안 생성
                                </button>
                              </div>
                            )}
                            <textarea
                              value={r.content || ''}
                              onChange={(e) => editable && setContent(it.id, e.target.value)}
                              readOnly={!editable}
                              placeholder={'내용을 직접 작성하거나, "AI 초안 생성"으로 기본 초안을 채운 뒤 수정하세요.'}
                              rows={14}
                              className={`w-full rounded-lg border px-3 py-2 text-[12.5px] leading-relaxed focus:outline-none resize-y font-mono ${editable ? 'border-slate-200 focus:border-emerald-500' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
                            />

                            <div className="mt-3 rounded-lg border border-slate-200">
                              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200 flex-wrap">
                                <span className="text-[12px] font-medium text-slate-600 flex items-center gap-1.5">
                                  <Languages size={13} /> English (국제 인증용)
                                  {isStale(r) && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">원문 변경됨 · 갱신 필요</span>}
                                  {r.enEdited && !isStale(r) && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">직접 수정함</span>}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {r.content && (
                                    <button onClick={() => openPreview(it, idx)} className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
                                      미리보기
                                    </button>
                                  )}
                                  {r.content && (
                                    <button onClick={() => exportOne(it, idx)} className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
                                      <Download size={13} /> 양식 .doc
                                    </button>
                                  )}
                                  {editable && (
                                    <button onClick={() => doTranslate(it.id)} disabled={translating === it.id || !r.content}
                                      className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-lg border border-sky-300 text-sky-700 hover:bg-sky-50 disabled:opacity-40">
                                      <Languages size={13} /> {translating === it.id ? '번역 중…' : (r.contentEn ? '영문 갱신' : '영문 생성')}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <textarea
                                value={r.contentEn || ''}
                                onChange={(e) => editable && setContentEn(it.id, e.target.value)}
                                readOnly={!editable}
                                placeholder={'"영문 생성"을 누르면 한글 내용이 용어집 기반으로 자동 번역됩니다. 직접 수정할 수도 있어요.'}
                                rows={12}
                                className={`w-full px-3 py-2 text-[12.5px] leading-relaxed focus:outline-none resize-y font-mono rounded-b-lg ${editable ? 'focus:border-emerald-500' : 'bg-slate-50 text-slate-600'}`}
                              />
                            </div>

                            {eff && (
                              <div className="mt-2 text-[11.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                발효본 Rev.{sr.rev || 0} · 발효일 {sr.approvedAt} · 승인자 {sr.approvedBy}  (편집하려면 개정을 시작하세요)
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                              <span className="text-[11px] text-slate-400">{r.updatedAt ? '자동 저장됨' : '작성하면 자동 저장됩니다'}</span>
                              <div className="flex items-center gap-2">
                                {st === 'draft' && (
                                  <button onClick={() => submitReview(statusId(it))} disabled={!r.content} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40">검토 요청 →</button>
                                )}
                                {st === 'review' && (
                                  <>
                                    <button onClick={() => reject(statusId(it))} className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">반려</button>
                                    <button onClick={() => reviewDone(statusId(it))} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700">검토 완료 · 승인 상신 →</button>
                                  </>
                                )}
                                {st === 'pending' && (
                                  <>
                                    <button onClick={() => reject(statusId(it))} className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">반려</button>
                                    <button onClick={() => approve(statusId(it))} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">대표 승인 · 발효</button>
                                  </>
                                )}
                                {eff && (
                                  <>
                                    <button onClick={() => distribute(statusId(it))} className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-sky-300 text-sky-700 hover:bg-sky-50"><Send size={12} className="inline mr-1" />배포 등록</button>
                                    <button onClick={() => obsolete(statusId(it))} className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50">폐기</button>
                                    <button onClick={() => revise(statusId(it))} className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50">개정 시작 (Rev.{(sr.rev || 0) + 1})</button>
                                  </>
                                )}
                                {st === 'obsolete' && (
                                  <span className="text-[11.5px] text-rose-600">폐기됨 · {sr.obsoletedAt} · {sr.obsoletedBy} · 사유: {sr.obsoleteReason}</span>
                                )}
                              </div>
                            </div>

                            {Array.isArray(sr.history) && sr.history.length > 0 && (
                              <div className="mt-3 border-t border-slate-100 pt-2">
                                <div className="text-[11px] font-medium text-slate-500 mb-1">결재 이력 (개정이력 포함)</div>
                                <div className="grid gap-0.5">
                                  {sr.history.slice().reverse().map((h, i) => (
                                    <div key={i} className="text-[11px] text-slate-500 tabular-nums">Rev.{h.rev} · {h.action} · {h.by} · {h.at}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {Array.isArray(sr.distribution) && sr.distribution.length > 0 && (
                              <div className="mt-2 border-t border-slate-100 pt-2">
                                <div className="text-[11px] font-medium text-slate-500 mb-1">문서배포기록</div>
                                <div className="grid gap-0.5">
                                  {sr.distribution.slice().reverse().map((d, i) => (
                                    <div key={i} className="text-[11px] text-slate-500 tabular-nums">Rev.{d.rev} → {d.recipient} · {d.by} · {d.at}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
