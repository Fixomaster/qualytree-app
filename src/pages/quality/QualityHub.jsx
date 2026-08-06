import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Package,
  HelpCircle,
  FileWarning,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { ncr, NCR_STATUS, NCR_STATUS_LABEL, NCR_SEVERITY } from '../../lib/ncrState'
import { capa, CAPA_STATUS_LABEL } from '../../lib/capaState'
import { quarantine, QUARANTINE_STATUS, QUARANTINE_STATUS_LABEL } from '../../lib/quarantine'
import { permissions, requirePermission } from '../../lib/permissions'
import { mdrHandoff } from '../../lib/mdrHandoff'
import ValidationHub from '../validation/ValidationHub'
import { FlaskConical } from 'lucide-react'

export default function QualityHub() {
  const nav = useNavigate()
  const user = auth.current()

  const [searchParams] = useSearchParams()
  const KNOWN_TABS = ['ncr', 'quarantine', 'validation', 'mdr']
  const [tab, setTab] = useState(() => {
    const t = searchParams.get('tab')
    return KNOWN_TABS.includes(t) ? t : 'ncr'
  }) // ncr | quarantine | validation | mdr
  const [filter, setFilter] = useState('open') // open | all
  const [selectedNcrId, setSelectedNcrId] = useState(() => searchParams.get('ncrId') || null)
  const [selectedQId, setSelectedQId] = useState(() => searchParams.get('qId') || null)
  const [showHelp, setShowHelp] = useState(false)
  const [, setRefresh] = useState(0)
  const refresh = () => setRefresh((t) => t + 1)

  const allNcrs = ncr.loadAll()
  const allQuarantine = quarantine.loadAll()

  const filteredNcrs = useMemo(() => {
    let arr = [...allNcrs].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
    if (filter === 'open') {
      arr = arr.filter((n) => n.status !== NCR_STATUS.CLOSED)
    }
    return arr
  }, [allNcrs, filter])

  const mdrItems = mdrHandoff.loadAll()
  const mdrPending = mdrItems.filter((c) => !c.qualityReviewedAt).length

  const counts = {
    ncrOpen: ncr.getOpenCount(),
    quarantineActive: quarantine.getActiveCount(),
    mdrPending,
  }

  return (
    <AppLayout
      user={user}
      title="품질 · NCR / CAPA"
      subtitle="부적합 보고서 · 시정조치 · 격리 큐"
    >
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <span
              className="font-mono text-[10px] tracking-[0.18em] uppercase"
              style={{ color: 'var(--rust)' }}
            >
              QMS-001 · NONCONFORMANCE & CAPA HUB
            </span>
            <div
              className="font-display text-[26px] mt-1"
              style={{ color: 'var(--ink)', fontWeight: 500 }}
            >
              품질 통제
            </div>
            <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
              ISO 13485 §8.3 · §8.5.2 · §8.5.3 / 21 CFR 820.90 · 820.100
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid md:grid-cols-4 gap-3 mb-5">
          <StatCard
            icon={AlertTriangle}
            label="진행 중 NCR"
            value={counts.ncrOpen}
            tone="rust"
            onClick={() => setTab('ncr')}
            active={tab === 'ncr'}
          />
          <StatCard
            icon={Package}
            label="격리 중 항목"
            value={counts.quarantineActive}
            tone="moss"
            onClick={() => setTab('quarantine')}
            active={tab === 'quarantine'}
          />
          <StatCard
            icon={FlaskConical}
            label="밸리데이션 관리"
            value="IQ/OQ/PQ"
            tone="moss"
            onClick={() => setTab('validation')}
            active={tab === 'validation'}
          />
          <StatCard
            icon={FileWarning}
            label="이상사례보고(MDR) 품질검토 대기"
            value={counts.mdrPending}
            tone="rust"
            onClick={() => setTab('mdr')}
            active={tab === 'mdr'}
          />
        </div>
        <div className="mb-5 text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
          CAPA(시정·예방조치)는 <Link to="/improvement?tab=capa" className="underline" style={{ color: 'var(--moss)' }}>CAPA·개선</Link> 메뉴에서, 변경 이력(CCR)은 <Link to="/change-control" className="underline" style={{ color: 'var(--moss)' }}>변경 관리</Link> 메뉴에서, 설비·교정 현황은 <Link to="/equipment" className="underline" style={{ color: 'var(--moss)' }}>설비·교정</Link> 메뉴에서 확인하세요.
        </div>

        {/* 용어 안내 */}
        <div className="mb-5 rounded-lg border border-slate-200 bg-white">
          <button onClick={() => setShowHelp((v) => !v)} className="w-full flex items-center gap-2 px-4 py-2.5 text-left">
            <HelpCircle size={15} className="text-emerald-600" />
            <span className="text-[13px] font-medium text-slate-700">용어 안내 — NCR · CAPA가 무엇인가요?</span>
            <span className="ml-auto text-[12px] text-slate-400">{showHelp ? '닫기' : '열기'}</span>
          </button>
          {showHelp && (
            <div className="px-4 pb-3 grid sm:grid-cols-2 gap-2 text-[12.5px]">
              {[
                ['부적합 (NC)', '제품·공정·시스템이 정해진 기준(규격·절차)을 만족하지 못한 상태. "기준에서 벗어남".'],
                ['NCR (부적합 보고서)', '부적합이 발견됐을 때 무엇이·왜 벗어났는지 기록하고 처리(폐기·재작업·특채)를 결정하는 문서.'],
                ['CAPA (시정·예방 조치)', '부적합의 근본원인을 찾아 재발을 막고(시정), 비슷한 문제를 미리 막는(예방) 활동.'],
                ['격리 (Quarantine)', '부적합(의심) 제품을 정상품과 분리·보관해 잘못 사용·출고되지 않도록 막아두는 것.'],
              ].map(([t, d]) => (
                <div key={t} className="rounded-md bg-slate-50 border border-slate-100 p-2.5">
                  <div className="font-semibold text-slate-800">{t}</div>
                  <div className="text-slate-600 mt-0.5 leading-relaxed">{d}</div>
                </div>
              ))}
              <div className="sm:col-span-2 text-[11.5px] text-slate-400">절차서·품질매뉴얼을 작성하려면 좌측 메뉴의 <b>품질 문서</b>로 이동하세요.</div>
            </div>
          )}
        </div>

        <CreateForm tab={tab} onCreated={refresh} />

        {/* 탭별 콘텐츠 */}
        {tab === 'ncr' && (
          <NcrList
            ncrs={filteredNcrs}
            filter={filter}
            onChangeFilter={setFilter}
            selectedId={selectedNcrId}
            onSelect={setSelectedNcrId}
          />
        )}
        {tab === 'quarantine' && <QuarantineList items={allQuarantine} selectedId={selectedQId} onSelect={setSelectedQId} onChanged={refresh} />}
        {tab === 'validation' && <ValidationHub embedded role="quality" />}
        {tab === 'mdr' && <MdrHandoffList items={mdrItems} onChanged={refresh} />}
      </div>
    </AppLayout>
  )
}

/* ================================================================ */
function CreateForm({ tab, onCreated }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [sev, setSev] = useState(NCR_SEVERITY.MAJOR)
  if (tab !== 'ncr') return null
  const submit = () => {
    if (!title.trim()) return
    ncr.raise({ title: title.trim(), description: desc.trim(), severity: sev, source: { type: 'manual' } })
    setTitle(''); setDesc(''); setSev(NCR_SEVERITY.MAJOR); setOpen(false); onCreated && onCreated()
  }
  return (
    <div className="mb-4">
      <div className="text-[11.5px] mb-2" style={{ color: 'var(--ink-faint)' }}>
        대부분의 NCR은 생산(eBR)에서 부적합 측정값으로 서명할 때 자동으로 발의되어 아래 목록에 나타납니다. 생산 공정과 무관하게 발견된 부적합(예: 감사·고객불만 등)만 아래에서 수동으로 등록하세요.
      </div>
      {!open ? (
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--line)', color: 'var(--ink-mute)' }}>
          + 수동으로 NCR 작성
        </button>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-3 grid gap-2 max-w-2xl">
          <div className="text-[13px] font-semibold text-slate-800">새 부적합 보고서(NCR) 작성</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목 (예: 멸균 공정 온도 이탈)" className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none focus:border-emerald-500" />
          <select value={sev} onChange={(e) => setSev(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-emerald-500">
            <option value={NCR_SEVERITY.CRITICAL}>심각도: Critical (중대)</option>
            <option value={NCR_SEVERITY.MAJOR}>심각도: Major (주요)</option>
            <option value={NCR_SEVERITY.MINOR}>심각도: Minor (경미)</option>
          </select>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="무엇이 / 어디서 / 왜 기준을 벗어났는지 기술 (ISO 13485 §8.3)" className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] leading-relaxed resize-y focus:outline-none focus:border-emerald-500" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setOpen(false); setTitle(''); setDesc('') }} className="text-[12.5px] px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">취소</button>
            <button onClick={submit} disabled={!title.trim()} className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">발의</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================ */
function StatCard({ icon: Icon, label, value, tone, onClick, active }) {
  const colors = {
    rust: { bg: 'var(--rust-soft)', fg: 'var(--rust)' },
    amber: { bg: 'var(--amber-soft)', fg: 'var(--amber)' },
    moss: { bg: 'var(--leaf-soft)', fg: 'var(--moss)' },
  }
  const c = colors[tone] || colors.moss
  return (
    <button
      onClick={onClick}
      className="card-base p-4 text-left transition"
      style={{
        borderColor: active ? c.fg : 'var(--line)',
        borderWidth: active ? 2 : 1,
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: c.bg }}
        >
          <Icon size={17} style={{ color: c.fg }} strokeWidth={1.7} />
        </div>
        <div
          className="font-display text-[28px]"
          style={{ color: c.fg, fontWeight: 500 }}
        >
          {value}
        </div>
      </div>
      <div
        className="mt-2 text-[12.5px]"
        style={{ color: 'var(--ink-mute)' }}
      >
        {label}
      </div>
    </button>
  )
}

/* ================================================================
   NCR 목록 + 상세 분할 패널
   ================================================================ */
function NcrList({ ncrs, filter, onChangeFilter, selectedId, onSelect }) {
  const selected = selectedId ? ncrs.find((n) => n.id === selectedId) : null

  return (
    <div className="grid lg:grid-cols-12 gap-4">
      {/* 좌: 목록 */}
      <div className="lg:col-span-5">
        <div className="card-base p-3">
          <div className="flex items-center justify-between mb-2 px-2">
            <div
              className="font-mono text-[10px] tracking-[0.16em] uppercase"
              style={{ color: 'var(--ink-mute)' }}
            >
              NCRs · {ncrs.length}건
            </div>
            <div className="flex gap-0.5">
              <FilterChip
                active={filter === 'open'}
                onClick={() => onChangeFilter('open')}
              >
                진행 중
              </FilterChip>
              <FilterChip
                active={filter === 'all'}
                onClick={() => onChangeFilter('all')}
              >
                전체
              </FilterChip>
            </div>
          </div>

          {ncrs.length === 0 ? (
            <div
              className="text-center py-10 text-[13px]"
              style={{ color: 'var(--ink-mute)' }}
            >
              {filter === 'open'
                ? '진행 중인 NCR이 없습니다.'
                : '발의된 NCR이 없습니다.'}
              <div
                className="text-[11.5px] mt-1"
                style={{ color: 'var(--ink-faint)' }}
              >
                eBR에서 부적합 측정값으로 서명하면 자동 발의됩니다.
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
              {ncrs.map((n) => (
                <NcrRow
                  key={n.id}
                  ncr={n}
                  selected={n.id === selectedId}
                  onClick={() => onSelect(n.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 우: 상세 */}
      <div className="lg:col-span-7">
        {selected ? (
          <NcrDetail ncrRecord={selected} />
        ) : (
          <div
            className="card-base p-10 text-center text-[13px]"
            style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}
          >
            좌측에서 NCR을 선택하세요
          </div>
        )}
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="text-[11.5px] px-2 py-1 rounded-md transition"
      style={{
        background: active ? 'var(--moss)' : 'transparent',
        color: active ? 'var(--bg)' : 'var(--ink-mute)',
      }}
    >
      {children}
    </button>
  )
}

function NcrRow({ ncr: n, selected, onClick }) {
  const status = NCR_STATUS_LABEL[n.status]
  const sevColor = {
    Critical: 'var(--rust)',
    Major: 'var(--amber)',
    Minor: 'var(--ink-mute)',
  }[n.severity]

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg p-3 transition"
      style={{
        background: selected ? 'var(--rust-soft)' : 'var(--bg-soft)',
        borderLeft: `3px solid ${sevColor}`,
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="font-mono text-[11px]"
          style={{ color: 'var(--ink)', fontWeight: 500 }}
        >
          {n.id}
        </span>
        <span
          className="font-mono text-[9.5px] tracking-wider px-1.5 py-0.5 rounded uppercase"
          style={{
            background: sevColor,
            color: 'var(--bg)',
            fontWeight: 500,
          }}
        >
          {n.severity}
        </span>
        <span
          className="font-mono text-[9.5px] tracking-wider px-1.5 py-0.5 rounded uppercase ml-auto"
          style={{
            background: `var(--${status.tone}-soft)`,
            color: `var(--${status.tone})`,
          }}
        >
          {status.ko}
        </span>
      </div>
      <div
        className="text-[13px] mt-1.5 line-clamp-2"
        style={{ color: 'var(--ink)' }}
      >
        {n.title}
      </div>
      <div
        className="font-mono text-[10.5px] mt-1 flex items-center gap-2"
        style={{ color: 'var(--ink-faint)' }}
      >
        <Clock size={10} />
        {new Date(n.detectedAt).toLocaleString('ko-KR')}
        {n.impact && (
          <span style={{ color: 'var(--rust)' }}>
            · 영향 {n.impact.affectedQuantity}개
          </span>
        )}
      </div>
    </button>
  )
}

/* ================================================================
   NCR 상세
   ================================================================ */
function NcrDetail({ ncrRecord }) {
  const [updating, setUpdating] = useState(false)
  const status = NCR_STATUS_LABEL[ncrRecord.status]
  const quarantineItems = quarantine.forNcr(ncrRecord.id)
  const linkedCapas = capa.forNcr(ncrRecord.id)

  const canTransition = permissions.can('qms.capa.approve') // 매니저만 상태 전환

  const handleStatusChange = (newStatus) => {
    if (!canTransition) {
      alert('상태 전환은 매니저(Level 3) 권한이 필요합니다.')
      return
    }
    const reason = prompt(`상태 변경 사유 (CCR — ISO 13485 §4.2.4):`, '')
    if (reason == null) return
    if (!reason.trim()) {
      alert('변경 사유 필수')
      return
    }
    setUpdating(true)
    ncr.updateStatus(ncrRecord.id, newStatus, { reason: reason.trim() })
    setTimeout(() => {
      setUpdating(false)
      window.location.reload()
    }, 200)
  }

  const handleIsolate = () => {
    if (!canTransition) {
      alert('격리 등록은 매니저(Level 3) 권한이 필요합니다.')
      return
    }
    if (!ncrRecord.impact?.affectedWOs?.length) {
      alert('격리할 대상 작업 지시가 없습니다.')
      return
    }
    if (
      !confirm(
        `위험 구간 ${ncrRecord.impact.affectedWOs.length}건의 작업 지시 (총 ${ncrRecord.impact.affectedQuantity}개 제품)를 격리 큐에 등록할까요?\n\n적용 표준: ISO 13485 §8.3, 21 CFR 820.90(a)`
      )
    )
      return

    quarantine.isolateFromNcr(ncrRecord)
    ncr.updateStatus(ncrRecord.id, NCR_STATUS.CONTAINED, {
      reason: '위험 구간 격리 큐 자동 등록',
      containment: {
        quarantineCount: ncrRecord.impact.affectedWOs.length,
      },
    })
    setTimeout(() => window.location.reload(), 200)
  }

  return (
    <div className="card-base p-5 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <span
            className="font-mono text-[10px] tracking-[0.18em] uppercase"
            style={{ color: 'var(--rust)' }}
          >
            {ncrRecord.id} · {ncrRecord.severity}
          </span>
          <div
            className="font-display text-[20px] mt-1 leading-tight"
            style={{ color: 'var(--ink)', fontWeight: 500 }}
          >
            {ncrRecord.title}
          </div>
        </div>
        <span
          className="tag"
          style={{
            background: `var(--${status.tone}-soft)`,
            color: `var(--${status.tone})`,
            fontWeight: 500,
          }}
        >
          {status.ko}
        </span>
      </div>

      <div
        className="text-[13px] leading-relaxed mt-2"
        style={{ color: 'var(--ink-mute)' }}
      >
        {ncrRecord.description || '(설명 없음)'}
      </div>

      {/* 발의 정보 */}
      <div
        className="mt-4 pt-3 grid grid-cols-2 gap-3"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <Meta label="발의자" value={ncrRecord.detectedBy} />
        <Meta
          label="발의 시각"
          value={new Date(ncrRecord.detectedAt).toLocaleString('ko-KR')}
          mono
        />
        <Meta
          label="발의 출처"
          value={
            ncrRecord.source?.type === 'oos'
              ? `OOS — ${ncrRecord.source.woId}`
              : ncrRecord.source?.type || '-'
          }
        />
        <Meta
          label="원인 측정값"
          value={
            ncrRecord.source?.measurementValue !== undefined
              ? `${ncrRecord.source.measurementValue}`
              : '-'
          }
          mono
        />
      </div>

      {/* 위험 구간 영향 분석 */}
      {ncrRecord.impact && (
        <div
          className="mt-4 rounded-lg p-3"
          style={{
            background: 'var(--rust-soft)',
            border: '1px solid var(--rust)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} style={{ color: 'var(--rust)' }} />
            <span
              className="font-mono text-[10.5px] tracking-[0.16em] uppercase"
              style={{ color: 'var(--rust)', fontWeight: 600 }}
            >
              SUSPECT PERIOD · 위험 구간 자동 추적 (§14.3)
            </span>
          </div>
          <div className="text-[12.5px]" style={{ color: 'var(--rust)' }}>
            <div className="mb-1">
              <strong>마지막 OK 검사</strong>:{' '}
              {ncrRecord.impact.lastOkSignature
                ? `${ncrRecord.impact.lastOkSignature.by} · ${new Date(
                    ncrRecord.impact.lastOkSignature.signedAt
                  ).toLocaleString('ko-KR')} (${ncrRecord.impact.lastOkSignature.woId})`
                : '없음 — 첫 검사부터 부적합'}
            </div>
            <div>
              <strong>영향 범위</strong>: 작업 지시 {ncrRecord.impact.affectedWOs?.length || 0}건
              · 제품 <strong>{ncrRecord.impact.affectedQuantity}개</strong>
            </div>
            {ncrRecord.impact.affectedWOs?.length > 0 && (
              <ul className="mt-2 ml-3 space-y-0.5 text-[11.5px]">
                {ncrRecord.impact.affectedWOs.slice(0, 5).map((w) => (
                  <li key={w.woId}>
                    • {w.woId} ({w.productName} · 로트 {w.lotNumber} · {w.quantity}개)
                  </li>
                ))}
                {ncrRecord.impact.affectedWOs.length > 5 && (
                  <li className="opacity-70">
                    … 외 {ncrRecord.impact.affectedWOs.length - 5}건
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 격리 큐 */}
      {quarantineItems.length > 0 && (
        <div className="mt-4">
          <div
            className="font-mono text-[10px] tracking-[0.16em] uppercase mb-2"
            style={{ color: 'var(--moss)' }}
          >
            QUARANTINE · 격리 큐 ({quarantineItems.length}건)
          </div>
          <div className="space-y-1.5">
            {quarantineItems.map((q) => (
              <div
                key={q.id}
                className="rounded-lg p-2.5 flex items-center justify-between gap-2"
                style={{ background: 'var(--bg-soft)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                    <strong>{q.id}</strong> · {q.woId} · {q.productName} ·{' '}
                    {q.quantity}개
                  </div>
                  <div
                    className="font-mono text-[10.5px] mt-0.5"
                    style={{ color: 'var(--ink-mute)' }}
                  >
                    격리: {new Date(q.isolatedAt).toLocaleString('ko-KR')}
                  </div>
                </div>
                <span
                  className="tag"
                  style={{
                    background: `var(--${QUARANTINE_STATUS_LABEL[q.status].tone}-soft)`,
                    color: `var(--${QUARANTINE_STATUS_LABEL[q.status].tone})`,
                  }}
                >
                  {QUARANTINE_STATUS_LABEL[q.status].ko}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 조사보고서 */}
      <NcrInvestigationReport ncrRecord={ncrRecord} />

      {/* CAPA 연결 */}
      {linkedCapas.length > 0 && (
        <div className="mt-4">
          <div
            className="font-mono text-[10px] tracking-[0.16em] uppercase mb-2"
            style={{ color: 'var(--moss)' }}
          >
            LINKED CAPA · 연결된 CAPA
          </div>
          {linkedCapas.map((c) => (
            <div
              key={c.id}
              className="rounded-lg p-2.5 flex items-center justify-between"
              style={{ background: 'var(--leaf-soft)' }}
            >
              <div>
                <span
                  className="font-mono text-[11.5px]"
                  style={{ color: 'var(--moss)', fontWeight: 500 }}
                >
                  {c.id}
                </span>
                <span className="text-[12.5px] ml-2" style={{ color: 'var(--ink)' }}>
                  {c.title}
                </span>
              </div>
              <span
                className="tag"
                style={{
                  background: `var(--${CAPA_STATUS_LABEL[c.status].tone}-soft)`,
                  color: `var(--${CAPA_STATUS_LABEL[c.status].tone})`,
                }}
              >
                {CAPA_STATUS_LABEL[c.status].ko}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 액션 버튼 */}
      {canTransition && ncrRecord.status !== NCR_STATUS.CLOSED && (
        <div
          className="mt-5 pt-4 flex flex-wrap gap-2"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          {ncrRecord.status === NCR_STATUS.OPEN && (
            <>
              <button
                onClick={() => handleStatusChange(NCR_STATUS.INVESTIGATING)}
                className="btn-ghost"
                disabled={updating}
              >
                조사 시작
              </button>
              {ncrRecord.impact?.affectedWOs?.length > 0 && (
                <button
                  onClick={handleIsolate}
                  className="btn-primary"
                  style={{ background: 'var(--rust)' }}
                  disabled={updating}
                >
                  <Package size={13} /> 위험 구간 격리 ({ncrRecord.impact.affectedQuantity}개)
                </button>
              )}
            </>
          )}
          {ncrRecord.status !== NCR_STATUS.CLOSED && (
            <button
              onClick={() => handleStatusChange(NCR_STATUS.CLOSED)}
              className="btn-ghost"
              style={{ marginLeft: 'auto' }}
              disabled={updating}
            >
              <CheckCircle2 size={13} /> 종결
            </button>
          )}
        </div>
      )}

      {/* 규제 매핑 */}
      <div
        className="mt-4 pt-3"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <div
          className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1.5"
          style={{ color: 'var(--ink-faint)' }}
        >
          REGULATORY MAPPING
        </div>
        <div className="flex flex-wrap gap-1">
          {[
            'ISO 13485 §8.3',
            '21 CFR 820.90',
            'ISO 14971 §5',
            'Part 11 §11.10(e)',
          ].map((c, i) => (
            <span
              key={i}
              className="font-mono text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Meta({ label, value, mono }) {
  return (
    <div>
      <div
        className="font-mono text-[10px] tracking-[0.16em] uppercase"
        style={{ color: 'var(--ink-faint)' }}
      >
        {label}
      </div>
      <div
        className={`mt-0.5 text-[12.5px] truncate ${mono ? 'font-mono text-[11.5px]' : ''}`}
        style={{ color: 'var(--ink)' }}
      >
        {value}
      </div>
    </div>
  )
}

/* ================================================================
   CAPA 목록
   ================================================================ */
function NcrInvestigationReport({ ncrRecord }) {
  const canEdit = permissions.can('qms.ncr.investigate')
  const existing = ncrRecord.investigationReport
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => existing || { investigator: '', investigatedAt: '', content: '', rootCauseSummary: '', conclusion: '' })
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = () => {
    if (!requirePermission('qms.ncr.investigate')) return
    if (!form.content.trim()) { alert('조사 내용을 입력하세요.'); return }
    ncr.setInvestigationReport(ncrRecord.id, form)
    setTimeout(() => window.location.reload(), 150)
  }

  return (
    <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--moss)' }}>
          조사보고서 (INVESTIGATION REPORT)
        </div>
        {!editing && canEdit && (
          <button onClick={() => setEditing(true)} className="text-[11.5px]" style={{ color: 'var(--moss)' }}>{existing ? '수정' : '작성'}</button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <FieldQ label="조사자" value={form.investigator} onChange={(v) => setF('investigator', v)} placeholder="조사 담당자명" />
            <FieldQ label="조사일" type="date" value={form.investigatedAt} onChange={(v) => setF('investigatedAt', v)} />
          </div>
          <TextAreaFieldQ label="조사 내용 (경위·조사방법·발견사항)" value={form.content} onChange={(v) => setF('content', v)} />
          <TextAreaFieldQ label="근본원인 요약" value={form.rootCauseSummary} onChange={(v) => setF('rootCauseSummary', v)} />
          <TextAreaFieldQ label="결론" value={form.conclusion} onChange={(v) => setF('conclusion', v)} />
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary text-[12.5px]" style={{ padding: '0.5rem 1rem' }}>저장</button>
            {existing && <button onClick={() => { setEditing(false); setForm(existing) }} className="btn-ghost text-[12.5px]">취소</button>}
          </div>
        </div>
      ) : existing ? (
        <div className="text-[12.5px] space-y-1.5">
          <div><span style={{ color: 'var(--ink-mute)' }}>조사자: </span>{existing.investigator || '-'} <span style={{ color: 'var(--ink-faint)' }}>({existing.investigatedAt || '조사일 미기록'})</span></div>
          <div className="leading-relaxed" style={{ color: 'var(--ink)' }}>{existing.content}</div>
          {existing.rootCauseSummary && <div className="mt-1"><span style={{ color: 'var(--ink-mute)' }}>근본원인: </span>{existing.rootCauseSummary}</div>}
          {existing.conclusion && <div className="mt-1"><span style={{ color: 'var(--ink-mute)' }}>결론: </span>{existing.conclusion}</div>}
          <div className="font-mono text-[10.5px] mt-2" style={{ color: 'var(--ink-faint)' }}>{existing.recordedBy} · {new Date(existing.recordedAt).toLocaleString('ko-KR')}</div>
        </div>
      ) : (
        <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>아직 작성된 조사보고서가 없습니다.</div>
      )}
    </div>
  )
}

/* ================================================================
   격리 큐 목록
   ================================================================ */
function QuarantineList({ items, selectedId, onSelect, onChanged }) {
  if (items.length === 0) {
    return (
      <div
        className="card-base p-10 text-center text-[13px]"
        style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}
      >
        <Package
          size={28}
          style={{ color: 'var(--ink-faint)', margin: '0 auto' }}
          strokeWidth={1.4}
        />
        <div className="mt-3">격리된 항목이 없습니다.</div>
        <div className="mt-1 text-[11.5px] leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--ink-faint)' }}>
          자동으로 채워지지 않습니다 — NCR 상세 화면에서 위험 구간(영향받은 작업 지시)이 있는 <b>OPEN 상태</b>의 NCR을 열고 <b>"위험 구간 격리"</b> 버튼을 눌러야 등록됩니다. 이 버튼은 매니저(Level 3) 권한 사용자에게만 보입니다.
        </div>
      </div>
    )
  }

  const sel = items.find((q) => q.id === selectedId) || null

  return (
    <div className="grid md:grid-cols-5 gap-3">
      <div className="md:col-span-2 space-y-2">
        {items.map((q) => {
          const s = QUARANTINE_STATUS_LABEL[q.status]
          const active = q.id === selectedId
          return (
            <button
              key={q.id}
              onClick={() => onSelect(q.id)}
              className="card-base p-3.5 w-full text-left block"
              style={active ? { borderColor: 'var(--moss)', background: 'var(--leaf-soft)' } : undefined}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11.5px]" style={{ color: 'var(--moss)', fontWeight: 500 }}>{q.id}</span>
                <span style={{ color: 'var(--ink)' }}>{q.productName} · 로트 {q.lotNumber}</span>
              </div>
              <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>{q.reason}</div>
              <span className="tag mt-1.5 inline-block" style={{ background: `var(--${s.tone}-soft)`, color: `var(--${s.tone})` }}>{s.ko}</span>
            </button>
          )
        })}
      </div>
      <div className="md:col-span-3">
        {sel ? <QuarantineDetail item={sel} onChanged={onChanged} /> : (
          <div className="card-base p-10 text-center text-[13px]" style={{ color: 'var(--ink-mute)' }}>왼쪽에서 격리 항목을 선택하세요.</div>
        )}
      </div>
    </div>
  )
}

const QUARANTINE_DISPOSITION_OPTIONS = [
  { value: QUARANTINE_STATUS.REINSPECTING, label: '재검사 진행', permission: 'qms.quarantine.dispose' },
  { value: QUARANTINE_STATUS.REWORK, label: '재작업 (매니저 승인 필요)', permission: 'qms.quarantine.reworkApprove' },
  { value: QUARANTINE_STATUS.USE_AS_IS, label: '특채 (Use-as-is)', permission: 'qms.quarantine.dispose' },
  { value: QUARANTINE_STATUS.SCRAPPED, label: '폐기', permission: 'qms.quarantine.dispose' },
  { value: QUARANTINE_STATUS.RELEASED, label: '출하 가능 (재검사 합격)', permission: 'qms.quarantine.dispose' },
]

function QuarantineDetail({ item, onChanged }) {
  const s = QUARANTINE_STATUS_LABEL[item.status]
  const [busy, setBusy] = useState(false)

  const handleDispose = (opt) => {
    if (!requirePermission(opt.permission)) return
    const note = prompt(`처분 사유 (${opt.label}):`, '')
    if (note == null) return
    if (!note.trim()) { alert('처분 사유는 필수입니다.'); return }
    setBusy(true)
    quarantine.setDisposition(item.id, opt.value, { note: note.trim(), reason: `${opt.label} — ${note.trim()}` })
    setTimeout(() => { setBusy(false); onChanged && onChanged() }, 150)
  }

  return (
    <div className="card-base p-5 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>{item.id}</span>
          <div className="font-display text-[18px] mt-1 leading-tight" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            {item.productName} · 로트 {item.lotNumber}
          </div>
        </div>
        <span className="tag" style={{ background: `var(--${s.tone}-soft)`, color: `var(--${s.tone})`, fontWeight: 500 }}>{s.ko}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Meta label="수량" value={`${item.quantity}개`} />
        <Meta label="출처 NCR" value={item.sourceNcrId} mono />
        <Meta label="격리 사유" value={item.reason} />
        <Meta label="격리 등록" value={`${new Date(item.isolatedAt).toLocaleString('ko-KR')} · ${item.isolatedBy}`} />
      </div>

      {item.dispositionBy && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-2" style={{ color: 'var(--moss)' }}>처분 결과</div>
          <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{item.disposition}</div>
          <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-mute)' }}>
            {new Date(item.dispositionAt).toLocaleString('ko-KR')} · {item.dispositionBy}
          </div>
          {item.status === QUARANTINE_STATUS.REWORK && item.reworkApprovedBy && (
            <div className="mt-2 rounded-lg p-2.5" style={{ background: 'var(--amber-soft)' }}>
              <div className="text-[11.5px] font-semibold" style={{ color: 'var(--amber)' }}>재작업 승인 (매니저)</div>
              <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink)' }}>
                {item.reworkApprovedBy} · {new Date(item.reworkApprovedAt).toLocaleString('ko-KR')}
              </div>
            </div>
          )}
        </div>
      )}

      {item.status === QUARANTINE_STATUS.ISOLATED && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-2" style={{ color: 'var(--moss)' }}>처분 결정</div>
          <div className="text-[11.5px] mb-2" style={{ color: 'var(--ink-mute)' }}>
            ISO 13485 §8.3 / 21 CFR 820.90(b) — 격리 제품의 처분을 결정하고 사유를 기록합니다. '재작업'은 매니저(Level 3) 승인이 필요합니다.
          </div>
          <div className="flex flex-wrap gap-2">
            {QUARANTINE_DISPOSITION_OPTIONS.map((opt) => (
              <button key={opt.value} disabled={busy} onClick={() => handleDispose(opt)} className="btn-ghost text-[12px]">
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================
   이상사례보고(MDR) 품질부서 핸드오프 — #13
   고객불만(ComplaintHub)에서 MDR 대상으로 표시된 항목을 품질검사 도메인에서
   직접 조회·검토하고 MFDS 보고일을 기록한 뒤 "품질 검토 완료"로 종결 처리한다.
   ================================================================ */
function MdrHandoffList({ items, onChanged }) {
  const [expandedId, setExpandedId] = useState(null)

  if (items.length === 0) {
    return (
      <div className="card-base p-10 text-center text-[13px]" style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}>
        <FileWarning size={28} style={{ color: 'var(--ink-faint)', margin: '0 auto' }} strokeWidth={1.4} />
        <div className="mt-3">이상사례(MDR) 보고 대상으로 표시된 고객불만이 없습니다.</div>
        <div className="mt-1 text-[11.5px] leading-relaxed max-w-md mx-auto" style={{ color: 'var(--ink-faint)' }}>
          수주고객 도메인의 <b>고객불만 관리</b>에서 불만 등록 시 "규제 보고 필요(MDR)"로 표시하면 이 목록에 자동으로 나타납니다.
        </div>
      </div>
    )
  }

  const pending = items.filter((i) => !i.qualityReviewedAt)
  const reviewed = items.filter((i) => i.qualityReviewedAt)

  return (
    <div className="space-y-5">
      <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
        고객불만 등록(영업/수주고객)과 이상사례 검토·MFDS 보고(품질검사)는 서로 다른 담당자가 처리합니다 — 원본 불만 내용은
        <Link to="/complaints?tab=mdr" className="underline mx-1" style={{ color: 'var(--moss)' }}>고객불만 관리</Link>
        에서도 동일하게 확인·수정할 수 있습니다.
      </div>

      <div>
        <div className="text-[12.5px] font-bold mb-2 flex items-center gap-1.5" style={{ color: '#DC2626' }}>
          <AlertTriangle size={13} /> 품질 검토 대기 ({pending.length}건)
        </div>
        {pending.length === 0 ? (
          <div className="text-[12.5px] px-3 py-4 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>대기 중인 항목이 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {pending.map((item) => (
              <MdrHandoffRow key={item.id} item={item} expanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)} onChanged={onChanged} />
            ))}
          </div>
        )}
      </div>

      {reviewed.length > 0 && (
        <div>
          <div className="text-[12.5px] font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--moss)' }}>
            <CheckCircle2 size={13} /> 품질 검토 완료 ({reviewed.length}건)
          </div>
          <div className="space-y-2">
            {reviewed.map((item) => (
              <MdrHandoffRow key={item.id} item={item} expanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)} onChanged={onChanged} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MdrHandoffRow({ item, expanded, onToggle, onChanged }) {
  const user = auth.current()
  const [note, setNote] = useState(item.qualityReviewNote || '')
  const [reportDate, setReportDate] = useState(item.mdrReportDate || '')
  const reviewed = !!item.qualityReviewedAt

  const save = () => {
    if (!requirePermission('qms.quarantine.dispose')) return
    mdrHandoff.updateReview(item.id, { qualityReviewNote: note, mdrReportDate: reportDate })
    onChanged && onChanged()
  }
  const toggleReviewed = () => {
    if (!requirePermission('qms.quarantine.dispose')) return
    if (reviewed) mdrHandoff.clearReviewed(item.id)
    else mdrHandoff.markReviewed(item.id, (user && (user.name || user.email)) || '')
    onChanged && onChanged()
  }

  return (
    <div className="card-base p-3.5" style={reviewed ? undefined : { borderColor: '#FCA5A5' }}>
      <div className="flex items-center gap-2 flex-wrap cursor-pointer" onClick={onToggle}>
        <span className="font-mono text-[11.5px]" style={{ color: 'var(--moss)', fontWeight: 500 }}>{item.id}</span>
        <span style={{ color: 'var(--ink)' }}>{item.customerName}</span>
        {item.productName && <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>· {item.productName}</span>}
        <span className="tag" style={{ background: item.mdrReportDate ? 'var(--leaf-soft)' : '#FEE2E2', color: item.mdrReportDate ? 'var(--moss)' : '#DC2626' }}>
          {item.mdrReportDate ? `MFDS 보고 완료 (${item.mdrReportDate})` : 'MFDS 보고 미완료'}
        </span>
        {reviewed && <span className="tag" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>품질 검토 완료</span>}
        <span className="ml-auto">{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid var(--line)' }} onClick={(e) => e.stopPropagation()}>
          <div className="grid sm:grid-cols-2 gap-3 text-[12.5px]">
            <div><span style={{ color: 'var(--ink-faint)' }}>접수일: </span>{item.receivedDate || '—'}</div>
            <div><span style={{ color: 'var(--ink-faint)' }}>심각도: </span>{item.severity || '—'}</div>
          </div>
          {(item.investigation || item.rootCause || item.corrective) && (
            <div className="space-y-1.5 text-[12.5px]">
              {item.investigation && <div><span style={{ color: 'var(--ink-faint)' }}>조사 결과: </span>{item.investigation}</div>}
              {item.rootCause && <div><span style={{ color: 'var(--ink-faint)' }}>근본 원인: </span>{item.rootCause}</div>}
              {item.corrective && <div><span style={{ color: 'var(--ink-faint)' }}>시정 조치: </span>{item.corrective}</div>}
            </div>
          )}
          {!(item.investigation || item.rootCause || item.corrective) && (
            <div className="text-[12px] px-2.5 py-1.5 rounded-lg" style={{ background: '#FEF3C7', color: '#92400E' }}>
              아직 조사 결과가 입력되지 않았습니다 — 고객불만 관리 화면에서 조사 내용을 먼저 작성하세요.
            </div>
          )}

          <div>
            <label className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>MFDS 보고일</label>
            <input type="date" className="input-base text-[12.5px]" style={{ maxWidth: 200 }} value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>품질부서 검토 메모</label>
            <textarea className="input-base text-[12.5px]" style={{ minHeight: 60 }} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="품질부서 관점의 위해성 평가, 재발방지 조치 연계(CAPA 등) 등을 기록하세요." />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={save} className="btn-primary text-[12px]" style={{ padding: '0.4rem 0.9rem' }}>저장</button>
            <button onClick={toggleReviewed} className="text-[12px] px-3 py-1.5 rounded-lg" style={{
              background: reviewed ? 'var(--bg-soft)' : 'var(--leaf-soft)', color: reviewed ? 'var(--ink-mute)' : 'var(--moss)', border: 'none', cursor: 'pointer', fontWeight: 600,
            }}>
              {reviewed ? '검토 완료 취소' : '품질 검토 완료로 표시'}
            </button>
            {reviewed && <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{item.qualityReviewedBy} · {item.qualityReviewedAt}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
