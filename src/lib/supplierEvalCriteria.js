// src/lib/supplierEvalCriteria.js
// 공급업체 평가 기준(루브릭) + 판정 정책(승인/조건부승인/반려, 등급별 재평가주기) SSoT.
// 공급업체관리(SupplierHub.jsx > 공급업체 평가)에서 사용한다.
// 평가 기준·정책을 수정하면 문서관리(DocControlHub, qualytree.doc_register)의
// "공급업체 평가관리 절차서" 항목이 자동으로 개정(리비전 증가 + 개정이력 추가)된다.

const LS_CRITERIA = 'qualytree.supplier_eval_criteria'
const LS_POLICY = 'qualytree.supplier_eval_policy'
const LS_DOC_REGISTER = 'qualytree.doc_register'

function lsR(key, fb) {
  try { const p = JSON.parse(localStorage.getItem(key) || 'null'); return p ?? fb } catch { return fb }
}
function lsW(key, v) { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* noop */ } }

const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

// ── 기본 평가 기준 (루브릭 5단계: 근거 → 점수) ──────────────────
export const DEFAULT_CRITERIA = [
  { id: 'crit-delivery', name: '납기 준수율', maxScore: 20, levels: [
    { score: 20, label: '우수', desc: '납기 준수율 98% 이상' },
    { score: 15, label: '양호', desc: '납기 준수율 90~97%' },
    { score: 10, label: '보통', desc: '납기 준수율 80~89%' },
    { score: 5, label: '미흡', desc: '납기 준수율 70~79%' },
    { score: 0, label: '불량', desc: '납기 준수율 70% 미만 또는 반복 지연' },
  ] },
  { id: 'crit-quality', name: '품질 합격률', maxScore: 20, levels: [
    { score: 20, label: '우수', desc: 'IQC 합격률 99% 이상, 부적합 0건' },
    { score: 15, label: '양호', desc: 'IQC 합격률 95~98%, 경미한 부적합 1~2건' },
    { score: 10, label: '보통', desc: 'IQC 합격률 90~94%, 부적합 3~5건' },
    { score: 5, label: '미흡', desc: 'IQC 합격률 80~89% 또는 반복 부적합' },
    { score: 0, label: '불량', desc: 'IQC 합격률 80% 미만 또는 중대 부적합(SCAR) 발생' },
  ] },
  { id: 'crit-price', name: '가격 경쟁력', maxScore: 20, levels: [
    { score: 20, label: '우수', desc: '시장 평균 대비 우수, 단가 안정적 유지' },
    { score: 15, label: '양호', desc: '시장 평균 수준' },
    { score: 10, label: '보통', desc: '시장 평균보다 다소 높으나 수용 가능' },
    { score: 5, label: '미흡', desc: '시장 평균 대비 고가, 인상 잦음' },
    { score: 0, label: '불량', desc: '가격 경쟁력 없음, 예고 없는 인상' },
  ] },
  { id: 'crit-qms', name: '품질시스템 수준', maxScore: 20, levels: [
    { score: 20, label: '우수', desc: 'ISO 13485 등 인증 보유 + 최신 유효' },
    { score: 15, label: '양호', desc: 'ISO 9001 등 인증 보유' },
    { score: 10, label: '보통', desc: '인증 없으나 문서화된 품질 절차 보유' },
    { score: 5, label: '미흡', desc: '품질시스템 체계 미흡' },
    { score: 0, label: '불량', desc: '품질시스템 부재 또는 인증 만료·정지' },
  ] },
  { id: 'crit-response', name: '대응성·서비스', maxScore: 20, levels: [
    { score: 20, label: '우수', desc: '즉시 대응, 클레임 처리 신속' },
    { score: 15, label: '양호', desc: '대체로 신속한 대응' },
    { score: 10, label: '보통', desc: '보통 수준의 대응' },
    { score: 5, label: '미흡', desc: '대응 지연 잦음' },
    { score: 0, label: '불량', desc: '연락 두절 또는 클레임 미처리' },
  ] },
]

// ── 기본 판정 정책 ────────────────────────────────────────────
export const DEFAULT_POLICY = {
  approveMin: 75,       // 종합 점수(%) 이 값 이상 → 승인
  conditionalMin: 60,   // 이 값 이상 ~ approveMin 미만 → 조건부 승인, 미만 → 반려
  reevalYears: { A: 3, B: 2, C: 1, D: 1 }, // 등급별 재평가 주기(년)
  alertDaysBefore: 30,  // 재평가 예정일 며칠 전부터 알림 표시
}

export function loadCriteria() {
  const v = lsR(LS_CRITERIA, null)
  if (Array.isArray(v) && v.length) return v
  lsW(LS_CRITERIA, DEFAULT_CRITERIA)
  return DEFAULT_CRITERIA
}
export function saveCriteria(list) { lsW(LS_CRITERIA, list); return list }

export function loadPolicy() {
  const v = lsR(LS_POLICY, null)
  if (v && typeof v === 'object') {
    return { ...DEFAULT_POLICY, ...v, reevalYears: { ...DEFAULT_POLICY.reevalYears, ...(v.reevalYears || {}) } }
  }
  lsW(LS_POLICY, DEFAULT_POLICY)
  return DEFAULT_POLICY
}
export function savePolicy(p) { lsW(LS_POLICY, p); return p }

export function newCriterion() {
  return {
    id: uid('crit'), name: '', maxScore: 20,
    levels: [
      { score: 20, label: '우수', desc: '' },
      { score: 15, label: '양호', desc: '' },
      { score: 10, label: '보통', desc: '' },
      { score: 5, label: '미흡', desc: '' },
      { score: 0, label: '불량', desc: '' },
    ],
  }
}
export function newLevel() { return { score: 0, label: '', desc: '' } }

export function maxTotal(criteria) {
  return (criteria || []).reduce((a, c) => a + (+c.maxScore || 0), 0)
}

// 등급(A~D) — 종합 점수(%) 기준 고정 컷 (배지 표시용)
export function gradeFromPct(pct) {
  if (pct >= 90) return 'A'
  if (pct >= 75) return 'B'
  if (pct >= 60) return 'C'
  return 'D'
}

// 승인 상태 — 정책(policy) 기준으로 판정. 0점이면 항상 반려로 귀결된다.
export function statusFromPct(pct, policy) {
  const p = policy || DEFAULT_POLICY
  if (pct >= p.approveMin) return 'approved'
  if (pct >= p.conditionalMin) return 'conditional'
  return 'rejected'
}

export function reevalCycleYears(grade, policy) {
  const p = policy || DEFAULT_POLICY
  return p.reevalYears?.[grade] || 1
}

export function addMonths(dateStr, months) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

export function nextReevalDate(evaluatedAt, grade, policy) {
  return addMonths(evaluatedAt, reevalCycleYears(grade, policy) * 12)
}

// selections: [{criterionId, criterionName, levelIndex, levelLabel, levelScore, levelDesc, maxScore}]
export function scoreFromSelections(selections, criteria) {
  const total = (selections || []).reduce((a, s) => a + (+s.levelScore || 0), 0)
  const max = maxTotal(criteria)
  const pct = max > 0 ? Math.round((total / max) * 100) : 0
  return { total, max, pct }
}

// ── 절차서 연동 (qualytree.doc_register — 문서·규정 › 문서관리 화면과 동일 데이터) ──
const PROC_TITLE = '공급업체 평가관리 절차서'
const PROC_DOCNO = 'SOP-SUPEVAL-01'

function genDocId() { return `DOC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function bumpRev(rev) {
  const n = parseInt(String(rev || 'Rev.0').replace(/[^0-9]/g, ''), 10) || 0
  return `Rev.${n + 1}`
}

function buildProcedureText(criteria, policy) {
  const lines = []
  lines.push('1. 목적')
  lines.push('본 절차서는 ISO 13485 §7.4.1 및 KGMP 제22조에 따라 공급업체를 정기적으로 평가하고,')
  lines.push('평가 결과에 따른 승인 등급·상태·재평가 주기를 결정하는 기준을 정한다.')
  lines.push('')
  lines.push('2. 평가 항목 및 배점 (근거 기반 루브릭)')
  ;(criteria || []).forEach((c, i) => {
    lines.push(`  ${i + 1}) ${c.name} (배점 ${c.maxScore}점)`)
    ;(c.levels || []).forEach(l => lines.push(`     - ${l.label} ${l.score}점: ${l.desc || '(설명 미입력)'}`))
  })
  lines.push(`  총점: ${maxTotal(criteria)}점 (평가 시 각 항목의 근거를 선택하여 점수를 산출한다)`)
  lines.push('')
  lines.push('3. 판정 기준 (종합 점수 = 취득점수 ÷ 총점 × 100%)')
  lines.push(`  - ${policy.approveMin}% 이상: 승인`)
  lines.push(`  - ${policy.conditionalMin}% 이상 ~ ${policy.approveMin}% 미만: 조건부 승인 (개선 요구 후 모니터링)`)
  lines.push(`  - ${policy.conditionalMin}% 미만: 반려 / 승인 정지 (거래 중단 검토)`)
  lines.push('')
  lines.push('4. 등급별 재평가 주기')
  ;['A', 'B', 'C', 'D'].forEach(g => lines.push(`  - ${g}등급: ${policy.reevalYears?.[g] || 1}년마다 1회`))
  lines.push(`  재평가 예정일 ${policy.alertDaysBefore}일 전부터 공급업체관리 화면에 알림이 표시된다.`)
  lines.push('')
  lines.push('5. 동일 연도 복수 평가')
  lines.push('  동일 연도에 재평가·특별평가 등을 복수 실시하는 경우 "연도-회차"(예: 2026-1, 2026-2)로 구분하여 이력을 관리한다.')
  return lines.join('\n')
}

export function syncCriteriaToProcedureDoc(criteria, policy, author) {
  try {
    const list = lsR(LS_DOC_REGISTER, [])
    const idx = list.findIndex(d => d.title === PROC_TITLE)
    const text = buildProcedureText(criteria, policy)
    const now = new Date().toISOString().slice(0, 10)
    if (idx >= 0) {
      const cur = list[idx]
      const rev = bumpRev(cur.revision)
      const updated = {
        ...cur,
        revision: rev,
        purpose: text,
        scope: cur.scope || '공급업체 등록·평가·승인·재평가 전 과정',
        status: (cur.status === 'approved' || cur.status === 'distributed') ? 'review' : (cur.status || 'draft'),
        reviewDate: now,
        revisionHistory: [
          { rev, date: now, change: '평가기준·판정정책 개정 (공급업체관리 화면에서 자동 반영)', by: author || '-' },
          ...(cur.revisionHistory || []),
        ],
      }
      lsW(LS_DOC_REGISTER, list.map((d, i) => (i === idx ? updated : d)))
      return updated
    }
    const rec = {
      id: genDocId(), docNo: PROC_DOCNO, title: PROC_TITLE, type: 'SOP', status: 'draft',
      revision: 'Rev.1', issueDate: now, approvedDate: '', reviewDate: now,
      author: author || '-', reviewer: '', approver: '',
      ownerDept: '구매부(PUR)', distributionList: [], retentionPeriod: '3년',
      relatedStandard: 'ISO 13485 §7.4.1', linkedHubId: '/supplier',
      supersededBy: '', supersedes: '',
      scope: '공급업체 등록·평가·승인·재평가 전 과정',
      purpose: text,
      revisionHistory: [{ rev: 'Rev.1', date: now, change: '최초 제정 (공급업체관리 화면에서 자동 생성)', by: author || '-' }],
      notes: '이 절차서는 공급업체관리 > 공급업체 평가 화면의 평가 기준·판정 정책이 변경될 때마다 자동으로 개정됩니다.',
      createdAt: new Date().toISOString(),
    }
    lsW(LS_DOC_REGISTER, [rec, ...list])
    return rec
  } catch { return null }
}
