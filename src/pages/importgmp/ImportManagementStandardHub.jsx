// src/pages/importgmp/ImportManagementStandardHub.jsx
// 수입관리기준서 — 「의료기기법 시행규칙」 및 「수입 의료기기 GMP 심사 세부운영 가이드라인」에 따라
// 수입업자가 갖추어야 하는 수입관리 절차 기준 문서. (#299)
//
// #26 재설계 — 기준서(정책 수준 원칙)와 절차서(실행 단계·화면 연계)를 항목별로 분리한다.
// #27/#28 재설계 — 개정 시 개정이력이 실제로 누적되지 않던 버그를 수정하고, 개정번호를 클릭하면
//   해당 시점의 스냅샷(당시 기준서·절차서 내용)을 열람할 수 있도록 한다.
// #29 재설계 — 개정번호는 더 이상 자유 입력이 아니라 승인이 완료될 때마다 시스템이 자동으로
//   부여한다(Rev.0 → Rev.1 → ...).
// #30 재설계 — "승인자" 단일 입력 필드를 삭제하고, 로그인한 사용자가 작성→검토→승인 순서로
//   직접 처리하는 워크플로우로 전환한다. 검토·승인 대기 중에는 "내 할 일"(DeptHome)에 노출된다.
import React, { useState } from 'react'
import { FileText, Edit2, Save, Trash2, XCircle, ClipboardList, Sparkles, Loader2, History, CheckCircle2, Clock, PenLine, Scroll } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import CertGate from '../../components/CertGate'
import { auth } from '../../lib/auth'
import { permissions, requirePermission } from '../../lib/permissions'

const LS_KEY = 'qualytree.import_management_standard'
function today() { return new Date().toISOString().slice(0, 10) }
function now() { return new Date().toISOString() }

const SECTIONS = [
  {
    key: 'scope', label: '1. 목적 및 적용범위',
    policyDefault:
      '본 기준서는 「의료기기법 시행규칙」 제32조 및 「수입 의료기기 GMP 심사 세부운영 가이드라인」에 따라 당사가 수입하여 국내에 유통하는 모든 의료기기에 대한 수입관리의 기본 방침을 규정한다. ' +
      '수입업 허가(신고)를 득한 전 품목에 적용하며, 외국제조소 선정부터 통관, 보관·유통, 사후관리(불만처리·이상사례보고·회수)까지 전 과정을 대상으로 한다.',
    procedureDefault:
      '1) 신규 품목 도입 시 본 기준서의 적용 대상 여부를 확인한다. 2) 각 조항의 세부 실행 절차는 아래 관련 화면과 연계하여 기록·관리한다. 3) 기준서 개정 시 관련 절차서·기록양식도 함께 검토한다.',
  },
  {
    key: 'organization', label: '2. 수입관리 조직 및 책임 (수입관리책임자·품질책임자)',
    policyDefault:
      '수입관리책임자는 수입 품목의 품목허가 유지, 외국제조소 관리, 통관·수입검사 총괄을 담당하며, 품질책임자는 수입검사 기준 설정 및 부적합품 처리를 담당한다. ' +
      '양 책임자는 상호 독립적으로 직무를 수행하는 것을 원칙으로 한다.',
    procedureDefault:
      '1) 수입관리책임자·품질책임자 지정 현황은 기본정보 화면의 조직도·품질책임자 지정 정보에서 관리한다. 2) 책임자 변경 시 조직도를 즉시 갱신하고 변경 이력을 남긴다.',
  },
  {
    key: 'siteSelection', label: '3. 외국제조소 선정 및 관리 기준 (GMP 적합인정서 확인·실사)',
    policyDefault:
      '외국제조소는 등록 전 GMP 적합인정서(또는 이에 준하는 인증서) 및 실사자료를 확인하여 선정하며, 위해우려제조소에 해당하는 경우 강화된 관리를 적용한다.',
    procedureDefault:
      '1) 신규 외국제조소 등록 전 GMP 적합인정서 유효기간 및 실사자료 보유 여부를 확인한다. 2) 선정·관리 현황은 "외국제조소" 화면에서 제조소별로 관리한다. 3) 적합인정서 만료가 임박한 경우(만료 90일 전) 갱신을 진행하고 특이사항이 있으면 강화 관리 표시를 남긴다.',
  },
  {
    key: 'licenseManagement', label: '4. 품목허가 및 수입신고 관리',
    policyDefault:
      '수입 품목은 「의료기기법」에 따른 허가·신고·인증을 취득한 후에만 유통하며, 허가사항 변경 시 지체 없이 갱신한다.',
    procedureDefault:
      '1) 품목별 허가번호·인증번호·발급일은 "품목허가현황" 화면에서 제조소별·품목별로 등록·관리한다. 2) 허가사항(제조소·규격 등) 변경 발생 시 허가변경 절차를 진행하고 변경 이력을 기록한다.',
  },
  {
    key: 'clearanceInspection', label: '5. 통관 및 수입검사 기준',
    policyDefault:
      '통관되는 모든 품목은 로트(LOT)별 수입검사를 거쳐 합격 판정된 제품만 국내 유통하며, 판정 결과와 근거 서류를 보존한다.',
    procedureDefault:
      '1) 통관 시 수입신고서, 품목허가증, 시험성적서 등 관련 서류를 확인한다. 2) 통관 및 수입검사 기록은 "수입통관기록" 화면에서 통관번호 단위로 관리하며, 하나의 통관번호에 여러 모델이 포함되는 경우도 함께 기록한다. 3) 부적합 판정 시 격리·반품 등 후속 조치를 기록한다.',
  },
  {
    key: 'storageDistribution', label: '6. 보관 및 유통관리 기준',
    policyDefault:
      '수입 제품은 라벨에 명시된 보관조건을 준수하여 보관하고, 선입선출(FIFO) 원칙에 따라 출고하며, 유통 이력은 로트 단위로 추적 가능하도록 관리한다.',
    procedureDefault:
      '1) 입고 시 보관 조건(온도·습도 등) 적합 여부를 확인한다. 2) 재고 및 입출고 현황은 "수입통관기록" 화면의 재고현황 탭에서 확인한다. 3) 회수 등 사후조치가 필요한 경우 로트 추적 결과를 근거로 유통처를 확정한다.',
  },
  {
    key: 'complaintReporting', label: '7. 불만처리 및 이상사례 보고 연계',
    policyDefault:
      '고객불만은 접수 즉시 등록하고, 이 중 이상사례(부작용) 해당 여부를 품질부서가 검토하여 「의료기기법」상 의무보고 대상인 경우 식약처에 보고한다.',
    procedureDefault:
      '1) 고객불만·이상사례 등록 및 원인조사·조치결과 기록은 "이상사례보고" 화면에서 관리한다. 2) MFDS 의무보고 4대 기준 해당 여부를 체크리스트로 판단하고, 해당 시 규제보고 정보(보고일·접수번호)를 기록한다.',
  },
  {
    key: 'recall', label: '8. 회수(Recall) 절차',
    policyDefault:
      '제품 결함, 이상사례, 규제기관 조치 등으로 회수가 필요하다고 판단되는 경우 위해성 등급을 평가하여 회수 등급(1~3등급)을 결정하고, 관련 법령에 따라 회수계획을 수립·시행 및 사후 보고한다.',
    procedureDefault:
      '1) 로트 추적 결과를 근거로 회수 대상 유통처를 확정한다. 2) 회수 진행 상황(통보·회수량·폐기 등)을 기록·보관한다. 3) 회수 종료 후 결과보고서를 작성하여 규제기관에 제출한다.',
  },
  {
    key: 'recordKeeping', label: '9. 기록의 관리 및 보존',
    policyDefault:
      '수입관리 관련 기록(허가·통관·수입검사·보관유통·불만처리·회수 기록 등)은 관련 법령 및 사내 문서관리 절차에 따른 보존기간 동안 보관한다.',
    procedureDefault:
      '1) 전자기록(본 시스템)으로 관리하여 필요 시 즉시 조회·출력할 수 있도록 한다. 2) 보존기간이 경과한 기록은 문서관리 절차에 따라 폐기 여부를 결정한다.',
  },
]

const DOC_STATUS = {
  draft:    { label: '기안 중',    color: '#6B7280', bg: '#F3F4F6' },
  review:   { label: '검토 대기',  color: '#D97706', bg: '#FEF3C7' },
  approval: { label: '승인 대기',  color: '#2563EB', bg: '#DBEAFE' },
  approved: { label: '승인 완료',  color: '#059669', bg: '#D1FAE5' },
}

function defaultSections() {
  const s = {}
  SECTIONS.forEach(({ key, policyDefault, procedureDefault }) => {
    s[key] = { policy: policyDefault, procedure: procedureDefault }
  })
  return s
}

function defaultStandard() {
  return {
    docNo: 'IMS-001',
    revision: 'Rev.0',
    issueDate: today(),
    docStatus: 'draft',
    draftedBy: '', draftedAt: '',
    reviewedBy: '', reviewedAt: '',
    approvedBy: '', approvedAt: '',
    sections: defaultSections(),
    revisionHistory: [],
  }
}

// #26 마이그레이션 — 이전 버전은 섹션 내용이 문자열 하나로 저장되어 있었다(절차서 성격의 글이
// 기준서 자리에 들어가 있던 문제 그 자체). 기존 값은 절차서 칸으로 이관하고 정책 칸은 표준 문구로 채운다.
function migrateOld(raw) {
  const base = defaultStandard()
  const sections = defaultSections()
  SECTIONS.forEach(({ key }) => {
    if (typeof raw[key] === 'string' && raw[key].trim()) {
      sections[key] = { policy: sections[key].policy, procedure: raw[key] }
    }
  })
  return {
    ...base,
    docNo: raw.docNo || base.docNo,
    revision: raw.revision || base.revision,
    issueDate: raw.issueDate || base.issueDate,
    approvedBy: raw.approvedBy || '',
    docStatus: raw.approvedBy ? 'approved' : 'draft',
    sections,
    revisionHistory: Array.isArray(raw.revisionHistory) ? raw.revisionHistory : [],
  }
}

function loadStandard() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return defaultStandard()
    const parsed = JSON.parse(raw)
    if (!parsed.sections) return migrateOld(parsed)
    const base = defaultStandard()
    return { ...base, ...parsed, sections: { ...base.sections, ...parsed.sections } }
  } catch { return defaultStandard() }
}
function saveStandard(v) { localStorage.setItem(LS_KEY, JSON.stringify(v)) }

export default function ImportManagementStandardHub() {
  const user = auth.current()
  const canEdit = permissions.can('importgmp.site.edit')
  const [standard, setStandard] = useState(loadStandard)
  const update = (next) => { setStandard(next); saveStandard(next) }

  return (
    <AppLayout user={user} title="수입관리기준서" subtitle="수입 의료기기 수입관리 절차 기준 문서">
      <HubBanner icon={Scroll} title="수입관리기준서" subtitle="수입GMP 수입관리기준서 관리" color="#0D9488" />
      <CertGate certId="kgmp_importer" label="수입 GMP">
        <div className="px-6 lg:px-8 py-6 max-w-[1100px] mx-auto fade-in">
            title="수입관리기준서"
            subtitle="수입 의료기기 GMP 심사 세부운영 가이드라인 · 수입관리 절차 기준 문서"
            icon={ClipboardList}
            color="#2563EB"
          />
          <div className="mt-5">
            <PolicyTab standard={standard} setStandard={update} canEdit={canEdit} user={user} />
          </div>
        </div>
      </CertGate>
    </AppLayout>
  )
}

function PolicyTab({ standard, setStandard, canEdit, user }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(standard)
  const [aiSectionKey, setAiSectionKey] = useState(null)
  const [viewTab, setViewTab] = useState('policy') // #26: 기준서 / 절차서 탭
  const [viewRev, setViewRev] = useState(null) // #28: 개정 이력 클릭 시 스냅샷 열람

  const upd = (k, field) => (e) => setDraft((d) => ({
    ...d, sections: { ...d.sections, [k]: { ...d.sections[k], [field]: e.target.value } },
  }))
  const openEdit = () => {
    if (!requirePermission('importgmp.site.edit')) return
    setDraft({ ...standard, sections: { ...standard.sections } }); setEditing(true)
  }
  const save = () => { setStandard(draft); setEditing(false) }

  const st = DOC_STATUS[standard.docStatus] || DOC_STATUS.draft
  const userName = user?.name || user?.email || '(알 수 없음)'

  // #30 — 작성 → 검토 → 승인. 로그인한 사용자가 각 단계를 직접 처리하며, 승인이 완료되는
  // 순간 개정번호가 자동으로 하나 올라가고(#29) 개정이력에 스냅샷이 실제로 누적된다(#27/#28).
  const doSubmitForReview = () => {
    if (!requirePermission('importgmp.site.edit')) return
    setStandard({ ...standard, docStatus: 'review', draftedBy: userName, draftedAt: now() })
  }
  const doCompleteReview = () => {
    if (!requirePermission('importgmp.site.edit')) return
    setStandard({ ...standard, docStatus: 'approval', reviewedBy: userName, reviewedAt: now() })
  }
  const doApprove = () => {
    if (!requirePermission('importgmp.site.edit')) return
    const summary = window.prompt('이번 개정에 대한 변경 요약을 입력하세요.', '') || ''
    const nextRevNo = (standard.revisionHistory || []).length + 1
    const revLabel = `Rev.${nextRevNo}`
    const approvedAt = now()
    const entry = {
      revision: revLabel,
      date: approvedAt.slice(0, 10),
      by: userName,
      draftedBy: standard.draftedBy,
      reviewedBy: standard.reviewedBy,
      summary,
      // #28: 해당 개정 시점의 전체 기준서·절차서 내용을 스냅샷으로 보존한다.
      snapshot: { sections: standard.sections, docNo: standard.docNo, issueDate: standard.issueDate },
    }
    setStandard({
      ...standard,
      revision: revLabel,
      docStatus: 'approved',
      approvedBy: userName,
      approvedAt,
      revisionHistory: [...(standard.revisionHistory || []), entry],
    })
  }
  // 승인 완료된 기준서를 다시 편집하면 새로운 개정 주기(기안)로 되돌아간다.
  const reopenForEdit = () => setStandard({ ...standard, docStatus: 'draft', draftedBy: '', draftedAt: '', reviewedBy: '', reviewedAt: '' })

  return (
    <div>
      {/* 문서 헤더 — 읽기 전용 뷰 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>수입관리기준서</div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
            Import Management Standard · 문서번호 {standard.docNo} · <b>{standard.revision}</b>
          </div>
        </div>
        {canEdit && (
          <button onClick={openEdit} style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
            background: 'var(--moss)', color: '#fff', border: 'none',
            borderRadius: 6, padding: '7px 14px', cursor: 'pointer',
          }}><Edit2 size={13} /> 기준서 편집</button>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 16, padding: '8px 12px', background: 'var(--bg-soft)', borderRadius: 6 }}>
        이 화면은 수입관리기준서 내용을 조회 전용으로 표시합니다. 기준서가 수정되면 이 화면에도 즉시 동일한 내용이 반영됩니다.
      </div>

      {/* #30 — 작성/검토/승인 워크플로우 상태 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: st.bg, border: `1px solid ${st.color}40`, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: st.color }}>{st.label}</span>
        <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
          작성 {standard.draftedBy ? `✓ ${standard.draftedBy}` : '대기'} · 검토 {standard.reviewedBy ? `✓ ${standard.reviewedBy}` : '대기'} · 승인 {standard.approvedBy ? `✓ ${standard.approvedBy} (${standard.approvedAt?.slice(0, 10) || ''})` : '대기'}
        </span>
        {canEdit && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {standard.docStatus === 'draft' && (
              <button onClick={doSubmitForReview} style={wfBtn('#D97706')}><PenLine size={12} /> 작성 완료 (검토 요청)</button>
            )}
            {standard.docStatus === 'review' && (
              <button onClick={doCompleteReview} style={wfBtn('#2563EB')}><CheckCircle2 size={12} /> 검토 완료 (승인 요청)</button>
            )}
            {standard.docStatus === 'approval' && (
              <button onClick={doApprove} style={wfBtn('#059669')}><CheckCircle2 size={12} /> 승인</button>
            )}
            {standard.docStatus === 'approved' && (
              <button onClick={reopenForEdit} style={wfBtn('#6B7280')}><Edit2 size={12} /> 새 개정 시작</button>
            )}
          </div>
        )}
      </div>

      {/* 문서 메타 정보 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)' }}>개정번호 (승인 시 자동 부여)</div>
          <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 3 }}>{standard.revision || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)' }}>발행일</div>
          <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 3 }}>{standard.issueDate || '—'}</div>
        </div>
      </div>

      {/* #26 — 기준서(정책) / 절차서(실행 절차) 탭 전환 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[['policy', '기준서 (정책·원칙)'], ['procedure', '절차서 (세부 실행 절차)']].map(([v, l]) => (
          <button key={v} onClick={() => setViewTab(v)} style={{
            fontSize: 12.5, fontWeight: 600, padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
            border: `1px solid ${viewTab === v ? 'var(--moss)' : 'var(--line)'}`,
            background: viewTab === v ? 'var(--leaf-soft)' : 'var(--bg-card)',
            color: viewTab === v ? 'var(--moss)' : 'var(--ink-soft)',
          }}>{l}</button>
        ))}
      </div>

      {/* 문서 본문 — 읽기 전용 */}
      {SECTIONS.map(({ key, label }) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 5 }}>{label}</div>
          <div style={{
            fontSize: 13, color: standard.sections?.[key]?.[viewTab] ? 'var(--ink)' : 'var(--ink-faint)',
            lineHeight: 1.6, background: 'var(--bg-soft)', borderRadius: 6, padding: 10, minHeight: 48, whiteSpace: 'pre-line',
          }}>
            {standard.sections?.[key]?.[viewTab] || <em>미입력</em>}
          </div>
        </div>
      ))}

      {/* 개정 이력 — 읽기 전용, 클릭 시 당시 내용 열람 (#27/#28) */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <History size={14} /> 개정 이력
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
              {['개정번호', '승인일', '작성자', '검토자', '승인자', '변경 요약'].map((h) => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--ink-soft)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...(standard.revisionHistory || [])].reverse().map((r, i) => (
              <tr key={i} onClick={() => setViewRev(r)} style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
                title="클릭하면 이 개정 시점의 기준서·절차서 내용을 볼 수 있습니다">
                <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--moss)' }}>{r.revision}</td>
                <td style={{ padding: '6px 10px' }}>{r.date}</td>
                <td style={{ padding: '6px 10px' }}>{r.draftedBy || '-'}</td>
                <td style={{ padding: '6px 10px' }}>{r.reviewedBy || '-'}</td>
                <td style={{ padding: '6px 10px' }}>{r.by}</td>
                <td style={{ padding: '6px 10px' }}>{r.summary || '-'}</td>
              </tr>
            ))}
            {(standard.revisionHistory || []).length === 0 && (
              <tr><td colSpan={6} style={{ padding: '12px 10px', color: 'var(--ink-faint)', fontSize: 13 }}>아직 승인된 개정 이력이 없습니다. (최초 승인 시 Rev.1이 기록됩니다)</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* #28 — 과거 개정 시점 내용 열람 모달 */}
      {viewRev && (
        <StdModal title={`${viewRev.revision} 시점 내용 (승인일 ${viewRev.date})`} onClose={() => setViewRev(null)}>
          <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 12 }}>
            작성 {viewRev.draftedBy || '-'} · 검토 {viewRev.reviewedBy || '-'} · 승인 {viewRev.by || '-'}
            {viewRev.summary ? ` · 변경 요약: ${viewRev.summary}` : ''}
          </div>
          {SECTIONS.map(({ key, label }) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: 'var(--ink-faint)' }}>[기준서] </span>
                <span style={{ whiteSpace: 'pre-line' }}>{viewRev.snapshot?.sections?.[key]?.policy || '미입력'}</span>
              </div>
              <div style={{ fontSize: 12 }}>
                <span style={{ fontWeight: 600, color: 'var(--ink-faint)' }}>[절차서] </span>
                <span style={{ whiteSpace: 'pre-line' }}>{viewRev.snapshot?.sections?.[key]?.procedure || '미입력'}</span>
              </div>
            </div>
          ))}
        </StdModal>
      )}

      {/* 편집 모달 */}
      {editing && (
        <StdModal title="수입관리기준서 편집" onClose={() => setEditing(false)}>
          <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 14, padding: '8px 10px', background: 'var(--bg-soft)', borderRadius: 6 }}>
            개정번호는 승인이 완료될 때 시스템이 자동으로 부여합니다(다음 개정번호: <b>Rev.{(standard.revisionHistory || []).length + 1}</b>). 저장 후 상단의 작성→검토→승인 절차를 진행하세요.
          </div>

          {SECTIONS.map(({ key, label }) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>{label}</div>
                <button type="button" onClick={() => setAiSectionKey(aiSectionKey === key ? null : key)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 600,
                    background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe',
                    borderRadius: 5, padding: '2px 8px', cursor: 'pointer',
                  }}><Sparkles size={10} /> AI 초안</button>
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 3 }}>기준서 (정책·원칙)</div>
              <textarea style={{ ...textarea, minHeight: 54 }} value={draft.sections[key].policy} onChange={upd(key, 'policy')} placeholder="이 항목에 대한 회사의 기본 방침·원칙을 간결하게 기술합니다." />
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-faint)', margin: '8px 0 3px' }}>절차서 (세부 실행 절차)</div>
              <textarea style={textarea} value={draft.sections[key].procedure} onChange={upd(key, 'procedure')} placeholder="정책을 실제로 이행하는 단계별 절차와 관련 화면·기록을 기술합니다." />
              {aiSectionKey === key && (
                <ImsDraftPanel sectionLabel={label}
                  onUse={(text) => { setDraft((d) => ({ ...d, sections: { ...d.sections, [key]: { ...d.sections[key], procedure: d.sections[key].procedure ? d.sections[key].procedure + '\n' + text : text } } })); setAiSectionKey(null) }}
                  onClose={() => setAiSectionKey(null)} />
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={save} style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
              background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 6,
              padding: '7px 16px', cursor: 'pointer',
            }}><Save size={14} /> 저장</button>
            <button onClick={() => setEditing(false)} style={{
              fontSize: 13, background: 'none', border: '1px solid var(--line)',
              borderRadius: 6, padding: '7px 14px', cursor: 'pointer', color: 'var(--ink-soft)',
            }}>취소</button>
          </div>
        </StdModal>
      )}
    </div>
  )
}

function wfBtn(color) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700,
    background: color, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer',
  }
}

// #12 — 섹션별 AI 초안 생성 패널 (dhf-draft.js / regulatory-draft.js와 동일한 패턴)
function ImsDraftPanel({ sectionLabel, onUse, onClose }) {
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [draftText, setDraftText] = useState('')

  async function generate() {
    setLoading(true); setError(''); setDraftText('')
    try {
      const r = await fetch('/api/import-standard-draft', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sectionLabel, context: context.trim() }),
      })
      const j = await r.json()
      if (!j.ok) setError(j.message || 'AI 초안 생성에 실패했습니다.')
      else setDraftText(j.content || '')
    } catch (e) {
      setError('AI 초안 생성 중 오류가 발생했습니다: ' + String((e && e.message) || e))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: '#faf9ff', border: '1px solid #ddd6fe' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Sparkles size={12} /> {sectionLabel} — AI 초안
        </span>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><XCircle size={14} /></button>
      </div>
      <input style={{ ...inp, fontSize: 12, padding: '6px 10px', marginBottom: 8 }}
        placeholder="참고 내용 (선택) — 실제 회사 상황을 적을수록 초안 품질이 좋아집니다"
        value={context} onChange={(e) => setContext(e.target.value)} />
      {error && <div style={{ fontSize: 11.5, padding: '6px 10px', borderRadius: 6, background: '#fee2e2', color: '#991b1b', marginBottom: 8 }}>{error}</div>}
      <button type="button" onClick={generate} disabled={loading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6,
          fontSize: 12, fontWeight: 600, cursor: loading ? 'default' : 'pointer', border: 'none',
          background: '#7c3aed', color: '#fff', opacity: loading ? 0.7 : 1, marginBottom: draftText ? 8 : 0,
        }}>
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        {loading ? '생성 중...' : '초안 생성'}
      </button>
      {draftText && (
        <div>
          <div style={{ fontSize: 12, whiteSpace: 'pre-wrap', padding: 10, borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', marginBottom: 8 }}>
            {draftText}
          </div>
          <button type="button" onClick={() => onUse(draftText)}
            style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
              border: '1px solid var(--moss)', background: 'var(--leaf-soft)', color: 'var(--moss)',
            }}>이 내용을 섹션에 추가</button>
        </div>
      )}
      <p style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 6 }}>AI 초안은 참고용입니다 — 반드시 검토·수정 후 저장하세요.</p>
    </div>
  )
}

const inp = {
  background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6,
  padding: '6px 10px', color: 'var(--ink)', fontSize: 13, width: '100%', boxSizing: 'border-box',
}
const textarea = { ...inp, resize: 'vertical', minHeight: 72, fontFamily: 'inherit' }

function StdModal({ title, onClose, children }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 640,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', border: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><XCircle size={19} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
