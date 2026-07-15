import React, { useState } from 'react'
import {
  Cog, ClipboardList, BarChart2, AlertTriangle,
  ArrowLeft, CheckCircle, XCircle, Activity,
  FileText, Package, Wrench, GitBranch,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

/* ─── 샘플 데이터 ─── */
const WORK_ORDERS = [
  { wo: 'WO-2406-018', so: 'SO-2406-012', product: 'SCS M3.5×22mm', qty: 200, step: '가공중', dueDate: '24-06-25', startDate: '24-06-19', assignee: '3공정팀', progress: 60, status: '진행중' },
  { wo: 'WO-2406-017', so: 'SO-2406-010', product: 'SCS M4.0×24mm', qty: 300, step: '검사대기', dueDate: '24-07-05', startDate: '24-06-17', assignee: '검사팀', progress: 80, status: '진행중' },
  { wo: 'WO-2406-015', so: 'SO-2406-008', product: 'BPL 4㎖', qty: 50, step: '완료', dueDate: '24-06-20', startDate: '24-06-10', assignee: '—', progress: 100, status: '완료' },
  { wo: 'WO-2406-014', so: 'SO-2406-005', product: 'SCS M3.5×24mm', qty: 100, step: '완료', dueDate: '24-06-14', startDate: '24-06-05', assignee: '—', progress: 100, status: '완료' },
]

const PROCESS_RECORDS = [
  { id: 'PR-2406-044', wo: 'WO-2406-018', date: '24-06-21', step: 'CNC 선삭', machine: 'CNC-01', operator: '이기술', param: '회전수 2800rpm, 이송속도 0.12mm/rev', result: '합격', note: '' },
  { id: 'PR-2406-043', wo: 'WO-2406-018', date: '24-06-20', step: '원소재 준비', machine: '—', operator: '박자재', param: 'Ti-6Al-4V φ12mm, LOT-2406-012', result: '합격', note: '' },
  { id: 'PR-2406-042', wo: 'WO-2406-017', date: '24-06-21', step: '최종검사', machine: 'CMM-01', operator: '김검사', param: '치수공차 ±0.05mm', result: '합격', note: '' },
  { id: 'PR-2406-041', wo: 'WO-2406-017', date: '24-06-19', step: '표면처리', machine: '외주(세진코팅)', operator: '—', param: '아노다이징 type II', result: '합격', note: '' },
]

const HISTORY_CARD = {
  wo: 'WO-2406-015',
  product: 'BPL 4㎖',
  lot: 'LOT-2406-045',
  qty: 50,
  mfgDate: '24-06-10',
  completedDate: '24-06-20',
  yield: '98.0%',
  scrap: 1,
  steps: [
    { seq: 1, step: '원료 준비', date: '24-06-10', operator: '박자재', result: '합격' },
    { seq: 2, step: '성형 가공', date: '24-06-12', operator: '이기술', result: '합격' },
    { seq: 3, step: '표면처리', date: '24-06-15', operator: '외주', result: '합격' },
    { seq: 4, step: '세척·건조', date: '24-06-17', operator: '오세척', result: '합격' },
    { seq: 5, step: '최종검사', date: '24-06-18', operator: '김검사', result: '합격(1 폐기)' },
    { seq: 6, step: '포장·멸균', date: '24-06-19', operator: '최포장', result: '합격' },
    { seq: 7, step: '출하승인', date: '24-06-20', operator: 'QA팀장', result: '승인' },
  ],
}

const INSPECT = [
  { id: 'IPC-2406-033', wo: 'WO-2406-018', step: 'CNC 선삭 후 공정검사', date: '24-06-21', inspector: '이기술', spec: 'φ3.5mm ±0.02, 나사 피치 0.6mm', measured: '3.499, 0.600', result: '합격', status: '합격' },
  { id: 'IPC-2406-032', wo: 'WO-2406-017', step: '최종치수 검사', date: '24-06-21', inspector: '김검사', spec: 'φ4.0mm ±0.02, L=24mm ±0.1', measured: '4.001, 24.05', result: '합격', status: '합격' },
  { id: 'IPC-2406-031', wo: 'WO-2406-017', step: '표면처리 후 외관 검사', date: '24-06-20', inspector: '이검사', spec: '아노다이징 균일도 — 육안합격기준', measured: '이상 없음 (5EA 제외)', result: '조건부합격', status: '조건부' },
]

const NCR = [
  { id: 'NC-2406-003', date: '24-06-20', wo: 'WO-2406-017', step: '표면처리 후 외관', desc: '아노다이징 불균일 5EA', severity: '경미', disposition: '재처리', capaNo: 'CA-2406-005', status: '조치중' },
  { id: 'NC-2406-001', date: '24-06-08', wo: 'WO-2406-015', step: '성형 후 치수 검사', desc: '외경 초과공차 1EA — 폐기처리', severity: '경미', disposition: '폐기', capaNo: '—', status: '종결' },
]

const PERF = [
  { month: '1월', planned: 980, actual: 962, yield: 98.2, scrap: 18, nc: 1 },
  { month: '2월', planned: 850, actual: 842, yield: 99.1, scrap: 8, nc: 0 },
  { month: '3월', planned: 1100, actual: 1085, yield: 98.6, scrap: 15, nc: 2 },
  { month: '4월', planned: 950, actual: 948, yield: 99.8, scrap: 2, nc: 0 },
  { month: '5월', planned: 1200, actual: 1185, yield: 98.8, scrap: 15, nc: 1 },
  { month: '6월', planned: 1300, actual: 780, yield: 98.5, scrap: 12, nc: 1 },
]

const EQP_LINK = [
  { eqp: 'CNC-01', name: 'CNC 선반 #1', status: '가동중', lastPM: '24-05-20', nextPM: '24-08-20', calib: '해당없음', utilization: '72%' },
  { eqp: 'CNC-02', name: 'CNC 선반 #2', status: '가동중', lastPM: '24-05-25', nextPM: '24-08-25', calib: '해당없음', utilization: '58%' },
  { eqp: 'CMM-01', name: '3축 CMM', status: '가동중', lastPM: '24-04-10', nextPM: '24-07-10', calib: '24-07-01 예정', utilization: '45%' },
  { eqp: 'CLN-01', name: '초음파 세척기', status: '가동중', lastPM: '24-06-01', nextPM: '24-09-01', calib: '해당없음', utilization: '40%' },
]

/* ─── 공통 헬퍼 ─── */
const Badge = ({ text, tone = 'gray' }) => {
  const c = {
    red: { bg: 'var(--rust-soft)', fg: 'var(--rust)' },
    green: { bg: 'var(--leaf-soft)', fg: 'var(--moss)' },
    amber: { bg: '#fff7ed', fg: '#b45309' },
    blue: { bg: '#eff6ff', fg: '#1d4ed8' },
    gray: { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)' },
  }[tone] || { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)' }
  return (
    <span className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded"
      style={{ background: c.bg, color: c.fg, fontWeight: 500 }}>{text}</span>
  )
}

const statusTone = (s) => {
  if (!s) return 'gray'
  if (s.includes('불합') || s.includes('심각') || s.includes('폐기')) return 'red'
  if (s.includes('조건') || s.includes('조치') || s.includes('진행') || s.includes('경미')) return 'amber'
  if (s.includes('합격') || s.includes('완료') || s.includes('종결') || s.includes('승인') || s.includes('가동')) return 'green'
  return 'gray'
}

const TH = ({ children }) => (
  <th className="pb-2 text-left font-medium px-2 first:pl-0 text-[11.5px]"
    style={{ color: 'var(--ink-faint)', borderBottom: '1px solid var(--line)' }}>{children}</th>
)
const TD = ({ children, mono, color, right }) => (
  <td className={`py-2 px-2 first:pl-0 text-[12.5px]${mono ? ' font-mono text-[11px]' : ''}${right ? ' text-right tabular-nums' : ''}`}
    style={{ color: color || 'var(--ink)', borderBottom: '1px solid var(--line)' }}>{children}</td>
)

const SectionTitle = ({ children, breadcrumb }) => (
  <div className="mb-5">
    {breadcrumb && <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1" style={{ color: 'var(--ink-faint)' }}>생산 / {breadcrumb}</div>}
    <h2 className="font-display text-[22px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>{children}</h2>
  </div>
)

/* ─── 서브뷰 ─── */
function MfgHome({ onNavigate }) {
  const CARDS = [
    { id: 'wo', icon: ClipboardList, label: '작업 지시', desc: 'WO 목록 · 진행 상태 · 수율 관리', count: `${WORK_ORDERS.filter(w => w.status === '진행중').length}건 진행` },
    { id: 'proc-rec', icon: FileText, label: '공정 기록', desc: '공정별 작업 기록 · 파라미터 관리', count: `${PROCESS_RECORDS.length}건` },
    { id: 'history', icon: GitBranch, label: '공정 이력 카드', desc: 'LOT 기반 전 공정 이력 추적', count: '' },
    { id: 'inspect', icon: CheckCircle, label: '검사 기록', desc: '공정검사 · 최종검사 결과 기록', count: `${INSPECT.length}건` },
    { id: 'ncr', icon: AlertTriangle, label: '불량 처리', desc: 'NCR 발행 · 처리 · CAPA 연동', count: `${NCR.filter(n => n.status !== '종결').length}건 미결` },
    { id: 'perf', icon: BarChart2, label: '생산 실적', desc: '월별 계획/실적 · 수율 · 불량 통계', count: '6개월' },
    { id: 'eqp-link', icon: Wrench, label: '설비 연동', desc: '생산 설비 현황 · PM · 교정 일정', count: `${EQP_LINK.length}대` },
    { id: 'flow', icon: Activity, label: '생산 흐름 요약', desc: '오늘 생산 흐름 · 공정별 현황', count: '' },
  ]
  const summary = [
    { label: '진행 중 WO', value: `${WORK_ORDERS.filter(w => w.status === '진행중').length}건`, sub: '작업 진행 중' },
    { label: '이번 달 생산', value: '1,248EA', sub: '계획 대비 96.0%' },
    { label: '평균 수율', value: '98.6%', sub: '6개월 평균' },
    { label: '미결 NCR', value: `${NCR.filter(n => n.status !== '종결').length}건`, sub: 'CAPA 조치중', warn: true },
  ]
  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>MFG · MANUFACTURING · ISO 13485 §7.5</span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>생산</div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>작업지시 · 공정기록 · 검사 · 불량처리 · 실적</div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {summary.map(s => (
          <div key={s.label} className="card-base p-4">
            <div className="text-[12px] mb-1" style={{ color: 'var(--ink-mute)' }}>{s.label}</div>
            <div className="font-display text-[24px]" style={{ color: s.warn ? 'var(--rust)' : 'var(--moss)', fontWeight: 600 }}>{s.value}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CARDS.map(card => (
          <button key={card.id} onClick={() => onNavigate(card.id)}
            className="card-base p-4 text-left hover:shadow-md transition group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--leaf-soft)' }}>
                <card.icon size={18} style={{ color: 'var(--moss)' }} strokeWidth={1.7} />
              </div>
              {card.count && <span className="font-display text-[13px]" style={{ color: card.count.includes('미결') ? 'var(--rust)' : 'var(--moss)', fontWeight: 600 }}>{card.count}</span>}
            </div>
            <div className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>{card.label}</div>
            <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{card.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function WoView() {
  return (
    <div>
      <SectionTitle breadcrumb="작업 지시">작업 지시 (WO)</SectionTitle>
      <div className="space-y-3">
        {WORK_ORDERS.map(w => (
          <div key={w.wo} className="card-base p-4">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="font-mono text-[12px] font-bold" style={{ color: 'var(--moss)' }}>{w.wo}</span>
              <Badge text={w.product} tone="blue" />
              <Badge text={w.status} tone={statusTone(w.status)} />
              <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>납기 {w.dueDate}</span>
            </div>
            <div className="flex items-center gap-6 text-[12.5px] flex-wrap" style={{ color: 'var(--ink-mute)' }}>
              <span>SO: <span className="font-mono">{w.so}</span></span>
              <span>수량: <b style={{ color: 'var(--ink)' }}>{w.qty}EA</b></span>
              <span>현재공정: <b style={{ color: 'var(--ink)' }}>{w.step}</b></span>
              <span>담당: {w.assignee}</span>
            </div>
            {w.status === '진행중' && (
              <div className="mt-3">
                <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--ink-faint)' }}>
                  <span>진행률</span><span>{w.progress}%</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'var(--line)' }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${w.progress}%`, background: 'var(--moss)' }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ProcRecView() {
  return (
    <div>
      <SectionTitle breadcrumb="공정 기록">공정 기록</SectionTitle>
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>공정 기록부 (ISO 13485 §7.5.1)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['기록ID','WO','일자','공정','설비','작업자','파라미터','결과'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {PROCESS_RECORDS.map(r => (
                <tr key={r.id}>
                  <TD mono color="var(--moss)">{r.id}</TD>
                  <TD mono color="var(--ink-faint)">{r.wo}</TD>
                  <TD mono color="var(--ink-faint)">{r.date}</TD>
                  <TD>{r.step}</TD>
                  <TD color="var(--ink-mute)">{r.machine}</TD>
                  <TD color="var(--ink-mute)">{r.operator}</TD>
                  <TD color="var(--ink-faint)">{r.param}</TD>
                  <TD><Badge text={r.result} tone={statusTone(r.result)} /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function HistoryView() {
  const d = HISTORY_CARD
  return (
    <div>
      <SectionTitle breadcrumb="공정 이력 카드">공정 이력 카드</SectionTitle>
      <div className="card-base p-5 mb-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-4" style={{ color: 'var(--ink-faint)' }}>공정 이력 카드 — {d.lot} (ISO 13485 §7.5.3.2)</div>
        <div className="grid sm:grid-cols-3 gap-x-8 gap-y-3 mb-4">
          {[
            ['WO', d.wo], ['제품', d.product], ['LOT', d.lot],
            ['생산수량', `${d.qty}EA`], ['제조일', d.mfgDate], ['완료일', d.completedDate],
            ['수율', d.yield], ['폐기', `${d.scrap}EA`],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <div className="text-[11px] w-20 shrink-0 mt-0.5" style={{ color: 'var(--ink-faint)' }}>{k}</div>
              <div className="font-mono text-[12px]" style={{ color: 'var(--ink)' }}>{v}</div>
            </div>
          ))}
        </div>
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3 mt-4" style={{ color: 'var(--ink-faint)' }}>공정 단계</div>
        <div className="space-y-2">
          {d.steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>{s.seq}</div>
              <div className="flex-1 text-[12.5px]" style={{ color: 'var(--ink)' }}>{s.step}</div>
              <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{s.date}</div>
              <div className="text-[11px]" style={{ color: 'var(--ink-mute)' }}>{s.operator}</div>
              <Badge text={s.result} tone={statusTone(s.result)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InspectView() {
  return (
    <div>
      <SectionTitle breadcrumb="검사 기록">검사 기록</SectionTitle>
      <div className="space-y-3">
        {INSPECT.map(q => (
          <div key={q.id} className="card-base p-4">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="font-mono text-[11.5px] font-medium" style={{ color: 'var(--moss)' }}>{q.id}</span>
              <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{q.date}</span>
              <Badge text={q.wo} tone="gray" />
              <Badge text={q.status} tone={statusTone(q.status)} />
            </div>
            <div className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{q.step}</div>
            <div className="mt-2 grid sm:grid-cols-3 gap-3 text-[12px]" style={{ color: 'var(--ink-mute)' }}>
              <div>검사자: {q.inspector}</div>
              <div>기준: {q.spec}</div>
              <div>측정: <span style={{ color: 'var(--ink)' }}>{q.measured}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NcrView() {
  return (
    <div>
      <SectionTitle breadcrumb="불량 처리">불량 처리 (NCR)</SectionTitle>
      <div className="space-y-3">
        {NCR.map(n => (
          <div key={n.id} className="card-base p-4">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="font-mono text-[11.5px] font-medium" style={{ color: 'var(--rust)' }}>{n.id}</span>
              <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{n.date}</span>
              <Badge text={n.severity} tone={n.severity === '심각' ? 'red' : n.severity === '경미' ? 'gray' : 'amber'} />
              <Badge text={n.status} tone={statusTone(n.status)} />
            </div>
            <div className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{n.desc}</div>
            <div className="mt-2 flex items-center gap-4 text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>
              <span>WO: <span className="font-mono">{n.wo}</span></span>
              <span>공정: {n.step}</span>
              <span>처리: <b style={{ color: 'var(--ink)' }}>{n.disposition}</b></span>
              {n.capaNo !== '—' && <span>CAPA: <span className="font-mono" style={{ color: 'var(--moss)' }}>{n.capaNo}</span></span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PerfView() {
  const total = PERF.reduce((a, b) => a + b.actual, 0)
  const avgYield = (PERF.reduce((a, b) => a + b.yield, 0) / PERF.length).toFixed(1)
  return (
    <div>
      <SectionTitle breadcrumb="생산 실적">생산 실적</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: '상반기 생산', value: `${total.toLocaleString()}EA`, tone: 'green' },
          { label: '평균 수율', value: `${avgYield}%`, tone: 'green' },
          { label: '총 폐기', value: `${PERF.reduce((a, b) => a + b.scrap, 0)}EA`, tone: 'red' },
          { label: 'NCR 발생', value: `${PERF.reduce((a, b) => a + b.nc, 0)}건`, tone: 'amber' },
        ].map(s => (
          <div key={s.label} className="card-base p-4">
            <div className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>{s.label}</div>
            <div className="font-display text-[24px] mt-0.5" style={{ color: s.tone === 'red' ? 'var(--rust)' : s.tone === 'amber' ? '#b45309' : 'var(--moss)', fontWeight: 600 }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>월별 생산 실적 (ISO 13485 §7.5.1)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['월', '계획(EA)', '실적(EA)', '수율(%)', '폐기(EA)', 'NCR'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {PERF.map(p => (
                <tr key={p.month}>
                  <TD>{p.month}</TD>
                  <TD right>{p.planned.toLocaleString()}</TD>
                  <TD right color={p.actual < p.planned * 0.95 ? 'var(--rust)' : 'var(--ink)'}>{p.actual.toLocaleString()}</TD>
                  <TD right color={p.yield < 98 ? '#b45309' : 'var(--moss)'}>{p.yield}</TD>
                  <TD right color={p.scrap > 10 ? 'var(--rust)' : 'var(--ink-faint)'}>{p.scrap}</TD>
                  <TD right color={p.nc > 0 ? 'var(--rust)' : 'var(--ink-faint)'}>{p.nc > 0 ? p.nc + '건' : '—'}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function EqpLinkView() {
  return (
    <div>
      <SectionTitle breadcrumb="설비 연동">설비 연동</SectionTitle>
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>생산 설비 현황 · PM · 교정 연동 (ISO 13485 §6.4)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['설비코드', '설비명', '상태', '최근PM', '차기PM', '교정예정', '가동률'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {EQP_LINK.map(e => (
                <tr key={e.eqp}>
                  <TD mono color="var(--moss)">{e.eqp}</TD>
                  <TD><span className="font-medium">{e.name}</span></TD>
                  <TD><Badge text={e.status} tone={statusTone(e.status)} /></TD>
                  <TD mono color="var(--ink-faint)">{e.lastPM}</TD>
                  <TD mono color="var(--ink-faint)">{e.nextPM}</TD>
                  <TD mono color={e.calib.includes('예정') ? '#b45309' : 'var(--ink-faint)'}>{e.calib}</TD>
                  <TD right>{e.utilization}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FlowView() {
  const FLOW_STEPS = [
    { label: '원소재 준비', count: '진행중 2 WO', status: 'active' },
    { label: 'CNC 가공', count: 'WO-018: 60%', status: 'active' },
    { label: '표면처리', count: '외주 진행중', status: 'active' },
    { label: '세척·건조', count: '대기', status: 'wait' },
    { label: '공정 검사', count: 'WO-017: 완료', status: 'done' },
    { label: '최종 검사', count: '대기', status: 'wait' },
    { label: '포장·멸균', count: '대기', status: 'wait' },
    { label: '출하 승인', count: '대기', status: 'wait' },
  ]
  const TONE = { active: { bg: 'var(--leaf-soft)', fg: 'var(--moss)', dot: 'var(--moss)' }, done: { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)', dot: 'var(--ink-faint)' }, wait: { bg: 'var(--bg-soft)', fg: 'var(--ink-faint)', dot: 'var(--line)' } }
  return (
    <div>
      <SectionTitle breadcrumb="생산 흐름 요약">생산 흐름 요약</SectionTitle>
      <div className="card-base p-5 mb-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-4" style={{ color: 'var(--ink-faint)' }}>오늘의 생산 흐름 — 24-06-21</div>
        <div className="relative">
          <div className="flex gap-2 flex-wrap">
            {FLOW_STEPS.map((s, i) => {
              const t = TONE[s.status]
              return (
                <div key={i} className="flex items-center gap-1">
                  <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: t.bg, minWidth: 100 }}>
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: t.dot }} />
                      <div className="text-[11.5px] font-medium" style={{ color: t.fg }}>{s.label}</div>
                    </div>
                    <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{s.count}</div>
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <div className="text-[12px]" style={{ color: 'var(--line)' }}>→</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="card-base p-4">
          <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>진행 중 WO 현황</div>
          {WORK_ORDERS.filter(w => w.status === '진행중').map(w => (
            <div key={w.wo} className="mb-3">
              <div className="flex justify-between text-[12px] mb-1">
                <span style={{ color: 'var(--ink)' }}>{w.wo} — {w.product}</span>
                <span style={{ color: 'var(--ink-faint)' }}>{w.progress}%</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'var(--line)' }}>
                <div className="h-1.5 rounded-full" style={{ width: `${w.progress}%`, background: 'var(--moss)' }} />
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>현재 공정: {w.step} · 납기 {w.dueDate}</div>
            </div>
          ))}
        </div>
        <div className="card-base p-4">
          <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>오늘의 이슈</div>
          {NCR.filter(n => n.status !== '종결').map(n => (
            <div key={n.id} className="flex items-start gap-2 mb-2">
              <AlertTriangle size={13} style={{ color: 'var(--rust)', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div className="text-[12.5px] font-medium" style={{ color: 'var(--rust)' }}>{n.id}</div>
                <div className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>{n.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── 메인 허브 ─── */
export default function ManufacturingHub() {
  const user = auth.current()
  const [view, setView] = useState('home')

  const viewMap = {
    home: <MfgHome onNavigate={setView} />,
    wo: <WoView />,
    'proc-rec': <ProcRecView />,
    history: <HistoryView />,
    inspect: <InspectView />,
    ncr: <NcrView />,
    perf: <PerfView />,
    'eqp-link': <EqpLinkView />,
    flow: <FlowView />,
  }

  const tabLabels = {
    wo: '작업지시', 'proc-rec': '공정기록', history: '공정이력카드', inspect: '검사기록',
    ncr: '불량처리', perf: '생산실적', 'eqp-link': '설비연동', flow: '생산흐름요약',
  }

  return (
    <AppLayout user={user} title="생산" subtitle="작업지시 · 공정기록 · 검사 · 불량처리 · 생산실적">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {view !== 'home' && (
          <button onClick={() => setView('home')}
            className="flex items-center gap-1.5 mb-5 text-[13px] hover:underline"
            style={{ color: 'var(--moss)' }}>
            <ArrowLeft size={14} /> 생산 홈
          </button>
        )}
        {view !== 'home' && (
          <div className="flex gap-1 flex-wrap mb-5">
            {Object.entries(tabLabels).map(([id, label]) => (
              <button key={id} onClick={() => setView(id)}
                className="text-[12px] px-3 py-1.5 rounded-lg border transition"
                style={{
                  background: view === id ? 'var(--moss)' : 'var(--bg-card)',
                  color: view === id ? 'var(--bg)' : 'var(--ink-mute)',
                  borderColor: view === id ? 'var(--moss)' : 'var(--line)',
                }}>
                {label}
              </button>
            ))}
          </div>
        )}
        {viewMap[view] || viewMap.home}
      </div>
    </AppLayout>
  )
}
