// src/pages/quality-policy/QualityPolicyHub.jsx
// ISO 13485 §5.1 경영 의지 / §5.2 고객 중시 / §5.3 품질 방침
import React, { useState, useMemo } from 'react'
import {
  Edit2, Save, X, Plus, Trash2, CheckCircle2, AlertTriangle,
  FileText, Users, ClipboardList, BarChart2, Award, MessageSquare,
  Shield,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

// ── 상수 ─────────────────────────────────────────────────────
const LS_KEY_POLICY   = 'qualytree.quality_policy'
const LS_KEY_EVIDENCE = 'qualytree.quality_policy_evidence'

// §5.1 경영 의지 증거 유형
const EVIDENCE_TYPES = {
  meeting:       { label: '경영검토 회의',   color: '#2563EB', bg: '#DBEAFE' },
  communication: { label: '품질 방침 전달',  color: '#7C3AED', bg: '#EDE9FE' },
  resource:      { label: '자원 배정 결정',  color: '#059669', bg: '#D1FAE5' },
  training:      { label: '교육 실시 지시',  color: '#D97706', bg: '#FEF3C7' },
  customer:      { label: '고객 중시 활동',  color: '#0891B2', bg: '#CFFAFE' },
  audit:         { label: '감사 결과 검토',  color: '#DC2626', bg: '#FEE2E2' },
  improvement:   { label: '개선 활동 지시',  color: '#16A34A', bg: '#DCFCE7' },
  other:         { label: '기타',            color: '#6B7280', bg: '#F3F4F6' },
}

// §5.3 품질 방침 기본값
const DEFAULT_POLICY = {
  statement: '',           // 품질 방침 선언문
  visionStatement: '',     // 비전
  objectives: '',          // 방침에서 도출되는 품질 목표 방향
  scope: '',               // 방침 적용 범위
  revision: 'Rev.0',
  issueDate: '',
  reviewDate: '',
  approvedBy: '',
  // §5.3(c) 품질 목표 수립을 위한 틀 제공
  objectivesFramework: '',
  // §5.3(d) 조직 내 전달·이해
  communicationMethod: '',
  // §5.3(e) 지속적 적합성 검토
  reviewFrequency: '연 1회 (경영검토 시)',
  // §5.2 고객 중시
  customerReqMethod: '',   // 고객 요구사항 결정 방법
  customerSatisfactionMethod: '', // 고객 만족 측정 방법
  // §5.1 경영 의지 선언
  commitmentStatement: '',
  regulatoryCommitment: '', // 법규 요구사항 준수 의지
  distributionList: [],    // 배포 목록
  revisionHistory: [],     // 개정 이력
}

function today() { return new Date().toISOString().slice(0, 10) }
function genId() { return `EV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

const EMPTY_EVIDENCE = {
  type: 'meeting',
  date: today(),
  title: '',
  attendees: '',
  description: '',
  outcome: '',
  recordRef: '',
}

// ── 메인 ─────────────────────────────────────────────────────
export default function QualityPolicyHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  // §5.3 품질 방침 (단일 문서)
  const [policy, setPolicy] = useState(() => {
    try { return { ...DEFAULT_POLICY, ...JSON.parse(localStorage.getItem(LS_KEY_POLICY) || '{}') } } catch { return DEFAULT_POLICY }
  })
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(false)

  // §5.1/5.2 증거 기록
  const [evidences, setEvidences] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_EVIDENCE) || '[]') } catch { return [] }
  })
  const [showEvidenceForm, setShowEvidenceForm] = useState(false)
  const [evidenceForm, setEvidenceForm] = useState(EMPTY_EVIDENCE)
  const [editEvidenceId, setEditEvidenceId] = useState(null)
  const [filterType, setFilterType] = useState('all')

  const [tab, setTab] = useState('policy') // policy | evidence | analysis

  function savePolicy() {
    const updated = { ...draft }
    setPolicy(updated)
    localStorage.setItem(LS_KEY_POLICY, JSON.stringify(updated))
    setEditing(false)
    setDraft(null)
  }

  function startEdit() { setDraft({ ...policy }); setEditing(true) }
  function cancelEdit() { setEditing(false); setDraft(null) }
  const D = (k, v) => setDraft(d => ({ ...d, [k]: v }))

  function saveEvidence() {
    if (!evidenceForm.title.trim()) return alert('제목을 입력하세요.')
    let updated
    if (editEvidenceId) {
      updated = evidences.map(e => e.id === editEvidenceId ? { ...e, ...evidenceForm } : e)
    } else {
      updated = [{ id: genId(), createdAt: today(), ...evidenceForm }, ...evidences]
    }
    setEvidences(updated)
    localStorage.setItem(LS_KEY_EVIDENCE, JSON.stringify(updated))
    setShowEvidenceForm(false); setEvidenceForm(EMPTY_EVIDENCE); setEditEvidenceId(null)
  }

  function deleteEvidence(id) {
    if (!confirm('삭제하시겠습니까?')) return
    const updated = evidences.filter(e => e.id !== id)
    setEvidences(updated)
    localStorage.setItem(LS_KEY_EVIDENCE, JSON.stringify(updated))
  }

  const EF = (k, v) => setEvidenceForm(f => ({ ...f, [k]: v }))

  const filteredEvidences = useMemo(() =>
    evidences.filter(e => filterType === 'all' || e.type === filterType),
    [evidences, filterType])

  // 완성도 체크
  const completeness = useMemo(() => {
    const checks = [
      { label: '품질 방침 선언문', ok: !!policy.statement },
      { label: '승인자', ok: !!policy.approvedBy },
      { label: '전달 방법 (§5.3d)', ok: !!policy.communicationMethod },
      { label: '고객 요구사항 결정 방법 (§5.2)', ok: !!policy.customerReqMethod },
      { label: '경영 의지 선언 (§5.1)', ok: !!policy.commitmentStatement },
      { label: '경영 의지 증거 기록', ok: evidences.length > 0 },
      { label: '법규 준수 의지 (§5.1)', ok: !!policy.regulatoryCommitment },
    ]
    const done = checks.filter(c => c.ok).length
    return { checks, done, total: checks.length, pct: Math.round((done / checks.length) * 100) }
  }, [policy, evidences])

  const analysis = useMemo(() => {
    const byType = {}
    Object.keys(EVIDENCE_TYPES).forEach(k => { byType[k] = evidences.filter(e => e.type === k).length })
    const thisYear = new Date().getFullYear()
    const thisYearCount = evidences.filter(e => e.date?.startsWith(String(thisYear))).length
    return { byType, thisYearCount }
  }, [evidences])

  return (
    <AppLayout user={user} title="경영 의지·품질 방침" subtitle="ISO 13485 §5.1 경영 의지 / §5.2 고객 중시 / §5.3 품질 방침">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* 완성도 배지 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-bold"
            style={{ background: completeness.pct >= 80 ? '#D1FAE5' : '#FEF3C7', color: completeness.pct >= 80 ? '#065F46' : '#92400E' }}>
            {completeness.pct >= 80 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            완성도 {completeness.pct}% ({completeness.done}/{completeness.total})
          </div>
          {completeness.checks.filter(c => !c.ok).slice(0, 3).map(c => (
            <span key={c.label} className="px-2 py-1 rounded-lg text-[11px]" style={{ background: '#FEE2E2', color: '#DC2626' }}>미완: {c.label}</span>
          ))}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'policy',   label: '품질 방침 (§5.3)' },
            { key: 'evidence', label: `경영 의지 증거 (${evidences.length})` },
            { key: 'analysis', label: '현황 분석' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                border: 'none', cursor: 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 품질 방침 탭 ── */}
        {tab === 'policy' && (
          <div className="space-y-4">
            {/* 툴바 */}
            {canEdit && !editing && (
              <div className="flex justify-end">
                <button onClick={startEdit}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Edit2 size={13} /> 편집
                </button>
              </div>
            )}
            {editing && (
              <div className="flex gap-2 justify-end">
                <button onClick={savePolicy}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Save size={13} /> 저장
                </button>
                <button onClick={cancelEdit}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                  <X size={13} /> 취소
                </button>
              </div>
            )}

            {/* §5.3 품질 방침 */}
            <SectionCard icon={<Award size={15} />} title="§5.3 품질 방침" accent="#2563EB">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <PolicyField label="품질 방침 선언문 *" value={editing ? draft.statement : policy.statement}
                    onChange={v => D('statement', v)} editing={editing} multiline rows={4}
                    placeholder="품질 방침은 조직의 품질에 대한 의도와 방향을 공식적으로 표명한 것으로..." />
                </div>
                <PolicyField label="비전" value={editing ? draft.visionStatement : policy.visionStatement}
                  onChange={v => D('visionStatement', v)} editing={editing}
                  placeholder="품질로 신뢰받는 의료기기 전문기업" />
                <PolicyField label="§5.3(b) 적용 범위" value={editing ? draft.scope : policy.scope}
                  onChange={v => D('scope', v)} editing={editing}
                  placeholder="당사의 모든 의료기기 설계·개발·제조·판매 활동에 적용" />
                <div className="md:col-span-2">
                  <PolicyField label="§5.3(c) 품질 목표 수립 틀" value={editing ? draft.objectivesFramework : policy.objectivesFramework}
                    onChange={v => D('objectivesFramework', v)} editing={editing} multiline rows={2}
                    placeholder="본 방침으로부터 도출되는 품질 목표는 매년 경영검토에서 설정하며..." />
                </div>
                <PolicyField label="§5.3(d) 전달 방법" value={editing ? draft.communicationMethod : policy.communicationMethod}
                  onChange={v => D('communicationMethod', v)} editing={editing}
                  placeholder="입사 교육, 게시판 부착, 연간 교육 등" />
                <PolicyField label="§5.3(e) 검토 주기" value={editing ? draft.reviewFrequency : policy.reviewFrequency}
                  onChange={v => D('reviewFrequency', v)} editing={editing} />
                <PolicyField label="개정 번호" value={editing ? draft.revision : policy.revision}
                  onChange={v => D('revision', v)} editing={editing} />
                <PolicyField label="발행일" type="date" value={editing ? draft.issueDate : policy.issueDate}
                  onChange={v => D('issueDate', v)} editing={editing} />
                <PolicyField label="승인자" value={editing ? draft.approvedBy : policy.approvedBy}
                  onChange={v => D('approvedBy', v)} editing={editing} />
                <PolicyField label="차기 검토일" type="date" value={editing ? draft.reviewDate : policy.reviewDate}
                  onChange={v => D('reviewDate', v)} editing={editing} />
              </div>
            </SectionCard>

            {/* §5.2 고객 중시 */}
            <SectionCard icon={<Users size={15} />} title="§5.2 고객 중시" accent="#0891B2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PolicyField label="고객 요구사항 결정 방법 *" value={editing ? draft.customerReqMethod : policy.customerReqMethod}
                  onChange={v => D('customerReqMethod', v)} editing={editing} multiline rows={2}
                  placeholder="고객 계약서 검토, 고객 방문, VOC 수집..." />
                <PolicyField label="고객 만족 측정 방법" value={editing ? draft.customerSatisfactionMethod : policy.customerSatisfactionMethod}
                  onChange={v => D('customerSatisfactionMethod', v)} editing={editing} multiline rows={2}
                  placeholder="정기 고객 만족도 설문, 불만 건수 추적, 반품율 모니터링..." />
              </div>
            </SectionCard>

            {/* §5.1 경영 의지 */}
            <SectionCard icon={<FileText size={15} />} title="§5.1 경영 의지" accent="#7C3AED">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <PolicyField label="경영 의지 선언 *" value={editing ? draft.commitmentStatement : policy.commitmentStatement}
                    onChange={v => D('commitmentStatement', v)} editing={editing} multiline rows={3}
                    placeholder="최고 경영자는 품질경영시스템의 개발 및 실행과 그 효과성을 지속적으로 개선하기 위한 의지를 다음을 통해 입증한다..." />
                </div>
                <div className="md:col-span-2">
                  <PolicyField label="§5.1(b) 법규 요구사항 준수 의지" value={editing ? draft.regulatoryCommitment : policy.regulatoryCommitment}
                    onChange={v => D('regulatoryCommitment', v)} editing={editing} multiline rows={2}
                    placeholder="당사는 의료기기법, ISO 13485, 해당 규제 요구사항 및 고객 요구사항을 충족할 것을 약속한다..." />
                </div>
              </div>
            </SectionCard>

            {/* 배포 목록 */}
            <SectionCard icon={<ClipboardList size={15} />} title="배포 목록" accent="#059669">
              {editing ? (
                <DistributionEditor list={draft.distributionList || []} onChange={v => D('distributionList', v)} />
              ) : (
                (policy.distributionList || []).length === 0
                  ? <p className="text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>배포 목록을 등록하세요.</p>
                  : <div className="flex flex-wrap gap-2">
                      {(policy.distributionList || []).map((d, i) => (
                        <span key={i} className="px-3 py-1 rounded-full text-[12px]"
                          style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>{d}</span>
                      ))}
                    </div>
              )}
            </SectionCard>

            {/* 개정 이력 */}
            <SectionCard icon={<MessageSquare size={15} />} title="개정 이력" accent="#6B7280">
              {editing ? (
                <RevisionEditor list={draft.revisionHistory || []} onChange={v => D('revisionHistory', v)} />
              ) : (
                (policy.revisionHistory || []).length === 0
                  ? <p className="text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>개정 이력을 등록하세요.</p>
                  : <table className="w-full text-[12px]">
                      <thead>
                        <tr style={{ background: 'var(--bg-soft)' }}>
                          {['개정 번호', '일자', '개정 내용', '개정자'].map(h => (
                            <th key={h} className="px-3 py-2 text-left" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(policy.revisionHistory || []).map((r, i) => (
                          <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                            <td className="px-3 py-2">{r.rev}</td>
                            <td className="px-3 py-2">{r.date}</td>
                            <td className="px-3 py-2">{r.desc}</td>
                            <td className="px-3 py-2">{r.by}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
              )}
            </SectionCard>
          </div>
        )}

        {/* ── 경영 의지 증거 탭 ── */}
        {tab === 'evidence' && (
          <div>
            <div className="flex gap-2 mb-4 flex-wrap items-center">
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">전체 유형</option>
                {Object.entries(EVIDENCE_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              {canEdit && (
                <button onClick={() => { setEvidenceForm(EMPTY_EVIDENCE); setEditEvidenceId(null); setShowEvidenceForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 증거 등록
                </button>
              )}
            </div>

            {showEvidenceForm && (
              <EvidenceForm form={evidenceForm} EF={EF} onSave={saveEvidence}
                onCancel={() => { setShowEvidenceForm(false); setEvidenceForm(EMPTY_EVIDENCE); setEditEvidenceId(null) }}
                isEdit={!!editEvidenceId} />
            )}

            <div className="space-y-3">
              {filteredEvidences.length === 0 && (
                <div className="text-center py-16 text-[13px]" style={{ color: 'var(--ink-faint)' }}>
                  경영 의지 증거 기록이 없습니다.
                </div>
              )}
              {filteredEvidences.map(ev => {
                const et = EVIDENCE_TYPES[ev.type] || EVIDENCE_TYPES.other
                return (
                  <div key={ev.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: et.bg, color: et.color }}>{et.label}</span>
                          <span className="font-bold text-[14px]" style={{ color: 'var(--ink)' }}>{ev.title}</span>
                          <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{ev.date}</span>
                        </div>
                        {ev.description && <p className="text-[12.5px] mb-1" style={{ color: 'var(--ink-soft)' }}>{ev.description}</p>}
                        <div className="flex gap-3 text-[11.5px] flex-wrap" style={{ color: 'var(--ink-faint)' }}>
                          {ev.attendees && <span>참석자: {ev.attendees}</span>}
                          {ev.outcome && <span>결과: {ev.outcome}</span>}
                          {ev.recordRef && <span>기록 참조: {ev.recordRef}</span>}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setEvidenceForm({ ...EMPTY_EVIDENCE, ...ev }); setEditEvidenceId(ev.id); setShowEvidenceForm(true) }}
                            className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                            <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                          </button>
                          <button onClick={() => deleteEvidence(ev.id)}
                            className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                            <Trash2 size={12} style={{ color: '#DC2626' }} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 분석 탭 ── */}
        {tab === 'analysis' && (
          <div className="space-y-5">
            {/* 완성도 */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>§5.1/5.2/5.3 이행 완성도</div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-2.5 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                  <div className="h-2.5 rounded-full transition-all"
                    style={{ width: `${completeness.pct}%`, background: completeness.pct >= 80 ? 'var(--moss)' : '#F59E0B' }} />
                </div>
                <span className="text-[13px] font-bold" style={{ color: 'var(--moss)' }}>{completeness.pct}%</span>
              </div>
              {completeness.checks.map(c => (
                <div key={c.label} className="flex items-center gap-2 py-1">
                  <span style={{ color: c.ok ? '#059669' : '#DC2626', fontSize: 13 }}>{c.ok ? '✓' : '✗'}</span>
                  <span className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{c.label}</span>
                </div>
              ))}
            </div>

            {/* 증거 유형별 통계 */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>
                경영 의지 증거 유형별 현황 (금년 {analysis.thisYearCount}건 포함 총 {evidences.length}건)
              </div>
              {Object.entries(EVIDENCE_TYPES).map(([k, v]) => (
                <div key={k} className="flex items-center gap-3 mb-2">
                  <span className="text-[12px] w-28 shrink-0" style={{ color: 'var(--ink-soft)' }}>{v.label}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                    <div className="h-2 rounded-full" style={{
                      width: evidences.length ? `${((analysis.byType[k] || 0) / evidences.length) * 100}%` : '0%',
                      background: v.color,
                    }} />
                  </div>
                  <span className="text-[12px] font-bold w-5 text-right" style={{ color: 'var(--ink)' }}>{analysis.byType[k] || 0}</span>
                </div>
              ))}
            </div>

            {/* 방침 현황 요약 */}
            {policy.statement && (
              <div className="p-5 rounded-2xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <div className="text-[12.5px] font-bold mb-2" style={{ color: '#1E40AF' }}>품질 방침 현황</div>
                <p className="text-[12.5px]" style={{ color: '#1E40AF' }}>
                  {policy.revision} · 승인자: {policy.approvedBy || '미지정'} · 발행일: {policy.issueDate || '미입력'}
                  {policy.reviewDate && ` · 차기 검토: ${policy.reviewDate}`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────
function SectionCard({ icon, title, accent, children }) {
  return (
    <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: `1.5px solid ${accent}30` }}>
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: accent }}>{icon}</span>
        <span className="font-bold text-[14px]" style={{ color: accent }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function PolicyField({ label, value, onChange, editing, type = 'text', multiline, rows = 2, placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      {editing ? (
        multiline
          ? <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
              className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
          : <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
              className="w-full px-3 py-1.5 rounded-xl text-[13px]"
              style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
      ) : (
        value
          ? <p className="text-[13px] whitespace-pre-line" style={{ color: 'var(--ink)' }}>{value}</p>
          : <p className="text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>{placeholder || '—'}</p>
      )}
    </div>
  )
}

function EvidenceForm({ form, EF, onSave, onCancel, isEdit }) {
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '증거 수정' : '경영 의지 증거 등록'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>유형</label>
          <select value={form.type} onChange={e => EF('type', e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            {Object.entries(EVIDENCE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <SmallField label="제목 *" value={form.title} onChange={v => EF('title', v)} />
        <SmallField label="일자" type="date" value={form.date} onChange={v => EF('date', v)} />
        <SmallField label="참석자" value={form.attendees} onChange={v => EF('attendees', v)} placeholder="홍길동, 김철수..." />
        <SmallField label="기록 참조 번호" value={form.recordRef} onChange={v => EF('recordRef', v)} placeholder="MOM-2026-001" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <SmallArea label="내용 설명" value={form.description} onChange={v => EF('description', v)} rows={2} />
        <SmallArea label="결과·조치사항" value={form.outcome} onChange={v => EF('outcome', v)} rows={2} />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Save size={13} /> 저장
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>취소</button>
      </div>
    </div>
  )
}

function DistributionEditor({ list, onChange }) {
  const [input, setInput] = useState('')
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { onChange([...list, input.trim()]); setInput('') } }}
          placeholder="부서/직책 입력 후 Enter"
          className="flex-1 px-3 py-1.5 rounded-xl text-[13px]"
          style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
        <button onClick={() => { if (input.trim()) { onChange([...list, input.trim()]); setInput('') } }}
          className="px-3 py-1.5 rounded-xl text-[13px] font-semibold"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>추가</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {list.map((d, i) => (
          <span key={i} className="flex items-center gap-1 px-3 py-1 rounded-full text-[12px]"
            style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
            {d}
            <button onClick={() => onChange(list.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--moss)', fontSize: 14, lineHeight: 1 }}>×</button>
          </span>
        ))}
      </div>
    </div>
  )
}

function RevisionEditor({ list, onChange }) {
  const [row, setRow] = useState({ rev: '', date: today(), desc: '', by: '' })
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        {[['rev', '개정 번호', 'Rev.1'], ['date', '일자', ''], ['desc', '개정 내용', ''], ['by', '개정자', '']].map(([k, l, ph]) => (
          <input key={k} type={k === 'date' ? 'date' : 'text'} value={row[k]} onChange={e => setRow(r => ({ ...r, [k]: e.target.value }))}
            placeholder={l}
            className="px-2 py-1 rounded-lg text-[12.5px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
        ))}
      </div>
      <button onClick={() => { if (row.rev.trim()) { onChange([...list, { ...row }]); setRow({ rev: '', date: today(), desc: '', by: '' }) } }}
        className="px-3 py-1 rounded-lg text-[12px] font-semibold mb-3"
        style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>+ 이력 추가</button>
      {list.length > 0 && (
        <table className="w-full text-[12px]">
          <thead><tr style={{ background: 'var(--bg-soft)' }}>
            {['개정 번호', '일자', '개정 내용', '개정자', ''].map(h => (
              <th key={h} className="px-2 py-1.5 text-left" style={{ color: 'var(--ink-soft)' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{list.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
              <td className="px-2 py-1.5">{r.rev}</td>
              <td className="px-2 py-1.5">{r.date}</td>
              <td className="px-2 py-1.5">{r.desc}</td>
              <td className="px-2 py-1.5">{r.by}</td>
              <td className="px-2 py-1.5">
                <button onClick={() => onChange(list.filter((_, j) => j !== i))}
                  className="p-1 rounded" style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={10} style={{ color: '#DC2626' }} />
                </button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  )
}

function SmallField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}

function SmallArea({ label, value, onChange, rows = 2 }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows}
        className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
