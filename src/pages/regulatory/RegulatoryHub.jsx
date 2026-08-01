import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileCheck2,
  Tag,
  AlertOctagon,
  Plus,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  PenTool,
  RefreshCw,
  X,
  ExternalLink,
  Sparkles,
  Globe,
  ChevronRight,
  FileDown,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import HubBanner from '../../components/HubBanner'
import { permissions, requirePermission } from '../../lib/permissions'
import { onboarding, productKeyOf } from '../../lib/onboardingState'
import { productDocs } from '../../lib/productDocsState'
import { fileStore } from '../../lib/fileStore'
import {
  submissions,
  JURISDICTIONS,
  SUBMISSION_TYPES,
  SUBMISSION_STATUS,
  SUBMISSION_STATUS_META,
  DEFICIENCY_DEADLINES,
} from '../../lib/submissions'
import {
  udi,
  ISSUING_AGENCIES,
  EXTERNAL_DBS,
  DB_SYNC_STATUS,
  LABEL_FORMATS,
} from '../../lib/udi'

/**
 * RegulatoryHub — 인허가 통합 (RA-001 + RA-002 + RA-003)
 *
 * 적용 표준:
 * - Project Instructions §12 / §16 / §17
 * - 21 CFR 803/807/814/830
 * - MDR (EU) 2017/745
 * - 의료기기법, KGMP
 */
export default function RegulatoryHub() {
  const nav = useNavigate()
  const user = auth.current()

  const [tab, setTab] = useState('submissions')
  const [toast, setToast] = useState(null)
  const [tick, setTick] = useState(0)
  const reload = () => setTick((t) => t + 1)
  const showToast = (text, kind = 'ok') => {
    setToast({ text, kind })
    setTimeout(() => setToast(null), 2400)
  }

  // 온보딩 데이터
  const ob = onboarding.load() || {}
  const product = ob.product
  const company = ob.company

  const stats = useMemo(() => {
    const subs = submissions.loadAll()
    const udis = udi.loadAll()
    const vigs = vigilance.loadAll()
    const upDef = submissions.upcomingDeadlines(30)
    const upRep = vigilance.upcomingReportDeadlines(7)
    return {
      submissions: {
        total: subs.length,
        active: subs.filter((s) =>
          ['submitted', 'preparing', 'deficiency'].includes(s.status)
        ).length,
        deficiencyCount: subs.filter((s) => s.status === 'deficiency').length,
        approved: subs.filter((s) => s.status === 'approved').length,
        upcoming: upDef.length,
      },
      udi: {
        total: udis.length,
        active: udis.filter((u) => u.status === 'active').length,
        pending: udis.filter((u) =>
          Object.values(u.externalDbStatus || {}).some((v) => v === 'pending')
        ).length,
      },
      vig: {
        total: vigs.length,
        open: vigs.filter((v) => v.status !== 'closed').length,
        overdue: upRep.filter((r) => r.isOverdue).length,
        upcomingReports: upRep.length,
      },
    }
  }, [tick])

  const hasOnboarding = !!(company?.name && product?.name)

  return (
    <AppLayout
      user={user}
      title="인허가 (RA)"
      subtitle="신청·UDI·시판후 감시 통합"
    >
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {toast && (
          <div
            className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg text-[13px] flex items-center gap-2 fade-in"
            style={{
              background: toast.kind === 'warn' ? 'var(--rust)' : 'var(--moss)',
              color: 'var(--bg)',
              boxShadow: '0 6px 20px rgba(15,26,20,0.18)',
            }}
          >
            <CheckCircle2 size={14} />
            {toast.text}
          </div>
        )}

        <HubBanner
          title="인허가 통합 관리"
          subtitle="21 CFR 803/807/814 · MDR(EU) 2017/745 · 의료기기법 · 마감시한 자동 추적"
          icon={FileCheck2}
          color="#059669"
          workflow={['신청·통지 준비', 'UDI 등록', '제출·심사', '승인·인허', '시판후 감시']}
        />

        {!hasOnboarding && (
          <div
            className="card-base p-5 mb-5"
            style={{ borderStyle: 'dashed' }}
          >
            <div className="text-[13px]" style={{ color: 'var(--ink)' }}>
              제품 정보가 등록되어야 인허가 신청·UDI 발급이 가능합니다.{' '}
              <button onClick={() => nav('/onboarding')} className="underline">
                온보딩으로 이동
              </button>
            </div>
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-1 mb-5 overflow-x-auto">
          <TabButton
            active={tab === 'submissions'}
            onClick={() => setTab('submissions')}
            icon={FileCheck2}
            label="신청·통지"
            en="RA-001"
            count={stats.submissions.active}
            badge={
              stats.submissions.deficiencyCount > 0
                ? { text: `보완 ${stats.submissions.deficiencyCount}`, tone: 'rust' }
                : null
            }
          />
          <TabButton
            active={tab === 'udi'}
            onClick={() => setTab('udi')}
            icon={Tag}
            label="UDI"
            en="RA-002"
            count={stats.udi.active}
            badge={
              stats.udi.pending > 0
                ? { text: `동기화 ${stats.udi.pending}`, tone: 'amber' }
                : null
            }
          />
        </div>

        {tab === 'submissions' && (
          <SubmissionsPanel
            product={product}
            certs={ob.certs || {}}
            onAction={(t, k) => {
              showToast(t, k)
              reload()
            }}
          />
        )}
        {tab === 'udi' && (
          <UdiPanel
            product={product}
            certs={ob.certs || {}}
            onAction={(t, k) => {
              showToast(t, k)
              reload()
            }}
          />
        )}
      </div>
    </AppLayout>
  )
}

/* ================================================================
   TabButton
   ================================================================ */
function TabButton({ active, onClick, icon: Icon, label, en, count, badge }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 rounded-t-lg flex items-center gap-2 text-[13px] transition shrink-0"
      style={{
        background: active ? 'var(--bg-card)' : 'transparent',
        borderBottom: active
          ? '2px solid var(--moss)'
          : '2px solid transparent',
        color: active ? 'var(--ink)' : 'var(--ink-mute)',
        fontWeight: active ? 500 : 400,
      }}
    >
      <Icon size={14} />
      <span>{label}</span>
      <span
        className="font-mono text-[10px] px-1.5 py-0.5 rounded"
        style={{
          background: active ? 'var(--leaf-soft)' : 'var(--bg-soft)',
          color: active ? 'var(--moss)' : 'var(--ink-faint)',
        }}
      >
        {count}
      </span>
      {badge && (
        <span
          className="font-mono text-[9.5px] px-1.5 py-0.5 rounded"
          style={{
            background: `var(--${badge.tone}-soft)`,
            color: `var(--${badge.tone})`,
            fontWeight: 600,
          }}
        >
          {badge.text}
        </span>
      )}
      <span
        className="font-mono text-[9.5px] tracking-wider"
        style={{ color: 'var(--ink-faint)' }}
      >
        {en}
      </span>
    </button>
  )
}

/* ================================================================
   RA-001 SUBMISSIONS PANEL
   ================================================================ */
function SubmissionsPanel({ product, certs, onAction }) {
  const [showCreate, setShowCreate] = useState(false)
  const [selectedSub, setSelectedSub] = useState(null)
  const [editingSub, setEditingSub] = useState(null)
  const subs = submissions.loadAll()
  const upcoming = submissions.upcomingDeadlines(30)
  const canCreate = permissions.can('ra.submission.approve') && !!product

  const handleCreate = (formData) => {
    if (!requirePermission('ra.submission.approve')) return
    try {
      submissions.create({
        productId: product.modelNumber || 'main',
        productName: product.name,
        ...formData,
      })
      setShowCreate(false)
      onAction(`${JURISDICTIONS[formData.jurisdiction]?.ko} 신청 드래프트 생성됨`)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleUpdate = (subId, formData) => {
    try {
      submissions.update(subId, formData)
      setEditingSub(null)
      onAction('신청 내용이 수정되었습니다')
    } catch (err) {
      alert(err.message)
    }
  }

  const handlePrepare = (subId) => {
    // 제품의 기술문서(개발·인허가 단계에서 등록된 실제 파일)를 제출 패키지에 연동해 첨부한다.
    const techDocs = productDocs.getTechDocs(productKeyOf(product))
    const docs = techDocs.filter(d => d.fileId).map(d => ({ id: d.id, title: d.title || d.fileName || '기술문서', fileId: d.fileId, fileName: d.fileName }))
    submissions.prepare(subId, docs)
    onAction(docs.length ? `패키지 자동 생성 완료 — 기술문서 ${docs.length}건 첨부됨` : '패키지 생성됨 — 개발(기술문서)에 첨부된 파일이 없어 문서 없이 준비되었습니다')
  }

  const handleSubmit = (subId) => {
    const refNumber = prompt('제출 참조번호를 입력하세요 (선택):')
    submissions.markSubmitted(subId, refNumber || null)
    onAction('제출 표시됨 — 보완 요청 모니터링 시작')
  }

  const handleAddDeficiency = (subId) => {
    const desc = prompt('보완 요청 내용을 간단히 입력하세요:')
    if (!desc) return
    submissions.addDeficiency(subId, { description: desc })
    onAction('보완 요청 기록 — 마감 카운트다운 시작', 'warn')
  }

  const handleRespond = (subId, defId) => {
    submissions.respondToDeficiency(subId, defId)
    onAction('보완 응답 완료')
  }

  const handleApprove = (subId) => {
    const cert = prompt('인증/허가 번호를 입력하세요 (선택):')
    submissions.approve(subId, cert || null)
    onAction('승인 처리됨 ✓')
  }

  return (
    <div className="space-y-4">
      {/* 마감 임박 알림 */}
      {upcoming.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--rust-soft)',
            border: '1px solid var(--rust)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} style={{ color: 'var(--rust)' }} />
            <span
              className="font-mono text-[10.5px] tracking-[0.16em] uppercase"
              style={{ color: 'var(--rust)', fontWeight: 600 }}
            >
              마감 임박 보완 요청 ({upcoming.length}건)
            </span>
          </div>
          <ul className="space-y-1.5">
            {upcoming.map((u, i) => (
              <li
                key={i}
                className="text-[12.5px]"
                style={{ color: 'var(--rust)' }}
              >
                • <strong>{u.submission.id}</strong> ({JURISDICTIONS[u.submission.jurisdiction]?.ko}) — {u.deficiency.description.slice(0, 50) || '내용 없음'} {u.isOverdue ? <span style={{ fontWeight: 700 }}>마감 초과 ({Math.abs(u.daysLeft)}일)</span> : `${u.daysLeft}일 남음`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 새 신청 버튼 */}
      <div className="flex justify-between items-center">
        <div
          className="font-mono text-[10.5px] tracking-[0.16em] uppercase"
          style={{ color: 'var(--ink-mute)' }}
        >
          ACTIVE SUBMISSIONS · 진행 중 신청
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={!canCreate}
          className="btn-primary text-[12.5px]"
          style={{ background: 'var(--moss)' }}
        >
          <Plus size={13} /> 새 인허가 신청
        </button>
      </div>

      {/* 신규 작성 폼 */}
      {showCreate && (
        <SubmissionCreateForm
          product={product}
          certs={certs}
          onCancel={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* 수정 폼 (드래프트 상태만) */}
      {editingSub && (
        <SubmissionCreateForm
          product={product}
          certs={certs}
          initial={editingSub}
          editing
          onCancel={() => setEditingSub(null)}
          onSubmit={(formData) => handleUpdate(editingSub.id, formData)}
        />
      )}

      {/* 신청 목록 */}
      {subs.length === 0 ? (
        <div
          className="card-base p-6 text-center text-[13px]"
          style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}
        >
          진행 중인 인허가 신청이 없습니다. "새 인허가 신청" 버튼으로 시작하세요.
        </div>
      ) : (
        <div className="space-y-2">
          {subs
            .slice()
            .reverse()
            .map((sub) => (
              <SubmissionRow
                key={sub.id}
                sub={sub}
                onPrepare={() => handlePrepare(sub.id)}
                onSubmit={() => handleSubmit(sub.id)}
                onAddDeficiency={() => handleAddDeficiency(sub.id)}
                onRespond={(defId) => handleRespond(sub.id, defId)}
                onApprove={() => handleApprove(sub.id)}
                onEdit={() => setEditingSub(sub)}
              />
            ))}
        </div>
      )}

      <ComplianceFooter
        regs={[
          'ISO 13485 §8.5',
          '21 CFR 807 (510(k))',
          '21 CFR 814 (PMA)',
          'MDR Article 52',
          '의료기기법 §6',
        ]}
      />
    </div>
  )
}

// 인증(certs) → 신청 관할(jurisdiction) 매핑. 선택하지 않은 인증의 관할은 아예 목록에서 숨긴다.
// MFDS는 국내제조사(kgmp)든 수입사(kgmp_importer)든 둘 다 식약처 관할이므로 둘 중 하나만 있어도 노출한다.
const JURISDICTION_CERT = { MFDS: ['kgmp', 'kgmp_importer'], FDA: ['fda'], MDR: ['ce'] }
function availableJurisdictions(certs) {
  const c = certs || {}
  return Object.keys(JURISDICTIONS).filter((j) => {
    const certIds = JURISDICTION_CERT[j]
    return certIds ? certIds.some((id) => !!c[id]) : false
  })
}

function SubmissionCreateForm({ product, certs, initial, editing, onCancel, onSubmit }) {
  const avail = availableJurisdictions(certs)
  const fallback = (initial && initial.jurisdiction) || avail[0] || 'MFDS'
  const [jurisdiction, setJurisdiction] = useState(fallback)
  const [submissionType, setSubmissionType] = useState(
    (initial && initial.submissionType) ||
    (Object.entries(SUBMISSION_TYPES).find(([, t]) => t.jurisdiction === fallback) || [])[0] || 'MFDS_NEWMD'
  )

  const availableTypes = Object.entries(SUBMISSION_TYPES).filter(
    ([_, t]) => t.jurisdiction === jurisdiction
  )

  if (avail.length === 0) {
    return (
      <div className="card-base p-4" style={{ borderColor: 'var(--moss)' }}>
        <div className="font-mono text-[10.5px] tracking-[0.16em] uppercase mb-2" style={{ color: 'var(--moss)' }}>
          새 신청 작성
        </div>
        <div className="text-[12.5px]" style={{ color: 'var(--ink-mute)' }}>
          가입 시 선택한 인증이 없습니다. 온보딩에서 KGMP·FDA QMSR·CE MDR 중 하나 이상을 선택해야 인허가 신청을 작성할 수 있습니다.
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={onCancel} className="btn-ghost text-[12.5px]">닫기</button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="card-base p-4"
      style={{ borderColor: 'var(--moss)' }}
    >
      <div className="font-mono text-[10.5px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--moss)' }}>
        {editing ? '신청 내용 수정' : '새 신청 작성'}
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>
            관할 (Jurisdiction)
          </label>
          <select
            value={jurisdiction}
            onChange={(e) => {
              const newJ = e.target.value
              setJurisdiction(newJ)
              const firstType = Object.entries(SUBMISSION_TYPES).find(
                ([_, t]) => t.jurisdiction === newJ
              )
              if (firstType) setSubmissionType(firstType[0])
            }}
            className="input-base mt-1 w-full text-[13px]"
          >
            {avail.map((k) => (
              <option key={k} value={k}>
                {JURISDICTIONS[k].country} {JURISDICTIONS[k].ko}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>
            신청 유형
          </label>
          <select
            value={submissionType}
            onChange={(e) => setSubmissionType(e.target.value)}
            className="input-base mt-1 w-full text-[13px]"
          >
            {availableTypes.map(([k, v]) => (
              <option key={k} value={k}>
                {v.ko}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="rounded-md p-2.5 mb-3 text-[11.5px]"
        style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}
      >
        제품: <strong style={{ color: 'var(--ink)' }}>{product?.name}</strong> ({product?.modelNumber})
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost text-[12.5px]">
          취소
        </button>
        <button
          onClick={() => onSubmit({ jurisdiction, submissionType })}
          className="btn-primary text-[12.5px]"
        >
          {editing ? '수정 저장' : '드래프트 생성'}
        </button>
      </div>
    </div>
  )
}

function SubmissionRow({
  sub,
  onPrepare,
  onSubmit,
  onAddDeficiency,
  onRespond,
  onApprove,
  onEdit,
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = SUBMISSION_STATUS_META[sub.status]
  const j = JURISDICTIONS[sub.jurisdiction]
  const t = SUBMISSION_TYPES[sub.submissionType]
  const openDefs = (sub.deficiencies || []).filter((d) => d.status === 'open')

  return (
    <div
      className="card-base p-3.5"
      style={{
        borderLeft: `3px solid var(--${meta.tone})`,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 text-left"
      >
        <span
          className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded uppercase"
          style={{
            background: `var(--${meta.tone})`,
            color: 'var(--bg)',
            fontWeight: 500,
          }}
        >
          {meta.ko}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-[11px]" style={{ color: 'var(--ink-mute)' }}>
              {sub.id}
            </span>
            <span className="text-[13px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              {j?.country} {t?.ko || sub.submissionType}
            </span>
            {openDefs.length > 0 && (
              <span
                className="font-mono text-[9.5px] px-1.5 py-0.5 rounded"
                style={{
                  background: 'var(--rust-soft)',
                  color: 'var(--rust)',
                  fontWeight: 600,
                }}
              >
                보완 {openDefs.length}건
              </span>
            )}
          </div>
          <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            {sub.productName} {sub.submittedAt ? `· 제출 ${new Date(sub.submittedAt).toLocaleDateString('ko-KR')}` : ''}
          </div>
        </div>
        <ChevronRight
          size={14}
          style={{
            color: 'var(--ink-faint)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {expanded && (
        <div
          className="mt-3 pt-3 space-y-3"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          {/* 액션 버튼 */}
          <div className="flex gap-2 flex-wrap">
            {sub.status === 'draft' && (
              <>
                <button onClick={onEdit} className="btn-ghost text-[12px]">
                  <PenTool size={12} /> 내용 수정
                </button>
                <button onClick={onPrepare} className="btn-ghost text-[12px]">
                  <Sparkles size={12} /> 패키지 자동 생성
                </button>
              </>
            )}
            {sub.status === 'preparing' && (
              <button
                onClick={onSubmit}
                className="btn-primary text-[12px]"
                style={{ background: 'var(--sky)' }}
              >
                <Send size={12} /> 외부 제출 표시
              </button>
            )}
            {(sub.status === 'submitted' || sub.status === 'deficiency') && (
              <>
                <button onClick={onAddDeficiency} className="btn-ghost text-[12px]">
                  <AlertTriangle size={12} /> 보완 요청 등록
                </button>
                <button
                  onClick={onApprove}
                  className="btn-primary text-[12px]"
                  style={{ background: 'var(--moss)' }}
                >
                  <CheckCircle2 size={12} /> 승인 처리
                </button>
              </>
            )}
          </div>

          {/* 제출서류(기술문서) 다운로드 */}
          {sub.documents && sub.documents.length > 0 && (
            <div className="rounded-lg p-3" style={{ background: 'var(--bg-soft)' }}>
              <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-2" style={{ color: 'var(--ink-mute)' }}>
                제출서류 ({sub.documents.length}건)
              </div>
              <div className="space-y-1">
                {sub.documents.map((d) => (
                  <a key={d.id} href={fileStore.getObjectURL(d.fileId)} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--moss)' }}>
                    <FileDown size={12} /> {d.title || d.fileName}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 보완 요청 목록 */}
          {sub.deficiencies && sub.deficiencies.length > 0 && (
            <div
              className="rounded-lg p-3"
              style={{
                background: 'var(--bg-soft)',
              }}
            >
              <div
                className="font-mono text-[10px] tracking-[0.16em] uppercase mb-2"
                style={{ color: 'var(--ink-mute)' }}
              >
                DEFICIENCIES · 보완 요청
              </div>
              <div className="space-y-1.5">
                {sub.deficiencies.map((d) => {
                  const daysLeft = Math.ceil(
                    (new Date(d.deadline).getTime() - Date.now()) /
                      (24 * 60 * 60 * 1000)
                  )
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-2 text-[12px]"
                      style={{
                        color: d.status === 'open' && daysLeft < 7 ? 'var(--rust)' : 'var(--ink)',
                      }}
                    >
                      <span
                        className="font-mono text-[9.5px] px-1 py-0.5 rounded"
                        style={{
                          background:
                            d.status === 'open' ? 'var(--rust-soft)' : 'var(--leaf-soft)',
                          color: d.status === 'open' ? 'var(--rust)' : 'var(--moss)',
                        }}
                      >
                        {d.id}
                      </span>
                      <span className="flex-1 truncate">{d.description}</span>
                      {d.status === 'open' && (
                        <>
                          <span className="font-mono text-[10.5px]">
                            {daysLeft >= 0 ? `${daysLeft}일` : `+${Math.abs(daysLeft)}일 초과`}
                          </span>
                          <button
                            onClick={() => onRespond(d.id)}
                            className="text-[10.5px] underline"
                          >
                            응답
                          </button>
                        </>
                      )}
                      {d.status === 'responded' && (
                        <span className="font-mono text-[10.5px]" style={{ color: 'var(--moss)' }}>
                          ✓ 응답 완료
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 메타 정보 */}
          <div className="grid sm:grid-cols-3 gap-2 text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>
            <div>생성: {new Date(sub.createdAt).toLocaleDateString('ko-KR')}</div>
            {sub.submittedAt && (
              <div>제출: {new Date(sub.submittedAt).toLocaleDateString('ko-KR')}</div>
            )}
            {sub.approvedAt && (
              <div style={{ color: 'var(--moss)' }}>
                승인: {new Date(sub.approvedAt).toLocaleDateString('ko-KR')}
                {sub.certificateNumber && ` · ${sub.certificateNumber}`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================
   RA-002 UDI PANEL
   ================================================================ */
function UdiPanel({ product, certs, onAction }) {
  const [showCreate, setShowCreate] = useState(false)
  const list = udi.loadAll()
  const canIssue = permissions.can('ra.submission.approve') && !!product

  const handleIssue = (formData) => {
    if (!requirePermission('ra.submission.approve')) return
    try {
      udi.issue({
        productId: product.modelNumber || 'main',
        productName: product.name,
        ...formData,
      })
      setShowCreate(false)
      onAction(`${ISSUING_AGENCIES[formData.issuingAgency]?.ko} UDI-DI 신규 발급`)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSync = (udiId, dbName) => {
    const result = udi.syncToExternal(udiId, dbName)
    if (result.success) {
      onAction(`${EXTERNAL_DBS[dbName]?.ko} 동기화 성공`)
    } else {
      onAction(`${EXTERNAL_DBS[dbName]?.ko} 동기화 실패 — 재시도 필요`, 'warn')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div
          className="font-mono text-[10.5px] tracking-[0.16em] uppercase"
          style={{ color: 'var(--ink-mute)' }}
        >
          UDI-DI MASTER · 발급된 식별자 ({list.length})
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={!canIssue}
          className="btn-primary text-[12.5px]"
          style={{ background: 'var(--moss)' }}
        >
          <Plus size={13} /> UDI-DI 발급
        </button>
      </div>

      {showCreate && (
        <UdiIssueForm
          product={product}
          certs={certs}
          onCancel={() => setShowCreate(false)}
          onSubmit={handleIssue}
        />
      )}

      {list.length === 0 ? (
        <div
          className="card-base p-6 text-center text-[13px]"
          style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}
        >
          발급된 UDI-DI가 없습니다. "UDI-DI 발급" 버튼으로 시작하세요.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((u) => (
            <UdiRow key={u.id} record={u} onSync={handleSync} />
          ))}
        </div>
      )}

      <ComplianceFooter
        regs={[
          '21 CFR 830 (FDA UDI Rule)',
          'MDR Article 27~29',
          'MFDS UDI 고시',
          'IMDRF UDI Guidance',
          'GS1 General Specifications',
        ]}
      />
    </div>
  )
}

// UDI 적용 시장 → 인증 매핑. 선택하지 않은 인증의 시장은 체크박스 자체를 숨긴다.
const UDI_MARKET_CERT = { MFDS: ['kgmp', 'kgmp_importer'], FDA: ['fda'], MDR: ['ce'] }
const UDI_MARKET_LABEL = { MFDS: '🇰🇷 MFDS', FDA: '🇺🇸 FDA GUDID', MDR: '🇪🇺 EUDAMED' }

function UdiIssueForm({ product, certs, onCancel, onSubmit }) {
  const c0 = certs || {}
  const availMarkets = Object.keys(UDI_MARKET_CERT).filter((k) => UDI_MARKET_CERT[k].some((id) => !!c0[id]))
  const [issuingAgency, setIssuingAgency] = useState('GS1')
  const [labelFormat, setLabelFormat] = useState('GS1-128')
  const [markets, setMarkets] = useState(() => Object.fromEntries(availMarkets.map((k) => [k, true])))
  const [pi, setPi] = useState({
    lot: true,
    serial: false,
    manufactureDate: true,
    expiryDate: true,
    softwareVersion: false,
  })

  return (
    <div
      className="card-base p-4"
      style={{ borderColor: 'var(--moss)' }}
    >
      <div className="font-mono text-[10.5px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--moss)' }}>
        UDI-DI 발급
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>
            발급 기관
          </label>
          <select
            value={issuingAgency}
            onChange={(e) => setIssuingAgency(e.target.value)}
            className="input-base mt-1 w-full text-[13px]"
          >
            {Object.entries(ISSUING_AGENCIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.ko} — {v.desc}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>
            라벨 형식
          </label>
          <select
            value={labelFormat}
            onChange={(e) => setLabelFormat(e.target.value)}
            className="input-base mt-1 w-full text-[13px]"
          >
            {Object.entries(LABEL_FORMATS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.ko}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>
          UDI-PI 구성 (동적 식별자)
        </label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {Object.entries(pi).map(([k, v]) => (
            <label
              key={k}
              className="flex items-center gap-1.5 text-[12px]"
              style={{ color: 'var(--ink)' }}
            >
              <input
                type="checkbox"
                checked={v}
                onChange={(e) => setPi({ ...pi, [k]: e.target.checked })}
              />
              {k === 'lot' && '로트 번호'}
              {k === 'serial' && '시리얼'}
              {k === 'manufactureDate' && '제조일'}
              {k === 'expiryDate' && '유효기한'}
              {k === 'softwareVersion' && 'SW 버전'}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>
          적용 시장 (외부 DB 연계)
        </label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {availMarkets.length === 0 && (
            <span className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>가입 시 선택한 인증이 없어 적용 시장을 선택할 수 없습니다.</span>
          )}
          {availMarkets.map((k) => (
            <label key={k} className="flex items-center gap-1.5 text-[12px]">
              <input
                type="checkbox"
                checked={markets[k] || false}
                onChange={(e) => setMarkets({ ...markets, [k]: e.target.checked })}
              />
              {UDI_MARKET_LABEL[k]}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost text-[12.5px]">
          취소
        </button>
        <button
          onClick={() =>
            onSubmit({
              issuingAgency,
              labelFormat,
              udiPi: pi,
              applicableMarkets: Object.keys(markets).filter((k) => markets[k]),
            })
          }
          className="btn-primary text-[12.5px]"
        >
          UDI-DI 발급
        </button>
      </div>
    </div>
  )
}

function UdiRow({ record, onSync }) {
  const [expanded, setExpanded] = useState(false)
  const preview = expanded ? udi.getLabelPreview(record.id) : null

  return (
    <div className="card-base p-3.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 text-left"
      >
        <Tag size={14} style={{ color: 'var(--moss)' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-[12px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              {record.udiDi}
            </span>
            <span
              className="font-mono text-[9.5px] px-1.5 py-0.5 rounded"
              style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}
            >
              {record.issuingAgency}
            </span>
            <span
              className="font-mono text-[9.5px] px-1.5 py-0.5 rounded"
              style={{
                background: record.status === 'active' ? 'var(--leaf-soft)' : 'var(--bg-soft)',
                color: record.status === 'active' ? 'var(--moss)' : 'var(--ink-mute)',
              }}
            >
              {record.status === 'active' ? '활성' : record.status}
            </span>
          </div>
          <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            {record.productName} ({record.productId})
          </div>
        </div>
        <div className="flex items-center gap-1">
          {Object.entries(record.externalDbStatus || {})
            .filter(([_, s]) => s !== 'not-applicable')
            .map(([db, status]) => {
              const m = DB_SYNC_STATUS[status]
              return (
                <span
                  key={db}
                  title={`${EXTERNAL_DBS[db]?.ko}: ${m?.ko}`}
                  className="font-mono text-[9.5px] px-1.5 py-0.5 rounded"
                  style={{
                    background: `var(--${m?.tone}-soft)`,
                    color: `var(--${m?.tone})`,
                  }}
                >
                  {db.slice(0, 4)}
                </span>
              )
            })}
        </div>
        <ChevronRight
          size={14}
          style={{
            color: 'var(--ink-faint)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {expanded && (
        <div
          className="mt-3 pt-3"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          {/* 라벨 미리보기 */}
          {preview && (
            <div
              className="rounded-md p-3 mb-3"
              style={{
                background: 'var(--bg-soft)',
                border: '1px solid var(--line)',
              }}
            >
              <div
                className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1.5"
                style={{ color: 'var(--ink-mute)' }}
              >
                LABEL PREVIEW · {preview.format}
              </div>
              <div
                className="font-mono text-[12.5px] p-2 rounded"
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--ink)',
                }}
              >
                {preview.hri}
              </div>
              <div
                className="text-[11px] mt-1.5"
                style={{ color: 'var(--ink-mute)' }}
              >
                (01) Application Identifier — UDI-DI · 나머지는 PI(로트·일자·유효기한 등)
              </div>
            </div>
          )}

          {/* 외부 DB 동기화 */}
          <div
            className="font-mono text-[10px] tracking-[0.16em] uppercase mb-2"
            style={{ color: 'var(--ink-mute)' }}
          >
            EXTERNAL DB SYNC · 외부 데이터베이스 연계
          </div>
          <div className="space-y-1.5">
            {Object.entries(record.externalDbStatus || {}).map(([db, status]) => {
              const m = DB_SYNC_STATUS[status]
              const dbMeta = EXTERNAL_DBS[db]
              const lastSync = record.lastSyncedAt?.[db]
              return (
                <div
                  key={db}
                  className="flex items-center gap-2 text-[12px]"
                  style={{ color: 'var(--ink)' }}
                >
                  <span style={{ minWidth: 100 }}>
                    {dbMeta?.country} {dbMeta?.ko}
                  </span>
                  <span
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background: `var(--${m?.tone}-soft)`,
                      color: `var(--${m?.tone})`,
                      fontWeight: 500,
                    }}
                  >
                    {m?.ko}
                  </span>
                  {lastSync && (
                    <span
                      className="font-mono text-[10.5px]"
                      style={{ color: 'var(--ink-faint)' }}
                    >
                      {new Date(lastSync).toLocaleString('ko-KR')}
                    </span>
                  )}
                  {status !== 'not-applicable' && (
                    <button
                      onClick={() => onSync(record.id, db)}
                      className="ml-auto text-[10.5px] underline"
                      style={{ color: 'var(--moss)' }}
                    >
                      <RefreshCw size={9} style={{ display: 'inline' }} /> 재동기화
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================
   RA-003 VIGILANCE PANEL
   ================================================================ */
function VigilancePanel({ product, onAction }) {
  const [showCreate, setShowCreate] = useState(false)
  const list = vigilance.loadAll()
  const upcoming = vigilance.upcomingReportDeadlines(7)
  const canCreate = !!product

  const handleRaise = (formData) => {
    try {
      vigilance.raise({
        productId: product.modelNumber || 'main',
        productName: product.name,
        ...formData,
      })
      setShowCreate(false)
      onAction(
        `${SOURCE_TYPES[formData.sourceType]?.ko} 접수 — Reportability 자동 1차 판정 완료`
      )
    } catch (err) {
      alert(err.message)
    }
  }

  const handleApprove = (vigId, decisions) => {
    if (!requirePermission('qms.capa.approve')) return
    vigilance.approveReportability(vigId, decisions)
    onAction('Reportability 최종 판정 완료')
  }

  const handleReport = (vigId, jurisdiction, formType) => {
    const refNumber = prompt('보고서 제출 참조번호 (선택):')
    vigilance.markReported(vigId, jurisdiction, formType, refNumber || null)
    onAction(`${jurisdiction} 보고서 제출 완료`)
  }

  const handleClose = (vigId) => {
    const summary = prompt('종결 요약을 입력하세요:')
    vigilance.close(vigId, summary)
    onAction('Vigilance 케이스 종결')
  }

  return (
    <div className="space-y-4">
      {/* 마감 임박 보고 알림 */}
      {upcoming.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: upcoming.some((r) => r.isOverdue) ? 'var(--rust-soft)' : 'var(--amber-soft)',
            border: `1px solid var(--${upcoming.some((r) => r.isOverdue) ? 'rust' : 'amber'})`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} style={{ color: 'var(--rust)' }} />
            <span
              className="font-mono text-[10.5px] tracking-[0.16em] uppercase"
              style={{ color: 'var(--rust)', fontWeight: 600 }}
            >
              마감 임박 보고 ({upcoming.length}건)
            </span>
          </div>
          <ul className="space-y-1.5">
            {upcoming.map((r, i) => (
              <li
                key={i}
                className="text-[12.5px]"
                style={{
                  color: r.isOverdue ? 'var(--rust)' : 'var(--amber)',
                  fontWeight: r.isOverdue ? 600 : 400,
                }}
              >
                • <strong>{r.vig.id}</strong> ({r.jurisdiction}) — {HARM_TYPES[r.vig.harmType]?.ko} {r.isOverdue ? `마감 초과 (+${Math.abs(Math.ceil(r.hoursLeft / 24))}일)` : `${Math.ceil(r.hoursLeft / 24)}일 남음`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div
          className="font-mono text-[10.5px] tracking-[0.16em] uppercase"
          style={{ color: 'var(--ink-mute)' }}
        >
          VIGILANCE CASES · 시판후 감시 ({list.length})
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={!canCreate}
          className="btn-primary text-[12.5px]"
          style={{ background: 'var(--rust)' }}
        >
          <Plus size={13} /> 클레임/사고 접수
        </button>
      </div>

      {showCreate && (
        <VigilanceCreateForm
          product={product}
          onCancel={() => setShowCreate(false)}
          onSubmit={handleRaise}
        />
      )}

      {list.length === 0 ? (
        <div
          className="card-base p-6 text-center text-[13px]"
          style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}
        >
          접수된 시판후 감시 케이스가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {list
            .slice()
            .reverse()
            .map((vig) => (
              <VigilanceRow
                key={vig.id}
                vig={vig}
                onApprove={handleApprove}
                onReport={handleReport}
                onClose={() => handleClose(vig.id)}
              />
            ))}
        </div>
      )}

      <ComplianceFooter
        regs={[
          'ISO 13485 §8.2.1/§8.2.3',
          '21 CFR 803 MDR',
          'MDR Article 87',
          'MDCG 2020-7',
          '의료기기법 §31의5',
        ]}
      />
    </div>
  )
}

function VigilanceCreateForm({ product, onCancel, onSubmit }) {
  const [sourceType, setSourceType] = useState('complaint')
  const [harmType, setHarmType] = useState('device_malfunction')
  const [location, setLocation] = useState('Korea')
  const [description, setDescription] = useState('')
  const [reporterContact, setReporterContact] = useState('')

  return (
    <div
      className="card-base p-4"
      style={{ borderColor: 'var(--rust)' }}
    >
      <div
        className="font-mono text-[10.5px] tracking-[0.16em] uppercase mb-3"
        style={{ color: 'var(--rust)' }}
      >
        클레임/사고 접수
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-3">
        <div>
          <label
            className="font-mono text-[10px] tracking-[0.16em] uppercase"
            style={{ color: 'var(--ink-mute)' }}
          >
            출처 유형
          </label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className="input-base mt-1 w-full text-[13px]"
          >
            {Object.entries(SOURCE_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.ko}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="font-mono text-[10px] tracking-[0.16em] uppercase"
            style={{ color: 'var(--ink-mute)' }}
          >
            위해 유형
          </label>
          <select
            value={harmType}
            onChange={(e) => setHarmType(e.target.value)}
            className="input-base mt-1 w-full text-[13px]"
          >
            {Object.entries(HARM_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.ko}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="font-mono text-[10px] tracking-[0.16em] uppercase"
            style={{ color: 'var(--ink-mute)' }}
          >
            발생 지역
          </label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="input-base mt-1 w-full text-[13px]"
          >
            <option value="Korea">🇰🇷 한국</option>
            <option value="USA">🇺🇸 미국</option>
            <option value="Europe">🇪🇺 유럽</option>
            <option value="Japan">🇯🇵 일본</option>
            <option value="China">🇨🇳 중국</option>
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label
          className="font-mono text-[10px] tracking-[0.16em] uppercase"
          style={{ color: 'var(--ink-mute)' }}
        >
          설명
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="예: 임플란트 삽입 후 4주차 환자 통증 호소, X-ray 상 미세 균열 발견"
          className="input-base mt-1 w-full text-[13px]"
          rows={2}
        />
      </div>

      <div className="mb-3">
        <label
          className="font-mono text-[10px] tracking-[0.16em] uppercase"
          style={{ color: 'var(--ink-mute)' }}
        >
          신고자/보고처
        </label>
        <input
          type="text"
          value={reporterContact}
          onChange={(e) => setReporterContact(e.target.value)}
          placeholder="예: 서울대학교병원 정형외과 김OO 교수"
          className="input-base mt-1 w-full text-[13px]"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost text-[12.5px]">
          취소
        </button>
        <button
          onClick={() =>
            onSubmit({
              sourceType,
              harmType,
              location,
              locations: [location],
              description,
              reporterContact,
            })
          }
          className="btn-primary text-[12.5px]"
          style={{ background: 'var(--rust)' }}
        >
          접수 + 자동 Reportability 판정
        </button>
      </div>
    </div>
  )
}

function VigilanceRow({ vig, onApprove, onReport, onClose }) {
  const [expanded, setExpanded] = useState(false)
  const harm = HARM_TYPES[vig.harmType]
  const status = VIG_STATUS[vig.status]

  return (
    <div
      className="card-base p-3.5"
      style={{
        borderLeft: `3px solid var(--${harm?.color || 'ink-mute'})`,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 text-left"
      >
        <span
          className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded uppercase"
          style={{
            background: `var(--${harm?.color || 'ink-mute'})`,
            color: 'var(--bg)',
            fontWeight: 500,
          }}
        >
          {harm?.ko || vig.harmType}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className="font-mono text-[11px]"
              style={{ color: 'var(--ink-mute)' }}
            >
              {vig.id}
            </span>
            <span
              className="text-[13px]"
              style={{ color: 'var(--ink)', fontWeight: 500 }}
            >
              {SOURCE_TYPES[vig.sourceType]?.ko}
            </span>
            <span
              className="font-mono text-[9.5px] px-1.5 py-0.5 rounded"
              style={{
                background: `var(--${status?.tone}-soft)`,
                color: `var(--${status?.tone})`,
                fontWeight: 500,
              }}
            >
              {status?.ko}
            </span>
          </div>
          <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            {vig.productName} · {vig.location} · {new Date(vig.receivedAt).toLocaleDateString('ko-KR')}
          </div>
        </div>
        <ChevronRight
          size={14}
          style={{
            color: 'var(--ink-faint)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {expanded && (
        <div
          className="mt-3 pt-3 space-y-3"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          {/* 설명 */}
          {vig.description && (
            <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
              {vig.description}
            </div>
          )}

          {/* Reportability 자동 판정 */}
          <div
            className="rounded-lg p-3"
            style={{ background: 'var(--bg-soft)' }}
          >
            <div
              className="font-mono text-[10px] tracking-[0.16em] uppercase mb-2"
              style={{ color: 'var(--ink-mute)' }}
            >
              REPORTABILITY · 보고 의무 자동 1차 판정 (AI 보조)
            </div>
            <div className="space-y-1.5">
              {Object.entries(vig.reportability?.decisions || {}).map(
                ([jurisdiction, decision]) => {
                  const deadlineStr = vig.reportability?.deadlines?.[jurisdiction]
                  const reported = vig.reports?.find(
                    (r) => r.jurisdiction === jurisdiction
                  )
                  const tone =
                    decision === 'reportable'
                      ? 'rust'
                      : decision === 'not-reportable'
                      ? 'ink-mute'
                      : decision === 'pending'
                      ? 'amber'
                      : 'ink-mute'
                  return (
                    <div
                      key={jurisdiction}
                      className="flex items-center gap-2 text-[12px]"
                    >
                      <span style={{ minWidth: 110 }}>
                        {REPORT_FORMS[jurisdiction]?.ko || jurisdiction}
                      </span>
                      <span
                        className="font-mono text-[9.5px] px-1.5 py-0.5 rounded"
                        style={{
                          background: `var(--${tone}-soft)`,
                          color: `var(--${tone})`,
                          fontWeight: 500,
                        }}
                      >
                        {decision === 'reportable' && '보고 의무'}
                        {decision === 'not-reportable' && '비보고'}
                        {decision === 'pending' && '판정 대기'}
                        {decision === 'not-applicable' && '해당 없음'}
                      </span>
                      {deadlineStr && !reported && (
                        <span
                          className="font-mono text-[10.5px]"
                          style={{ color: 'var(--ink-mute)' }}
                        >
                          마감: {new Date(deadlineStr).toLocaleString('ko-KR')}
                        </span>
                      )}
                      {reported && (
                        <span
                          className="font-mono text-[10.5px]"
                          style={{ color: 'var(--moss)' }}
                        >
                          ✓ 제출 완료
                        </span>
                      )}
                      {decision === 'pending' && (
                        <button
                          onClick={() =>
                            onApprove(vig.id, { [jurisdiction]: 'reportable' })
                          }
                          className="ml-auto text-[10.5px] underline"
                          style={{ color: 'var(--rust)' }}
                        >
                          보고 승인
                        </button>
                      )}
                      {decision === 'reportable' && !reported && (
                        <button
                          onClick={() =>
                            onReport(vig.id, jurisdiction, REPORT_FORMS[jurisdiction]?.ko)
                          }
                          className="ml-auto text-[10.5px] underline"
                          style={{ color: 'var(--moss)' }}
                        >
                          보고서 제출
                        </button>
                      )}
                    </div>
                  )
                }
              )}
            </div>
            {!vig.reportability?.approvedBy && (
              <div
                className="mt-2 text-[10.5px]"
                style={{ color: 'var(--ink-faint)' }}
              >
                ※ AI 1차 판정 — PRRC(MDR Article 15) 또는 품질경영대리인 최종 승인 필요 (§22 인간 감독)
              </div>
            )}
          </div>

          {/* 종결 버튼 */}
          {vig.status !== 'closed' && (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="btn-ghost text-[12px]"
                style={{ color: 'var(--ink-mute)' }}
              >
                <X size={11} /> 케이스 종결
              </button>
            </div>
          )}

          {vig.closingSummary && (
            <div
              className="rounded-md p-2.5 text-[11.5px]"
              style={{
                background: 'var(--leaf-soft)',
                color: 'var(--moss)',
              }}
            >
              ✓ 종결됨: {vig.closingSummary}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ================================================================
   부속
   ================================================================ */
function ComplianceFooter({ regs }) {
  return (
    <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
      <div
        className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1.5"
        style={{ color: 'var(--ink-faint)' }}
      >
        REGULATORY MAPPING
      </div>
      <div className="flex flex-wrap gap-1">
        {regs.map((r, i) => (
          <span
            key={i}
            className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}
          >
            {r}
          </span>
        ))}
      </div>
    </div>
  )
}
