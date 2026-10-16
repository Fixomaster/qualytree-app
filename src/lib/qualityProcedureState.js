// src/lib/qualityProcedureState.js
// 품질절차서 — 절차서 제목 > 주제/상세내용 구조, 개정이력, 다른 메뉴 정보 연동 토큰
// 저장: localStorage('qualytree.*') → cloudSync가 Supabase company_data에 자동 동기화
import { loadCompanyMaster, companyDocs } from './companyState'

export const QP_KEY = 'qualytree.quality_procedures'
export const QP_REV_KEY = 'qualytree.quality_procedure_revisions'
const MAX_REV = 150

const uid = () => 'qp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// 기본 절차서 제목 (예제 엑셀 '품질 절차서 (list).xlsx')
const DEFAULT_TITLES = ['문서 및 기록관리', '도면 관리', '경영검토', '교육훈련', '환경관리', '위험관리', '고객관리', '설계개발', '구매관리', '공정관리', '제품관리', '장비관리', '의료기기통합정보관리', '사용적합성', '소프트웨어', '고객불만', '내부감사', '검사 및 시험', '부적합품', '데이터분석', '시정조치', '안전성 정보 관리', '프로세스 관리']

// 첫 절차서(문서 및 기록관리)의 주제 목차 — [번호, 주제]
const DOC_RECORD_OUTLINE = [
  ['1', '적용범위 및 목적'], ['2', '용어의 정의'],
  ['2.1', '품질기록'], ['2.2', '일반기록'], ['2.3', '보관'], ['2.4', '보존'], ['2.5', '보관문서'], ['2.6', '보존문서'], ['2.7', '보존 년한'], ['2.8', '이관'], ['2.9', '폐기'],
  ['3', '책임과 권한'], ['3.1', '대표이사'], ['3.2', '품질책임자'], ['3.3', '품질관리부서장'], ['3.4', '해당 부서장'],
  ['4', '업무절차'], ['4.1', '문서 관리 기준'], ['4.1.1', '품질문서 체계'], ['4.1.2', '품질문서 번호 부여 기준'], ['4.1.3', '양식번호'],
  ['4.2', '문서 관리 절차'], ['4.2.1', '품질문서 제정 및 승인'], ['4.2.2', '문서개정(변경)'], ['4.2.3', '등록 및 배포'], ['4.2.4', '보관, 회수 및 폐기'], ['4.2.5', '열람 및 대출'],
  ['4.3', '외부출처문서 관리'], ['4.4', '컴퓨터 또는 디스켓의 관리'], ['4.4.1', '바이러스 체크'], ['4.4.2', '품질문서의 백업 관리'],
  ['4.5', '기록관리'], ['4.5.1', '기록관리 일반'], ['4.5.2', '수집 및 식별'], ['4.5.3', '보관 및 보호'], ['4.5.4', '검색'], ['4.5.5', '보유기간 및 처분'],
  ['5', '관련 표준'], ['6', '관련 기록'],
]
// 연동 토큰이 들어간 기본 문구 (다른 메뉴 정보가 바뀌면 자동 반영)
const DEFAULT_CONTENT = {
  '1': '<p>이 절차서는 {{회사명}}의 품질경영시스템에서 사용하는 문서와 기록의 작성, 승인, 배포, 개정, 보관, 폐기에 관한 사항을 규정함을 목적으로 한다.</p>',
  '3.1': '<p>{{회사명}} 대표이사({{대표이사}})는 품질문서의 최종 승인 책임을 가진다.</p>',
  '3.2': '<p>품질책임자({{품질책임자}})는 품질문서의 제·개정 검토 및 배포, 기록의 관리 상태를 확인한다.</p>',
  '3.3': '<p>품질관리부서장({{품질관리부서장}})은 문서의 등록, 배포 및 회수를 관리한다.</p>',
}

export function seedProcedures() {
  return DEFAULT_TITLES.map((title, i) => ({
    id: uid(), title, updated_at: null,
    items: i === 0 ? DOC_RECORD_OUTLINE.map(([no, topic]) => ({ id: uid(), no, topic, content: DEFAULT_CONTENT[no] || '' })) : [],
  }))
}

function readJson(key, fb) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fb } catch { return fb } }

export function loadProcedures() {
  const cur = readJson(QP_KEY, null)
  if (Array.isArray(cur)) return cur
  const seeded = seedProcedures()
  try { localStorage.setItem(QP_KEY, JSON.stringify(seeded)) } catch {}
  return seeded
}
export function saveProcedures(list) { localStorage.setItem(QP_KEY, JSON.stringify(list)) }
export function loadProcRevisions() { const r = readJson(QP_REV_KEY, []); return Array.isArray(r) ? r : [] }

/** 절차서 1건 저장 + 개정이력(스냅샷) 기록. note: 저장 메모 */
export function saveProcedure(proc, by = '', note = '저장', effectiveDate = '', revNo = '') {
  const now = new Date().toISOString()
  const next = { ...proc, updated_at: now }
  const list = loadProcedures()
  const exists = list.some(p => p.id === proc.id)
  saveProcedures(exists ? list.map(p => p.id === proc.id ? next : p) : [...list, next])
  const revs = loadProcRevisions()
  const prev = revs.find(r => r.procedure_id === proc.id && r.snapshot)
  const norm = (v) => String(v || '').replace(/\s+/g, ' ').trim()
  const changed = []
  proc.items.forEach(i => {
    const o = prev?.snapshot.items.find(x => x.id === i.id)
    if (!o) { if (isFilled(i.content) || i.topic) changed.push(`${i.no} ${i.topic} 추가`) }
    else if (norm(o.content) !== norm(i.content) || o.topic !== i.topic || o.no !== i.no) changed.push(`${i.no} ${i.topic} 수정`)
  })
  ;(prev?.snapshot.items || []).forEach(o => { if (!proc.items.some(i => i.id === o.id)) changed.push(`${o.no} ${o.topic} 삭제`) })
  const summary = prev ? (changed.length ? changed.join(', ') : '제목/구성 변경') : '제정'
  revs.unshift({ id: uid(), procedure_id: proc.id, procedure_title: proc.title, snapshot: { title: proc.title, items: proc.items.map(i => ({ ...i })) }, created_at: now, created_by: by, note, effective_date: effectiveDate || now.slice(0, 10), rev_no: String(revNo || '').trim(), summary })
  localStorage.setItem(QP_REV_KEY, JSON.stringify(revs.slice(0, MAX_REV)))
  return next
}

/** 절차서 삭제 (이력은 보존, 삭제 사실 기록) */
export function deleteProcedure(id, by = '') {
  const list = loadProcedures()
  const target = list.find(p => p.id === id)
  saveProcedures(list.filter(p => p.id !== id))
  if (target) {
    const revs = loadProcRevisions()
    revs.unshift({ id: uid(), procedure_id: id, procedure_title: target.title, snapshot: null, created_at: new Date().toISOString(), created_by: by, note: '절차서 삭제' })
    localStorage.setItem(QP_REV_KEY, JSON.stringify(revs.slice(0, MAX_REV)))
  }
}

export function newProcedure(title) { return { id: uid(), title, updated_at: null, items: [] } }
export function newItem(no = '', topic = '') { return { id: uid(), no, topic, content: '' } }

export function isFilled(html) { return !!String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() || /<img|<table/i.test(html || '') }

// ── 다른 메뉴 정보 연동 ───────────────────────────────────────────────────────
export const TOKEN_HELP = [
  ['{{회사명}}', '기본정보 › 회사명'],
  ['{{대표이사}}', '기본정보 › 대표이사'],
  ['{{품질책임자}}', '품질책임자 지정 / 기본정보 › 품질관리자'],
  ['{{품질관리부서장}}', '조직·책임 › 품질 부서장 (없으면 품질책임자)'],
  ['{{주소}}', '기본정보 › 주소'],
  ['{{제조업허가번호}}', '기본정보 › 제조업허가번호'],
  ['{{GMP인증번호}}', '기본정보 › GMP 인증번호'],
  ['{{ISO13485인증번호}}', '기본정보 › ISO 13485 인증번호'],
]

export function getLinkContext() {
  const m = loadCompanyMaster()
  let ob = {}; try { ob = JSON.parse(localStorage.getItem('qualytree.onboarding') || '{}')?.company || {} } catch {}
  let qm = null; try { qm = companyDocs.getQualityManager() } catch {}
  let orgHead = ''
  try {
    const roles = JSON.parse(localStorage.getItem('qualytree.org_roles') || '[]')
    const qr = (Array.isArray(roles) ? roles : []).filter(r => /품질/.test(`${r.dept || ''}${r.title || ''}`) && r.name)
    const head = qr.find(r => /부서장|팀장|부장|실장|책임자/.test(r.title || '')) || qr[0]
    orgHead = head ? head.name : ''
  } catch {}
  const qMgr = qm?.name || m.qmgr || ''
  return {
    '회사명': m.companyName || ob.name || '',
    '대표이사': m.ceoName || ob.ceo || '',
    '품질책임자': qMgr,
    '품질관리부서장': orgHead || qMgr,
    '주소': m.address || ob.address || '',
    '제조업허가번호': m.mdLicenseNumber || '',
    'GMP인증번호': m.gmpCertNumber || '',
    'ISO13485인증번호': m.iso13485Number || '',
  }
}

/** {{토큰}} 치환. 값이 없으면 [미입력: 이름]으로 표시 */
export function resolveTokens(html, ctx = getLinkContext()) {
  let src = String(html || '')
  if (!/<[a-z][\s\S]*>/i.test(src) && /\{\{/.test(src)) src = '<div style="white-space:pre-wrap">' + esc(src).replace(/\{\{/g,'{{') + '</div>'
  return src.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, k) => ctx[k] ? esc(ctx[k]) : (k in ctx ? `<span style="color:#b45309;background:#fef3c7;padding:0 4px;border-radius:3px">[미입력: ${esc(k)}]</span>` : `{{${k}}}`))
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }

/** 절차서별 개정이력표 행(오래된 순). 개정번호는 입력값 우선, 없으면 절차서별 순번(제정(0), Rev.1…) */
export function buildProcRevisionRows(revisions, procedureId = null) {
  const sorted = [...revisions].filter(r => r.created_at && (!procedureId || r.procedure_id === procedureId)).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const cnt = {}
  return sorted.map(r => {
    const idx = cnt[r.procedure_id] = (cnt[r.procedure_id] ?? -1) + 1
    const d = r.effective_date ? String(r.effective_date).slice(0, 10) : String(r.created_at).slice(0, 10)
    return {
      rev: r.rev_no || (idx === 0 ? '제정(0)' : 'Rev.' + idx), date: d,
      reason: r.note && r.note !== '저장' ? r.note : (idx === 0 ? '신규 제정' : '내용 수정'),
      content: (procedureId ? '' : r.procedure_title + ': ') + (r.summary || (r.snapshot ? (idx === 0 ? '제정' : '개정') : '삭제')),
    }
  })
}

/** 특정 시점(idx까지)의 전체 절차서 상태 복원: { procedureId: snapshot } */
export function snapshotAt(revisionsOldestFirst, idx) {
  const map = {}
  for (let i = 0; i <= idx && i < revisionsOldestFirst.length; i++) {
    const r = revisionsOldestFirst[i]
    if (r.snapshot) map[r.procedure_id] = r.snapshot; else delete map[r.procedure_id]
  }
  return map
}
