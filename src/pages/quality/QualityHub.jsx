import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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

  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'ncr') // ncr | capa | quarantine
  const [filter, setFilter] = useState('open') // open | all
  const [selectedNcrId, setSelectedNcrId] = useState(null)
  const [selectedCapaId, setSelectedCapaId] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const [, setRefresh] = useState(0)
  const refresh = () => setRefresh((t) => t + 1)

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
        {tab === 'capa' && <CapaList capas={allCapas} selectedId={selectedCapaId} onSelect={setSelectedCapaId} onChanged={refresh} />}
        {tab === 'quarantine' && <QuarantineList items={allQuarantine} />}
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
  if (tab !== 'ncr' && tab !== 'capa') return null
  const isNcr = tab === 'ncr'
  const submit = () => {
    if (!title.trim()) return
    if (isNcr) ncr.raise({ title: title.trim(), description: desc.trim(), severity: sev, source: { type: 'manual' } })
    else capa.raise({ title: title.trim(), description: desc.trim(), trigger: 'manual', triggerReason: '수동 발의' })
    setTitle(''); setDesc(''); setSev(NCR_SEVERITY.MAJOR); setOpen(false); onCreated && onCreated()
  }
  return (
    <div className="mb-4">
      {!open ? (
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900">
          + 새 {isNcr ? '부적합 보고서(NCR)' : '시정·예방 조치(CAPA)'} 작성
        </button>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-3 grid gap-2 max-w-2xl">
          <div className="text-[13px] font-semibold text-slate-800">새 {isNcr ? '부적합 보고서(NCR)' : '시정·예방 조치(CAPA)'} 작성</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isNcr ? '제목 (예: 멸균 공정 온도 이탈)' : '제목 (예: 멸균 온도 이탈 재발 방지)'} className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none focus:border-emerald-500" />
          {isNcr && (
            <select value={sev} onChange={(e) => setSev(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-emerald-500">
              <option value={NCR_SEVERITY.CRITICAL}>심각도: Critical (중대)</option>
              <option value={NCR_SEVERITY.MAJOR}>심각도: Major (주요)</option>
              <option value={NCR_SEVERITY.MINOR}>심각도: Minor (경미)</option>
            </select>
          )}
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder={isNcr ? '무엇이 / 어디서 / 왜 기준을 벗어났는지 기술 (ISO 13485 §8.3)' : '근본원인·조치 사유를 기술 (ISO 13485 §8.5.2/§8.5.3)'} className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] leading-relaxed resize-y focus:outline-none focus:border-emerald-500" />
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
function CapaList({ capas, selectedId, onSelect, onChanged }) {
  const selected = selectedId ? capas.find((c) => c.id === selectedId) : null

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
    <div className="grid lg:grid-cols-12 gap-4">
      <div className="lg:col-span-5">
        <div className="card-base p-3">
          <div className="font-mono text-[10px] tracking-[0.16em] uppercase px-2 mb-2" style={{ color: 'var(--ink-mute)' }}>
            CAPA · {capas.length}건
          </div>
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {capas.map((c) => {
              const status = CAPA_STATUS_LABEL[c.status]
              const sel = c.id === selectedId
              return (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className="w-full text-left p-3 rounded-lg border transition"
                  style={{ borderColor: sel ? 'var(--moss)' : 'var(--line)', background: sel ? 'var(--leaf-soft)' : 'var(--bg-card)' }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <span className="font-mono text-[11px]" style={{ color: 'var(--moss)', fontWeight: 500 }}>{c.id}</span>
                    <span className="tag" style={{ background: `var(--${status.tone}-soft)`, color: `var(--${status.tone})` }}>{status.ko}</span>
                  </div>
                  <div className="text-[13px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>{c.title}</div>
                  <div className="font-mono text-[10px] mt-1" style={{ color: 'var(--ink-faint)' }}>{new Date(c.raisedAt).toLocaleDateString('ko-KR')} · {c.raisedBy}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <div className="lg:col-span-7">
        {selected ? (
          <CapaDetail capaRecord={selected} onChanged={onChanged} />
        ) : (
          <div className="card-base p-10 text-center text-[13px]" style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}>
            좌측에서 CAPA를 선택하세요
          </div>
        )}
      </div>
    </div>
  )
}

/* ================================================================
   CAPA 상세 — 근본원인분석 → 시정조치 → 예방조치 → 효과성검증 → 승인·종결
   ================================================================ */
const CAPA_STAGE_ORDER = ['open', 'rca', 'corrective', 'preventive', 'verification', 'closed']

function CapaDetail({ capaRecord, onChanged }) {
  const canEdit = permissions.can('qms.capa.edit')
  const canApprove = permissions.can('qms.capa.approve')
  const stageIdx = CAPA_STAGE_ORDER.indexOf(capaRecord.status)

  const [rca, setRca] = useState(capaRecord.rootCause || { method: '', cause: '', evidence: '' })
  const [corrective, setCorrective] = useState(capaRecord.correctiveAction || { action: '', owner: '', dueDate: '', completedDate: '' })
  const [preventive, setPreventive] = useState(capaRecord.preventiveAction || { action: '', owner: '', dueDate: '' })
  const [verification, setVerification] = useState(capaRecord.verification || { method: '', result: '효과있음', verifiedBy: '', verifiedDate: '' })

  const saveStage = (stageKey, data, nextStatus) => {
    if (!canEdit) { alert('CAPA 기록은 검사관(Level 2) 이상 권한이 필요합니다.'); return }
    capa.updateStage(capaRecord.id, { [stageKey]: data }, nextStatus)
    onChanged()
  }

  const closeCapa = () => {
    if (!canApprove) { alert('CAPA 승인·종결은 매니저(Level 3) 권한이 필요합니다.'); return }
    const reason = prompt('종결 승인 사유 (효과성검증 결과 기준):', '효과성 검증 완료 — 종결 승인')
    if (reason == null) return
    capa.updateStage(capaRecord.id, {}, 'closed', { reason: reason.trim() || '종결' })
    onChanged()
  }

  const status = CAPA_STATUS_LABEL[capaRecord.status]

  return (
    <div className="card-base p-5 fade-in space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>{capaRecord.id}</span>
          <div className="font-display text-[20px] mt-1 leading-tight" style={{ color: 'var(--ink)', fontWeight: 500 }}>{capaRecord.title}</div>
        </div>
        <span className="tag" style={{ background: `var(--${status.tone}-soft)`, color: `var(--${status.tone})` }}>{status.ko}</span>
      </div>
      <div className="text-[12.5px]" style={{ color: 'var(--ink-mute)' }}>{capaRecord.description || capaRecord.triggerReason}</div>

      {/* 근본원인분석 */}
      <CapaStageCard title="① 근본원인분석 (RCA)" citation="ISO 13485 §8.5.2" active={stageIdx <= 1} done={stageIdx > 1} locked={stageIdx < 0}>
        <SelectFieldQ label="분석 기법" value={rca.method} onChange={(v) => setRca((r) => ({ ...r, method: v }))} options={['', '5-Why', '피쉬본(어골도)', 'FMEA', '기타']} disabled={!canEdit || stageIdx > 1} />
        <TextAreaFieldQ label="근본원인" value={rca.cause} onChange={(v) => setRca((r) => ({ ...r, cause: v }))} disabled={!canEdit || stageIdx > 1} />
        <TextAreaFieldQ label="근거·증거" value={rca.evidence} onChange={(v) => setRca((r) => ({ ...r, evidence: v }))} disabled={!canEdit || stageIdx > 1} />
        {canEdit && stageIdx <= 1 && (
          <div className="flex justify-end"><button onClick={() => saveStage('rootCause', rca, 'rca')} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}>저장 · 다음 단계로</button></div>
        )}
      </CapaStageCard>

      {/* 시정조치 */}
      <CapaStageCard title="② 시정조치" citation="ISO 13485 §8.5.2" active={stageIdx >= 1 && stageIdx <= 2} done={stageIdx > 2} locked={stageIdx < 1}>
        <TextAreaFieldQ label="시정조치 내용" value={corrective.action} onChange={(v) => setCorrective((c) => ({ ...c, action: v }))} disabled={!canEdit || stageIdx > 2} />
        <div className="grid sm:grid-cols-3 gap-2">
          <FieldQ label="담당자" value={corrective.owner} onChange={(v) => setCorrective((c) => ({ ...c, owner: v }))} disabled={!canEdit || stageIdx > 2} />
          <FieldQ label="완료 기한" type="date" value={corrective.dueDate} onChange={(v) => setCorrective((c) => ({ ...c, dueDate: v }))} disabled={!canEdit || stageIdx > 2} />
          <FieldQ label="완료일" type="date" value={corrective.completedDate} onChange={(v) => setCorrective((c) => ({ ...c, completedDate: v }))} disabled={!canEdit || stageIdx > 2} />
        </div>
        {canEdit && stageIdx >= 1 && stageIdx <= 2 && (
          <div className="flex justify-end"><button onClick={() => saveStage('correctiveAction', corrective, 'corrective')} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}>저장 · 다음 단계로</button></div>
        )}
      </CapaStageCard>

      {/* 예방조치 */}
      <CapaStageCard title="③ 예방조치" citation="ISO 13485 §8.5.3" active={stageIdx >= 2 && stageIdx <= 3} done={stageIdx > 3} locked={stageIdx < 2}>
        <TextAreaFieldQ label="예방조치 내용" value={preventive.action} onChange={(v) => setPreventive((p) => ({ ...p, action: v }))} disabled={!canEdit || stageIdx > 3} />
        <div className="grid sm:grid-cols-2 gap-2">
          <FieldQ label="담당자" value={preventive.owner} onChange={(v) => setPreventive((p) => ({ ...p, owner: v }))} disabled={!canEdit || stageIdx > 3} />
          <FieldQ label="완료 기한" type="date" value={preventive.dueDate} onChange={(v) => setPreventive((p) => ({ ...p, dueDate: v }))} disabled={!canEdit || stageIdx > 3} />
        </div>
        {canEdit && stageIdx >= 2 && stageIdx <= 3 && (
          <div className="flex justify-end"><button onClick={() => saveStage('preventiveAction', preventive, 'preventive')} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}>저장 · 다음 단계로</button></div>
        )}
      </CapaStageCard>

      {/* 효과성검증 */}
      <CapaStageCard title="④ 효과성검증" citation="ISO 13485 §8.5.2(f)" active={stageIdx >= 3 && stageIdx <= 4} done={stageIdx > 4} locked={stageIdx < 3}>
        <TextAreaFieldQ label="검증 방법" value={verification.method} onChange={(v) => setVerification((x) => ({ ...x, method: v }))} disabled={!canEdit || stageIdx > 4} />
        <div className="grid sm:grid-cols-3 gap-2">
          <SelectFieldQ label="검증 결과" value={verification.result} onChange={(v) => setVerification((x) => ({ ...x, result: v }))} options={['효과있음', '불충분 · 재조치 필요']} disabled={!canEdit || stageIdx > 4} />
          <FieldQ label="검증자" value={verification.verifiedBy} onChange={(v) => setVerification((x) => ({ ...x, verifiedBy: v }))} disabled={!canEdit || stageIdx > 4} />
          <FieldQ label="검증일" type="date" value={verification.verifiedDate} onChange={(v) => setVerification((x) => ({ ...x, verifiedDate: v }))} disabled={!canEdit || stageIdx > 4} />
        </div>
        {canEdit && stageIdx >= 3 && stageIdx <= 4 && (
          <div className="flex justify-end"><button onClick={() => saveStage('verification', verification, 'verification')} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}>저장 · 승인 대기로</button></div>
        )}
      </CapaStageCard>

      {/* 승인·종결 */}
      <CapaStageCard title="⑤ 승인 · 종결" citation="ISO 13485 §8.5.2 (매니저 승인)" active={stageIdx === 4} done={stageIdx === 5} locked={stageIdx < 4}>
        {stageIdx === 5 ? (
          <div className="text-[12.5px]" style={{ color: 'var(--moss)' }}>
            <CheckCircle2 size={14} className="inline mr-1" />
            {capaRecord.closure?.by} 승인 · {capaRecord.closure?.closedAt ? new Date(capaRecord.closure.closedAt).toLocaleString('ko-KR') : ''} — {capaRecord.closure?.reason}
          </div>
        ) : stageIdx === 4 ? (
          canApprove ? (
            <div className="flex justify-end"><button onClick={closeCapa} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}><CheckCircle2 size={13} /> 승인 및 종결</button></div>
          ) : (
            <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>효과성검증까지 완료되었습니다. 매니저(Level 3) 승인을 기다리는 중입니다.</div>
          )
        ) : (
          <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>이전 단계를 먼저 완료하세요.</div>
        )}
      </CapaStageCard>
    </div>
  )
}

function CapaStageCard({ title, citation, active, done, locked, children }) {
  return (
    <div className="rounded-lg p-3.5" style={{ background: locked ? 'var(--bg-soft)' : active ? 'var(--leaf-soft)' : 'var(--bg-card)', border: '1px solid var(--line)', opacity: locked ? 0.55 : 1 }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{title}</div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9.5px]" style={{ color: 'var(--ink-faint)' }}>{citation}</span>
          {done && <CheckCircle2 size={14} style={{ color: 'var(--moss)' }} />}
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function FieldQ({ label, value, onChange, placeholder, type = 'text', disabled }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <input type={type} className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }} value={value} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
function SelectFieldQ({ label, value, onChange, options, disabled }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <select className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o || '(선택)'}</option>)}
      </select>
    </label>
  )
}
function TextAreaFieldQ({ label, value, onChange, disabled }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <textarea className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13, minHeight: 60 }} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </label>
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
