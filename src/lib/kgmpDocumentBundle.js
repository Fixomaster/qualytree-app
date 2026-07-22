// 인증별(KGMP/수입사GMP/ISO13485) "필요 관련 승인된 문서" 통합 열람 — PDF 다운로드
//
// GMPSection.jsx에서 이미 쓰고 있는 무의존성 PDF 패턴(새 창에 문서 HTML을 그려 넣고
// window.print()를 자동 호출 — 사용자가 인쇄 대화상자에서 "PDF로 저장"을 선택)을 그대로
// 재사용한다. buildKgmpSections()가 계산하는 인증별 체크리스트(공통 제출 문서/기술문서/
// 품질시스템/필수 절차서/유지 기록)를 표로 요약하고, 그 중 실제로 발효(승인)된 절차서·
// 품질매뉴얼 챕터는 본문 전체를 이어붙여 "한 번 클릭 → 승인된 문서 결과를 PDF로 확인"을
// 만족시킨다.

import { buildKgmpSections } from './kgmpProgress'

const OB_KEY = 'qualytree.onboarding'
const DOC_KEY = 'qualytree.documents'

function readOnboarding() {
  try { return JSON.parse(localStorage.getItem(OB_KEY) || '{}') } catch { return {} }
}
function readDocState() {
  try { return JSON.parse(localStorage.getItem(DOC_KEY) || '{}') } catch { return {} }
}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function norm(r) {
  const st = r && r.status
  return (st === 'review' || st === 'pending' || st === 'effective' || st === 'obsolete') ? st : 'draft'
}

const STATUS_LABEL = { done: '완료', partial: '부분', missing: '미비' }
const STATUS_COLOR = { done: '#1a7a4c', partial: '#b8860b', missing: '#c0392b' }

function checklistSectionHtml(section) {
  const rows = section.items.map((it) => {
    const label = STATUS_LABEL[it.status] || it.status
    const color = STATUS_COLOR[it.status] || '#555'
    return (
      '<tr>' +
      '<td style="border:1px solid #ddd;padding:6px 8px;font-size:10pt">' + esc(it.label) + '</td>' +
      '<td style="border:1px solid #ddd;padding:6px 8px;font-size:10pt;color:' + color + ';font-weight:600">' + esc(label) + '</td>' +
      '<td style="border:1px solid #ddd;padding:6px 8px;font-size:10pt">' + esc(it.detail || '') + '</td>' +
      '</tr>'
    )
  }).join('')
  return (
    '<h2 style="font-size:13pt;margin-top:22px;border-bottom:1px solid #ccc;padding-bottom:4px">' + esc(section.title) + '</h2>' +
    '<div style="font-size:10pt;color:#666;margin:4px 0 8px">' + esc(section.subtitle || '') + '</div>' +
    '<table style="border-collapse:collapse;width:100%;margin-bottom:8px">' +
    '<thead><tr>' +
    '<th style="border:1px solid #ccc;padding:6px 8px;background:#f3f4f6;text-align:left;font-size:10pt">항목</th>' +
    '<th style="border:1px solid #ccc;padding:6px 8px;background:#f3f4f6;text-align:left;font-size:10pt">상태</th>' +
    '<th style="border:1px solid #ccc;padding:6px 8px;background:#f3f4f6;text-align:left;font-size:10pt">세부내용</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>'
  )
}

function fullTextDocHtml(title, r) {
  const rev = (r && r.rev) || 0
  const st = norm(r)
  const stLabel = st === 'effective' ? ('발효 Rev.' + rev) : st === 'pending' ? '승인 대기' : st === 'review' ? '검토 중' : ('작성 중 Rev.' + rev)
  const approver = (r && r.approvedBy) || ''
  const approvedAt = (r && r.approvedAt) || ''
  const body = esc((r && r.content) || '(내용 없음)').replace(/\n/g, '<br/>')
  const meta = '<div style="font-size:10pt;color:#555;margin:4px 0 10px">상태: ' + esc(stLabel) + (approver ? (' · 승인자: ' + esc(approver) + ' (' + esc(approvedAt) + ')') : '') + '</div>'
  return (
    '<div style="page-break-inside:avoid;margin-bottom:18px">' +
    '<h3 style="font-size:12.5pt;margin-top:16px;color:#1a1a1a">' + esc(title) + '</h3>' +
    meta +
    '<div style="font-size:10.5pt;line-height:1.7;border-left:3px solid #ddd;padding-left:10px">' + body + '</div>' +
    '</div>'
  )
}

/**
 * profile: buildKgmpSections()가 받는 것과 동일 — 'manufacturer' | 'importer' | 'iso13485'
 * profileLabel: 문서 제목에 표시할 인증 구분 텍스트 (예: 'KGMP', '수입사 GMP(외국제조소)', 'ISO 13485')
 */
export function buildApprovedDocumentBundleHtml(profile, profileLabel) {
  const ob = readOnboarding()
  const docs = readDocState()
  const company = ob.company || {}
  const manualChapters = (ob.manual && Array.isArray(ob.manual.chapters)) ? ob.manual.chapters.filter((c) => c.included !== false) : []
  const procedures = Array.isArray(ob.procedures) ? ob.procedures.filter((p) => p.applicable !== false) : []

  const sections = buildKgmpSections({ profile })
  const today = new Date().toISOString().slice(0, 10)

  const cover =
    '<div style="text-align:center;padding:36px 0 26px">' +
    '<div style="font-size:11pt;color:#888;letter-spacing:2px">QUALYTREE</div>' +
    '<h1 style="font-size:22pt;margin:14px 0 6px">' + esc(profileLabel) + ' 승인 문서 통합본</h1>' +
    '<div style="font-size:11pt;color:#555">' + esc(company.name || '(회사명)') + ' · 생성일 ' + today + '</div>' +
    '</div>'

  const checklist = sections.map(checklistSectionHtml).join('')

  // 발효(승인)된 절차서 전문 — 각 절차서는 Documents.jsx에서 'P-'+id 로 결재·발효된다.
  const effectiveProcedures = procedures
    .map((p) => ({ p, r: docs['P-' + p.id] }))
    .filter(({ r }) => r && norm(r) === 'effective' && r.content)

  // 발효(승인)된 품질매뉴얼 챕터 전문 — 각 챕터는 'M-'+id 로 결재·발효된다.
  const effectiveChapters = manualChapters
    .map((c) => ({ c, r: docs['M-' + c.id] }))
    .filter(({ r }) => r && norm(r) === 'effective' && r.content)

  const procHtml = effectiveProcedures.length
    ? '<h2 style="font-size:13pt;margin-top:26px;border-bottom:1px solid #ccc;padding-bottom:4px">승인된 절차서 전문 (' + effectiveProcedures.length + '건)</h2>' +
      effectiveProcedures.map(({ p, r }) => fullTextDocHtml(p.name, r)).join('')
    : ''

  const manualHtml = effectiveChapters.length
    ? '<h2 style="font-size:13pt;margin-top:26px;border-bottom:1px solid #ccc;padding-bottom:4px">승인된 품질매뉴얼 전문 (' + effectiveChapters.length + '건)</h2>' +
      effectiveChapters.map(({ c, r }) => fullTextDocHtml((c.c ? c.c + '. ' : '') + c.name, r)).join('')
    : ''

  const noApprovedNotice = (!effectiveProcedures.length && !effectiveChapters.length)
    ? '<div style="margin-top:20px;padding:12px;background:#fdf3e6;border:1px solid #f0d9a8;border-radius:6px;font-size:10.5pt;color:#8a5a00">' +
      '아직 발효(승인)된 절차서·품질매뉴얼 문서가 없습니다. 아래 체크리스트 현황을 참고해 문서를 작성·승인한 뒤 다시 시도하세요.' +
      '</div>'
    : ''

  const body = cover + checklist + noApprovedNotice + procHtml + manualHtml

  return (
    '<html><head><meta charset="utf-8"><title>' + esc(profileLabel) + ' 승인 문서 통합본</title></head>' +
    '<body style="font-family:sans-serif;padding:24px;max-width:820px;margin:0 auto;color:#1a1a1a">' + body + '</body></html>'
  )
}

/** GMPSection.jsx와 동일한 무의존성 PDF 다운로드 패턴 — 새 창을 열어 인쇄(→ PDF 저장)한다. */
export function downloadHtmlAsPdf(html) {
  const w = window.open('', '_blank')
  if (!w) { window.alert('팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 시도하세요.'); return }
  const withPrint = html.replace('</body>', '<script>window.onload=function(){setTimeout(function(){window.print()},350)}<\/script></body>')
  w.document.write(withPrint)
  w.document.close()
}
