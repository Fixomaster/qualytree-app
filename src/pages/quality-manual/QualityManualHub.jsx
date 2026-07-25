// src/pages/quality-manual/QualityManualHub.jsx
// ISO 13485 §4.2.1 — 품질 매뉴얼
import React, { useState, useMemo } from 'react'
import {
  Save, Edit2, Plus, Trash2, BookOpen, FileText,
  CheckCircle2, AlertTriangle, GitBranch, Users,
  RefreshCw, ChevronDown, ChevronRight, Download,
  Star, Layers, ArrowRight,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

// ── 상수 ─────────────────────────────────────────────────────
const LS_KEY = 'qualytree.quality_manual'

// ISO 13485:2016 조항별 프로세스 목록 (§4.2.1(c) 참조 필수)
const ISO_SECTIONS = [
  { clause: '4',     title: '품질경영시스템 일반 요구사항' },
  { clause: '4.1',   title: '일반 요구사항 (QMS 수립·유지·개선)' },
  { clause: '4.2',   title: '문서화 요구사항' },
  { clause: '4.2.1', title: '일반 (문서화된 QMS)' },
  { clause: '4.2.2', title: '품질 매뉴얼' },
  { clause: '4.2.3', title: '의료기기 파일' },
  { clause: '4.2.4', title: '문서 관리' },
  { clause: '4.2.5', title: '기록 관리' },
  { clause: '5',     title: '경영자 책임' },
  { clause: '5.1',   title: '경영 의지' },
  { clause: '5.2',   title: '고객 중시' },
  { clause: '5.3',   title: '품질 방침' },
  { clause: '5.4',   title: '기획' },
  { clause: '5.5',   title: '책임·권한·의사소통' },
  { clause: '5.6',   title: '경영 검토' },
  { clause: '6',     title: '자원 관리' },
  { clause: '6.1',   title: '자원 확보' },
  { clause: '6.2',   title: '인적 자원' },
  { clause: '6.3',   title: '인프라' },
  { clause: '6.4',   title: '작업 환경' },
  { clause: '7',     title: '제품 실현' },
  { clause: '7.1',   title: '제품 실현 기획' },
  { clause: '7.2',   title: '고객 관련 프로세스' },
  { clause: '7.3',   title: '설계 및 개발' },
  { clause: '7.4',   title: '구매' },
  { clause: '7.5',   title: '생산 및 서비스 제공' },
  { clause: '7.6',   title: '모니터링·측정 장비 관리' },
  { clause: '8',     title: '측정·분석·개선' },
  { clause: '8.1',   title: '일반 (모니터링·측정·분석·개선 기획)' },
  { clause: '8.2',   title: '모니터링 및 측정' },
  { clause: '8.3',   title: '부적합 제품 관리' },
  { clause: '8.4',   title: '데이터 분석' },
  { clause: '8.5',   title: '개선' },
]

// Qualytree 내 구현 허브 매핑
const QUALYTREE_HUBS = [
  { path: '/quality-objectives',     label: '품질 목표 관리',     clause: '5.4' },
  { path: '/org-responsibility',     label: '조직·책임 관리',     clause: '5.5' },
  { path: '/management-review',      label: '경영 검토',          clause: '5.6' },
  { path: '/competency',             label: '역량 관리',          clause: '6.2' },
  { path: '/infrastructure',         label: '인프라 관리',        clause: '6.3' },
  { path: '/work-env',               label: '작업환경 관리',      clause: '6.4' },
  { path: '/quality-plan',           label: '품질 계획',          clause: '7.1' },
  { path: '/customer-req',           label: '고객 요구사항 검토', clause: '7.2' },
  { path: '/dhf',                    label: '설계 이력 파일',     clause: '7.3' },
  { path: '/suppliers',              label: '공급업체 관리',      clause: '7.4' },
  { path: '/purchase-verification',  label: '구매 정보·수입검사', clause: '7.4' },
  { path: '/inspection',             label: '공정·최종 검사',     clause: '7.5' },
  { path: '/validation',             label: '공정 유효성 확인',   clause: '7.5' },
  { path: '/product-id',             label: '제품 식별·상태',     clause: '7.5' },
  { path: '/traceability',           label: '제품 추적성',        clause: '7.5' },
  { path: '/preservation',           label: '제품 보존·취급',     clause: '7.5' },
  { path: '/service',                label: '설치·서비스',        clause: '7.5' },
  { path: '/calibration',            label: '교정 관리',          clause: '7.6' },
  { path: '/quality-dashboard',      label: '품질 KPI 대시보드',  clause: '8' },
  { path: '/complaints',             label: '고객불만 관리',      clause: '8.2' },
  { path: '/audit',                  label: '내부감사',           clause: '8.2' },
  { path: '/quality',                label: 'NCR / 부적합 관리',  clause: '8.3' },
  { path: '/risk',                   label: '위험관리 (FMEA)',    clause: '8' },
  { path: '/change-control',         label: '변경 관리',          clause: '4.1' },
  { path: '/doc-control',            label: '문서 관리 대장',     clause: '4.2' },
  { path: '/improvement',            label: '개선 활동',          clause: '8.5' },
]

// 핵심 프로세스 상호작용 (텍스트 기반 플로우)
const PROCESS_INTERACTIONS = [
  { from: '고객 요구사항',    to: '품질 계획',         arrow: true },
  { from: '품질 계획',        to: '설계·개발',         arrow: true },
  { from: '설계·개발',        to: '구매',              arrow: true },
  { from: '구매',             to: '수입검사 (IQC)',     arrow: true },
  { from: '수입검사 (IQC)',   to: '생산·서비스',       arrow: true },
  { from: '생산·서비스',      to: '공정 검사',         arrow: true },
  { from: '공정 검사',        to: '최종 검사·출하',    arrow: true },
  { from: '최종 검사·출하',   to: '고객',              arrow: true },
  { from: '고객',             to: '고객불만·피드백',   arrow: true },
  { from: '고객불만·피드백',  to: 'CAPA·개선',         arrow: true },
  { from: 'CAPA·개선',        to: '경영 검토',         arrow: true },
]

const DEVICE_CLASSES = ['Class I', 'Class II', 'Class IIa', 'Class IIb', 'Class III', '미분류', '해당 없음']

function today() { return new Date().toISOString().slice(0, 10) }

// ── 기본 매뉴얼 구조 ─────────────────────────────────────────
const DEFAULT_MANUAL = {
  // 기본 정보
  companyName: '',
  manualNo: 'QM-001',
  title: '품질 매뉴얼',
  revision: 'Rev.0',
  issueDate: today(),
  effectiveDate: today(),
  preparedBy: '', reviewedBy: '', approvedBy: '',

  // §4.2.1(a) — QMS 범위
  scope: '',
  deviceTypes: '',         // 적용 의료기기 종류
  deviceClasses: [],       // 기기 등급
  activities: '',          // 조직 활동 (설계/제조/판매 등)

  // §4.2.1(b) — 제외 사항
  hasExclusions: false,
  exclusions: [],          // [{clause, reason}]

  // §4.2.1(c) — 문서화된 절차 참조
  procedureRefs: [],       // [{sop, title, clause, docNo}]

  // 품질 방침 (§5.3)
  qualityPolicy: '',

  // 프로세스 맵 사용자 정의 메모
  processNotes: '',

  // 배포 목록
  distributionList: [],    // [{dept, name, copyNo}]

  // 개정 이력
  revisionHistory: [],     // [{rev, date, description, by}]
}

// ── 메인 ─────────────────────────────────────────────────────
export default function QualityManualHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  const [manual, setManual] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      return saved ? { ...DEFAULT_MANUAL, ...JSON.parse(saved) } : { ...DEFAULT_MANUAL }
    } catch { return { ...DEFAULT_MANUAL } }
  })
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [tab, setTab] = useState('overview')   // overview | scope | procedures | process | distribution | history

  function startEdit() { setDraft(JSON.parse(JSON.stringify(manual))); setEditing(true) }
  function cancelEdit() { setDraft(null); setEditing(false) }
  function saveEdit() {
    const saved = { ...draft }
    setManual(saved)
    localStorage.setItem(LS_KEY, JSON.stringify(saved))
    setEditing(false); setDraft(null)
  }

  const D = draft || manual
  const F = (k, v) => setDraft(d => ({ ...d, [k]: v }))

  // 제외 사항 관리
  function addExclusion() { F('exclusions', [...(D.exclusions || []), { id: Date.now(), clause: '', reason: '' }]) }
  function updateExclusion(id, field, value) { F('exclusions', D.exclusions.map(e => e.id === id ? { ...e, [field]: value } : e)) }
  function removeExclusion(id) { F('exclusions', D.exclusions.filter(e => e.id !== id)) }

  // 절차 참조 관리
  function addProcRef() { F('procedureRefs', [...(D.procedureRefs || []), { id: Date.now(), sop: '', title: '', clause: '', docNo: '' }]) }
  function updateProcRef(id, field, value) { F('procedureRefs', D.procedureRefs.map(p => p.id === id ? { ...p, [field]: value } : p)) }
  function removeProcRef(id) { F('procedureRefs', D.procedureRefs.filter(p => p.id !== id)) }

  // 배포 관리
  function addDist() { F('distributionList', [...(D.distributionList || []), { id: Date.now(), dept: '', name: '', copyNo: '' }]) }
  function updateDist(id, field, value) { F('distributionList', D.distributionList.map(d => d.id === id ? { ...d, [field]: value } : d)) }
  function removeDist(id) { F('distributionList', D.distributionList.filter(d => d.id !== id)) }

  // 개정 이력 추가
  function addRevision() {
    const rev = { id: Date.now(), rev: '', date: today(), description: '', by: user?.name || '' }
    F('revisionHistory', [...(D.revisionHistory || []), rev])
  }
  function updateRev(id, field, value) { F('revisionHistory', D.revisionHistory.map(r => r.id === id ? { ...r, [field]: value } : r)) }
  function removeRev(id) { F('revisionHistory', D.revisionHistory.filter(r => r.id !== id)) }

  // 완성도 체크
  const completeness = useMemo(() => {
    const m = manual
    const checks = [
      { label: 'QMS 범위 등록',         done: !!(m.scope?.trim()) },
      { label: '품질 방침 등록',         done: !!(m.qualityPolicy?.trim()) },
      { label: '절차 참조 1건 이상',     done: (m.procedureRefs?.length || 0) > 0 },
      { label: '승인자 서명',            done: !!(m.approvedBy?.trim()) },
      { label: '유효일 설정',            done: !!(m.effectiveDate) },
      { label: '배포 목록 등록',         done: (m.distributionList?.length || 0) > 0 },
      { label: '제외 사항 처리',         done: !m.hasExclusions || (m.exclusions?.length || 0) > 0 },
    ]
    return checks
  }, [manual])

  const doneCount = completeness.filter(c => c.done).length

  return (
    <AppLayout user={user} title="품질 매뉴얼" subtitle="ISO 13485 §4.2.1 — QMS 범위·제외사항·프로세스 상호작용·절차 참조">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* 헤더 카드 */}
        <div className="mb-5 p-5 rounded-2xl flex items-start justify-between gap-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={18} style={{ color: 'var(--moss)' }} />
              <span className="text-[18px] font-bold" style={{ color: 'var(--ink)' }}>
                {manual.title || '품질 매뉴얼'} {manual.manualNo && `(${manual.manualNo})`}
              </span>
              <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
                {manual.revision || 'Rev.0'}
              </span>
            </div>
            <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>
              {manual.companyName || '(회사명 미등록)'} · 유효일: {manual.effectiveDate || '-'}
            </div>
            {manual.approvedBy && (
              <div className="text-[12px] mt-1" style={{ color: 'var(--ink-faint)' }}>
                작성: {manual.preparedBy || '-'} · 검토: {manual.reviewedBy || '-'} · 승인: {manual.approvedBy}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* 완성도 */}
            <div className="text-center">
              <div className="text-[22px] font-bold" style={{ color: doneCount >= 6 ? '#059669' : '#D97706' }}>
                {doneCount}/{completeness.length}
              </div>
              <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>완성도</div>
            </div>
            {canEdit && !editing && (
              <button onClick={startEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <Edit2 size={13} /> 편집
              </button>
            )}
            {editing && (
              <>
                <button onClick={saveEdit}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Save size={13} /> 저장
                </button>
                <button onClick={cancelEdit} className="px-3 py-2 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                  취소
                </button>
              </>
            )}
          </div>
        </div>

        {/* 완성도 체크리스트 */}
        <div className="mb-5 p-4 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
          <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>§4.2.1 필수 항목 체크</div>
          <div className="flex flex-wrap gap-2">
            {completeness.map(c => (
              <span key={c.label} className="flex items-center gap-1 text-[11.5px] px-2.5 py-1 rounded-full font-semibold"
                style={{ background: c.done ? '#D1FAE5' : '#FEE2E2', color: c.done ? '#059669' : '#DC2626' }}>
                {c.done ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />} {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* 탭 */}
        <div className="flex flex-wrap gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'overview',     label: '기본 정보' },
            { key: 'scope',        label: '적용 범위·제외' },
            { key: 'procedures',   label: `절차 참조 (${manual.procedureRefs?.length || 0})` },
            { key: 'process',      label: '프로세스 맵' },
            { key: 'distribution', label: `배포 목록 (${manual.distributionList?.length || 0})` },
            { key: 'history',      label: `개정 이력 (${manual.revisionHistory?.length || 0})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition"
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

        {/* ── 기본 정보 탭 ── */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {editing ? (
              <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <Field label="회사명" value={D.companyName} onChange={v => F('companyName', v)} />
                  <Field label="매뉴얼 번호" value={D.manualNo} onChange={v => F('manualNo', v)} />
                  <Field label="제목" value={D.title} onChange={v => F('title', v)} />
                  <Field label="개정 번호" value={D.revision} onChange={v => F('revision', v)} placeholder="Rev.0" />
                  <Field label="발행일" type="date" value={D.issueDate} onChange={v => F('issueDate', v)} />
                  <Field label="유효일" type="date" value={D.effectiveDate} onChange={v => F('effectiveDate', v)} />
                  <Field label="작성자" value={D.preparedBy} onChange={v => F('preparedBy', v)} />
                  <Field label="검토자" value={D.reviewedBy} onChange={v => F('reviewedBy', v)} />
                  <Field label="승인자 *" value={D.approvedBy} onChange={v => F('approvedBy', v)} />
                </div>
                <FieldArea label="품질 방침 (§5.3)" value={D.qualityPolicy} onChange={v => F('qualityPolicy', v)} rows={4}
                  placeholder="당사는 ISO 13485 요구사항을 충족하는 의료기기를 지속적으로 제공하기 위해..." />
              </div>
            ) : (
              <div className="space-y-4">
                <InfoSection title="기본 정보">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      ['회사명', manual.companyName],
                      ['매뉴얼 번호', manual.manualNo],
                      ['개정 번호', manual.revision],
                      ['발행일', manual.issueDate],
                      ['유효일', manual.effectiveDate],
                      ['작성자', manual.preparedBy],
                      ['검토자', manual.reviewedBy],
                      ['승인자', manual.approvedBy],
                    ].map(([l, v]) => <InfoItem key={l} label={l} value={v} />)}
                  </div>
                </InfoSection>
                {manual.qualityPolicy && (
                  <InfoSection title="품질 방침 (§5.3)">
                    <p className="text-[13px] whitespace-pre-line leading-relaxed" style={{ color: 'var(--ink)' }}>{manual.qualityPolicy}</p>
                  </InfoSection>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 적용 범위·제외 탭 ── */}
        {tab === 'scope' && (
          <div className="space-y-4">
            {editing ? (
              <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <div className="mb-4 p-3 rounded-xl text-[12px]" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
                  §4.2.1(a) QMS 적용 범위는 제품 유형, 활동, 적용 위치를 명확히 기술해야 합니다.
                </div>
                <FieldArea label="QMS 적용 범위 *" value={D.scope} onChange={v => F('scope', v)} rows={4}
                  placeholder="당사 품질경영시스템의 적용 범위는 [제품 유형]의 설계·개발·제조·판매·서비스에 적용됩니다." />
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="적용 의료기기 종류" value={D.deviceTypes} onChange={v => F('deviceTypes', v)} placeholder="혈압계, 체온계, 주사기..." />
                  <Field label="주요 활동" value={D.activities} onChange={v => F('activities', v)} placeholder="설계·개발·제조·판매·A/S" />
                </div>
                <div className="mt-3">
                  <div className="text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>적용 기기 등급</div>
                  <div className="flex flex-wrap gap-2">
                    {DEVICE_CLASSES.map(cls => (
                      <label key={cls} className="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
                        <input type="checkbox"
                          checked={(D.deviceClasses || []).includes(cls)}
                          onChange={e => F('deviceClasses', e.target.checked
                            ? [...(D.deviceClasses || []), cls]
                            : (D.deviceClasses || []).filter(c => c !== cls))}
                          className="accent-green-500 w-3.5 h-3.5" />
                        {cls}
                      </label>
                    ))}
                  </div>
                </div>

                {/* 제외 사항 */}
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                  <label className="flex items-center gap-2 text-[13px] font-semibold cursor-pointer mb-3" style={{ color: 'var(--ink)' }}>
                    <input type="checkbox" checked={!!D.hasExclusions} onChange={e => F('hasExclusions', e.target.checked)} className="accent-green-500 w-4 h-4" />
                    §4.2.1(b) 제외 사항 있음 (일부 요구사항 적용 제외)
                  </label>
                  {D.hasExclusions && (
                    <div className="space-y-2">
                      {(D.exclusions || []).map(excl => (
                        <div key={excl.id} className="flex gap-2 items-start">
                          <input value={excl.clause} onChange={e => updateExclusion(excl.id, 'clause', e.target.value)}
                            placeholder="제외 조항 (예: 7.3)" className="w-28 px-2 py-1.5 rounded-xl text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                          <input value={excl.reason} onChange={e => updateExclusion(excl.id, 'reason', e.target.value)}
                            placeholder="제외 사유 (예: 설계·개발 활동 없음)" className="flex-1 px-2 py-1.5 rounded-xl text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                          <button onClick={() => removeExclusion(excl.id)} className="p-1.5 rounded-lg mt-0.5"
                            style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={12} style={{ color: '#DC2626' }} />
                          </button>
                        </div>
                      ))}
                      <button onClick={addExclusion} className="flex items-center gap-1 text-[12px] px-3 py-1.5 rounded-xl"
                        style={{ background: 'var(--bg-soft)', border: '1px dashed var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
                        <Plus size={12} /> 제외 사항 추가
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <InfoSection title="§4.2.1(a) QMS 적용 범위">
                  <p className="text-[13px] whitespace-pre-line leading-relaxed mb-3" style={{ color: 'var(--ink)' }}>
                    {manual.scope || <span style={{ color: 'var(--ink-faint)' }}>(미등록)</span>}
                  </p>
                  <div className="flex flex-wrap gap-3 text-[12.5px]">
                    {manual.deviceTypes && <span style={{ color: 'var(--ink-soft)' }}>기기: {manual.deviceTypes}</span>}
                    {manual.activities && <span style={{ color: 'var(--ink-soft)' }}>활동: {manual.activities}</span>}
                    {(manual.deviceClasses || []).length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {manual.deviceClasses.map(c => (
                          <span key={c} className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </InfoSection>

                <InfoSection title="§4.2.1(b) 제외 사항">
                  {!manual.hasExclusions ? (
                    <p className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>제외 사항 없음 — 모든 ISO 13485 요구사항 적용</p>
                  ) : (manual.exclusions || []).length === 0 ? (
                    <p className="text-[13px]" style={{ color: '#DC2626' }}>제외 사항 있음으로 설정됐으나 항목이 등록되지 않았습니다.</p>
                  ) : (
                    <table className="w-full text-[12.5px]">
                      <thead><tr style={{ background: 'var(--bg-soft)' }}>
                        <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>제외 조항</th>
                        <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>제외 사유</th>
                      </tr></thead>
                      <tbody>
                        {manual.exclusions.map((e, i) => (
                          <tr key={e.id} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                            <td className="px-3 py-2 font-mono font-bold" style={{ color: '#D97706' }}>§{e.clause}</td>
                            <td className="px-3 py-2" style={{ color: 'var(--ink)' }}>{e.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </InfoSection>
              </div>
            )}
          </div>
        )}

        {/* ── 절차 참조 탭 ── */}
        {tab === 'procedures' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>§4.2.1(c) 문서화된 절차의 참조 — 해당 SOP/문서를 ISO 조항과 연결하여 등록하세요.</div>
              {editing && (
                <button onClick={addProcRef} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
                  <Plus size={12} /> 절차 추가
                </button>
              )}
            </div>

            {/* ISO 조항 커버리지 미니 뷰 */}
            <div className="mb-4 p-4 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
              <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>Qualytree 허브 연결 현황</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {QUALYTREE_HUBS.map(h => (
                  <div key={h.path} className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                    <CheckCircle2 size={10} style={{ color: 'var(--moss)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--ink-soft)' }}>{h.label}</span>
                    <span className="ml-auto font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>§{h.clause}</span>
                  </div>
                ))}
              </div>
            </div>

            {editing ? (
              <div className="space-y-2">
                {(D.procedureRefs || []).map(p => (
                  <div key={p.id} className="flex gap-2 flex-wrap items-center p-2 rounded-xl"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                    <input value={p.sop} onChange={e => updateProcRef(p.id, 'sop', e.target.value)}
                      placeholder="SOP/절차서 번호" className="w-32 px-2 py-1.5 rounded-lg text-[12.5px]"
                      style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                    <input value={p.title} onChange={e => updateProcRef(p.id, 'title', e.target.value)}
                      placeholder="문서 제목" className="flex-1 min-w-[160px] px-2 py-1.5 rounded-lg text-[12.5px]"
                      style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                    <select value={p.clause} onChange={e => updateProcRef(p.id, 'clause', e.target.value)}
                      className="w-40 px-2 py-1.5 rounded-lg text-[12.5px]"
                      style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                      <option value="">ISO 조항 선택</option>
                      {ISO_SECTIONS.map(s => <option key={s.clause} value={s.clause}>§{s.clause} {s.title}</option>)}
                    </select>
                    <button onClick={() => removeProcRef(p.id)} className="p-1.5 rounded-lg"
                      style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={11} style={{ color: '#DC2626' }} />
                    </button>
                  </div>
                ))}
                {(D.procedureRefs || []).length === 0 && (
                  <div className="text-center py-6 text-[13px]" style={{ color: 'var(--ink-faint)' }}>
                    "절차 추가" 버튼으로 SOP를 등록하세요.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                <table className="w-full text-[12.5px]">
                  <thead><tr style={{ background: 'var(--bg-soft)' }}>
                    {['SOP 번호', '문서 제목', 'ISO 조항'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {(manual.procedureRefs || []).length === 0 ? (
                      <tr><td colSpan={3} className="text-center py-10" style={{ color: 'var(--ink-faint)' }}>등록된 절차 참조가 없습니다. 편집 버튼을 클릭하세요.</td></tr>
                    ) : (manual.procedureRefs || []).map((p, i) => (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                        <td className="px-3 py-2 font-mono text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{p.sop || '-'}</td>
                        <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }}>{p.title}</td>
                        <td className="px-3 py-2">
                          {p.clause && <span className="font-mono text-[11.5px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>§{p.clause}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 프로세스 맵 탭 ── */}
        {tab === 'process' && (
          <div>
            <div className="text-[12.5px] mb-4" style={{ color: 'var(--ink-soft)' }}>
              §4.2.1(d) 프로세스 상호작용 — 핵심 QMS 프로세스의 순서 및 상호작용을 시각화합니다.
            </div>
            {/* 프로세스 플로우 */}
            <div className="p-5 rounded-2xl mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>핵심 프로세스 흐름도</div>
              <div className="flex flex-wrap gap-2 items-center">
                {PROCESS_INTERACTIONS.map((pi, idx) => (
                  <React.Fragment key={idx}>
                    <div className="px-3 py-2 rounded-xl text-[12px] font-semibold text-center"
                      style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', minWidth: 90 }}>
                      {pi.from}
                    </div>
                    {pi.arrow && <ArrowRight size={14} style={{ color: 'var(--moss)', flexShrink: 0 }} />}
                  </React.Fragment>
                ))}
                <div className="px-3 py-2 rounded-xl text-[12px] font-semibold"
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                  {PROCESS_INTERACTIONS[PROCESS_INTERACTIONS.length - 1].to}
                </div>
              </div>
            </div>

            {/* Qualytree 허브 - ISO 매핑 */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>Qualytree 허브 ↔ ISO 13485 조항 매핑</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {QUALYTREE_HUBS.map(h => (
                  <div key={h.path} className="flex items-center gap-2 p-2.5 rounded-xl"
                    style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>§{h.clause}</span>
                    <span className="text-[12px]" style={{ color: 'var(--ink)' }}>{h.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {editing && (
              <div className="mt-4">
                <FieldArea label="프로세스 상호작용 추가 설명 (선택)" value={D.processNotes} onChange={v => F('processNotes', v)} rows={3}
                  placeholder="지원 프로세스: 인적 자원, 인프라, 작업환경 관리가 제품 실현 프로세스를 지원합니다..." />
              </div>
            )}
            {!editing && manual.processNotes && (
              <div className="mt-4 p-4 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                <div className="text-[12.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>추가 설명</div>
                <p className="text-[13px] whitespace-pre-line" style={{ color: 'var(--ink)' }}>{manual.processNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* ── 배포 목록 탭 ── */}
        {tab === 'distribution' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>품질 매뉴얼 배포 사본 관리</div>
              {editing && (
                <button onClick={addDist} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
                  <Plus size={12} /> 배포처 추가
                </button>
              )}
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <table className="w-full text-[12.5px]">
                <thead><tr style={{ background: 'var(--bg-soft)' }}>
                  {editing
                    ? ['부서', '배포 대상자', '사본 번호', ''].map(h => <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>)
                    : ['부서', '배포 대상자', '사본 번호'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>)
                  }
                </tr></thead>
                <tbody>
                  {(editing ? D.distributionList : manual.distributionList || []).length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-10" style={{ color: 'var(--ink-faint)' }}>배포 목록이 없습니다.</td></tr>
                  ) : (editing ? D.distributionList : manual.distributionList || []).map((dist, i) => (
                    <tr key={dist.id} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                      {editing ? (
                        <>
                          <td className="px-3 py-2"><input value={dist.dept} onChange={e => updateDist(dist.id, 'dept', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} /></td>
                          <td className="px-3 py-2"><input value={dist.name} onChange={e => updateDist(dist.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} /></td>
                          <td className="px-3 py-2"><input value={dist.copyNo} onChange={e => updateDist(dist.id, 'copyNo', e.target.value)}
                            placeholder="No.1" className="w-20 px-2 py-1 rounded-lg text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} /></td>
                          <td className="px-3 py-2"><button onClick={() => removeDist(dist.id)} className="p-1.5 rounded-lg"
                            style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={11} style={{ color: '#DC2626' }} /></button></td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{dist.dept}</td>
                          <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }}>{dist.name}</td>
                          <td className="px-3 py-2 font-mono text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>{dist.copyNo}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 개정 이력 탭 ── */}
        {tab === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>품질 매뉴얼 개정 이력</div>
              {editing && (
                <button onClick={addRevision} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
                  <Plus size={12} /> 개정 추가
                </button>
              )}
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <table className="w-full text-[12.5px]">
                <thead><tr style={{ background: 'var(--bg-soft)' }}>
                  {['개정 번호', '개정일', '개정 내용', '작성자', editing ? '' : null].filter(Boolean).map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(editing ? D.revisionHistory : manual.revisionHistory || []).length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10" style={{ color: 'var(--ink-faint)' }}>개정 이력이 없습니다.</td></tr>
                  ) : (editing ? D.revisionHistory : manual.revisionHistory || []).map((r, i) => (
                    <tr key={r.id} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                      {editing ? (
                        <>
                          <td className="px-3 py-2 w-28"><input value={r.rev} onChange={e => updateRev(r.id, 'rev', e.target.value)}
                            placeholder="Rev.1" className="w-full px-2 py-1 rounded-lg text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} /></td>
                          <td className="px-3 py-2 w-36"><input type="date" value={r.date} onChange={e => updateRev(r.id, 'date', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} /></td>
                          <td className="px-3 py-2"><input value={r.description} onChange={e => updateRev(r.id, 'description', e.target.value)}
                            placeholder="개정 사유 및 내용" className="w-full px-2 py-1 rounded-lg text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} /></td>
                          <td className="px-3 py-2 w-24"><input value={r.by} onChange={e => updateRev(r.id, 'by', e.target.value)}
                            placeholder="작성자" className="w-full px-2 py-1 rounded-lg text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} /></td>
                          <td className="px-3 py-2"><button onClick={() => removeRev(r.id)} className="p-1.5 rounded-lg"
                            style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={11} style={{ color: '#DC2626' }} /></button></td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 font-bold" style={{ color: 'var(--moss)' }}>{r.rev}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{r.date}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--ink)' }}>{r.description}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{r.by}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

// ── 공통 ─────────────────────────────────────────────────────
function InfoSection({ title, children }) {
  return (
    <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>{title}</div>
      {children}
    </div>
  )
}
function InfoItem({ label, value }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
      <div className="text-[11px] font-bold mb-0.5" style={{ color: 'var(--ink-faint)' }}>{label}</div>
      <div className="text-[13px] font-semibold" style={{ color: value ? 'var(--ink)' : 'var(--ink-faint)' }}>{value || '미등록'}</div>
    </div>
  )
}
function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
function FieldArea({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
