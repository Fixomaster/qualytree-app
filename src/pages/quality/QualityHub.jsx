import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Workflow,
  Plus,
  Filter,
  Package,
  ChevronRight,
  XCircle,
  HelpCircle,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { ncr, NCR_STATUS, NCR_STATUS_LABEL, NCR_SEVERITY } from '../../lib/ncrState'
import { capa, CAPA_STATUS_LABEL } from '../../lib/capaState'
import { quarantine, QUARANTINE_STATUS_LABEL } from '../../lib/quarantine'
import { permissions } from '../../lib/permissions'

export default function QualityHub() {
  const nav = useNavigate()
  const user = auth.current()

  const [tab, setTab] = useState('ncr') // ncr | capa | quarantine
  const [filter, setFilter] = useState('open') // open | all
  const [selectedNcrId, setSelectedNcrId] = useState(null)
  const [showHelp, setShowHelp] = useState(false)

  const allNcrs = ncr.loadAll()
  const allCapas = capa.loadAll()
  const allQuarantine = quarantine.loadAll()

  const filteredNcrs = useMemo(() => {
    let arr = [...allNcrs].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
    if (filter === 'open') {
      arr = arr.filter((n) => n.status !== NCR_STATUS.CLOSED)
    }
    return arr
  }, [allNcrs, filter])

  const counts = {
    ncrOpen: ncr.getOpenCount(),
    capaOpen: capa.getOpenCount(),
    quarantineActive: quarantine.getActiveCount(),
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
        <div className="grid md:grid-cols-3 gap-3 mb-5">
          <StatCard
            icon={AlertTriangle}
            label="진행 중 NCR"
            value={counts.ncrOpen}
            tone="rust"
            onClick={() => setTab('ncr')}
            active={tab === 'ncr'}
          />
          <StatCard
            icon={ShieldCheck}
            label="진행 중 CAPA"
            value={counts.capaOpen}
            tone="amber"
            onClick={() => setTab('capa')}
            active={tab === 'capa'}
          />
          <StatCard
            icon={Package}
            label="격리 중 항목"
            value={counts.quarantineActive}
            tone="moss"
            onClick={() => setTab('quarantine')}
            active={tab === 'quarantine'}
          />
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
        {tab === 'capa' && <CapaList capas={allCapas} />}
        {tab === 'quarantine' && <QuarantineList items={allQuarantine} />}
      </div>
    </AppLayout>
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
function CapaList({ capas }) {
  if (capas.length === 0) {
    return (
      <div
        className="card-base p-10 text-center text-[13px]"
        style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}
      >
        <ShieldCheck
          size={28}
          style={{ color: 'var(--ink-faint)', margin: '0 auto' }}
          strokeWidth={1.4}
        />
        <div className="mt-3">발의된 CAPA가 없습니다.</div>
        <div className="mt-1 text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
          Critical NCR 발의 시 또는 같은 항목 Major NCR 3건 누적 시 자동 후보로 등록됩니다.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {capas.map((c) => {
        const status = CAPA_STATUS_LABEL[c.status]
        return (
          <div key={c.id} className="card-base p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span
                  className="font-mono text-[11.5px]"
                  style={{ color: 'var(--moss)', fontWeight: 500 }}
                >
                  {c.id}
                </span>
                <span
                  className="text-[14px] ml-2"
                  style={{ color: 'var(--ink)', fontWeight: 500 }}
                >
                  {c.title}
                </span>
              </div>
              <span
                className="tag"
                style={{
                  background: `var(--${status.tone}-soft)`,
                  color: `var(--${status.tone})`,
                }}
              >
                {status.ko}
              </span>
            </div>
            <div
              className="text-[12.5px] mt-1.5"
              style={{ color: 'var(--ink-mute)' }}
            >
              {c.description || c.triggerReason || '(설명 없음)'}
            </div>
            <div
              className="font-mono text-[10.5px] mt-2 flex flex-wrap gap-3"
              style={{ color: 'var(--ink-faint)' }}
            >
              <span>발의: {new Date(c.raisedAt).toLocaleString('ko-KR')}</span>
              <span>· {c.raisedBy}</span>
              {c.sourceNcrIds?.length > 0 && (
                <span>· NCR {c.sourceNcrIds.length}건 연결</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ================================================================
   격리 큐 목록
   ================================================================ */
function QuarantineList({ items }) {
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
        <div className="mt-1 text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
          NCR 발의 → "위험 구간 격리" 액션으로 자동 등록됩니다.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((q) => {
        const s = QUARANTINE_STATUS_LABEL[q.status]
        return (
          <div
            key={q.id}
            className="card-base p-4 flex items-center justify-between flex-wrap gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="font-mono text-[11.5px]"
                  style={{ color: 'var(--moss)', fontWeight: 500 }}
                >
                  {q.id}
                </span>
                <span style={{ color: 'var(--ink)' }}>
                  {q.productName} · 로트 {q.lotNumber}
                </span>
                <span
                  className="font-mono text-[10.5px]"
                  style={{ color: 'var(--ink-faint)' }}
                >
                  ({q.quantity}개)
                </span>
              </div>
              <div
                className="text-[12px] mt-0.5"
                style={{ color: 'var(--ink-mute)' }}
              >
                {q.reason} · 출처 {q.sourceNcrId}
              </div>
              <div
                className="font-mono text-[10.5px] mt-0.5"
                style={{ color: 'var(--ink-faint)' }}
              >
                격리: {new Date(q.isolatedAt).toLocaleString('ko-KR')} · {q.isolatedBy}
              </div>
            </div>
            <span
              className="tag"
              style={{
                background: `var(--${s.tone}-soft)`,
                color: `var(--${s.tone})`,
              }}
            >
              {s.ko}
            </span>
          </div>
        )
      })}
    </div>
  )
}
