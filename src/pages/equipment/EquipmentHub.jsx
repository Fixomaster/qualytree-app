import React, { useState } from 'react'
import {
  Wrench, Calendar, AlertTriangle, CheckCircle,
  ArrowLeft, Clock, Activity, BarChart2, FileText,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

/* ─── 샘플 데이터 ─── */
const INSTRUMENTS = [
  { id: 'EQP-M-001', name: '버니어 캘리퍼스 150mm', model: 'Mitutoyo 530-312', serial: 'M-2019-0012', range: '0-150mm / 0.02mm', lastCalib: '24-01-15', nextCalib: '25-01-15', interval: '12개월', status: '사용가능', location: '검사실 A', calibBody: '한국교정연구원' },
  { id: 'EQP-M-002', name: '마이크로미터 0-25mm', model: 'Mitutoyo 103-137', serial: 'M-2020-0034', range: '0-25mm / 0.001mm', lastCalib: '24-06-01', nextCalib: '24-12-01', interval: '6개월', status: '사용가능', location: '검사실 A', calibBody: '한국교정연구원' },
  { id: 'EQP-M-003', name: '표면거칠기계', model: 'Mitutoyo SJ-210', serial: 'SJ-2021-0005', range: 'Ra 0.05-16μm', lastCalib: '23-12-10', nextCalib: '24-06-10', interval: '6개월', status: '교정임박', location: '검사실 B', calibBody: 'KRISS' },
  { id: 'EQP-M-004', name: '하중계 500N', model: 'Shimadzu LC-500', serial: 'LC-2018-0007', range: '0-500N / 0.1N', lastCalib: '24-03-22', nextCalib: '25-03-22', interval: '12개월', status: '사용가능', location: '시험실', calibBody: '한국계량기술연구원' },
  { id: 'EQP-M-005', name: '온습도계', model: 'Testo 635-2', serial: 'TE-2022-0018', range: '-20~70°C / 0-100%RH', lastCalib: '24-02-05', nextCalib: '24-08-05', interval: '6개월', status: '사용가능', location: '창고 A', calibBody: '한국교정연구원' },
  { id: 'EQP-P-001', name: 'CNC 선반 #1', model: 'DOOSAN PUMA 2100', serial: 'CNC-2020-001', range: '최대 φ350mm', lastCalib: '해당없음', nextCalib: '해당없음', interval: 'PM 관리', status: '사용가능', location: '1공정', calibBody: '내부PM' },
  { id: 'EQP-P-002', name: '3축 CMM', model: 'Zeiss Contura G2', serial: 'CMM-2021-001', range: '600×400×400mm', lastCalib: '24-01-10', nextCalib: '24-07-01', interval: '6개월', status: '교정임박', location: '검사실 A', calibBody: 'KRISS' },
  { id: 'EQP-P-003', name: '초음파 세척기', model: 'Power Sonic 410', serial: 'UC-2019-003', range: '40kHz / 70W', lastCalib: '해당없음', nextCalib: '해당없음', interval: 'PM 관리', status: '사용가능', location: '세척실', calibBody: '내부PM' },
]

const EQP_HISTORY = [
  { id: 'EH-2406-012', eqp: 'EQP-P-001', name: 'CNC 선반 #1', date: '24-06-15', type: 'PM', desc: '주기 예방보전 — 오일 교환, 필터 청소, 척 점검', technician: '이기술', result: '정상', next: '24-09-15' },
  { id: 'EH-2406-011', eqp: 'EQP-M-003', name: '표면거칠기계', date: '24-06-10', type: '수리', desc: '탐침 교체 — 마모로 인한 측정 오차 발생', technician: '제조사 A/S', result: '정상복구', next: '교정 의뢰 예정' },
  { id: 'EH-2405-008', eqp: 'EQP-P-001', name: 'CNC 선반 #1', date: '24-05-20', type: 'PM', desc: '월간 점검 — 이상 없음', technician: '이기술', result: '정상', next: '24-06-20' },
  { id: 'EH-2405-006', eqp: 'EQP-M-002', name: '마이크로미터', date: '24-06-01', type: '교정', desc: '정기교정 (6개월)', technician: '한국교정연구원', result: '합격 (성적서 CAL-2406-002)', next: '24-12-01' },
  { id: 'EH-2405-004', eqp: 'EQP-P-003', name: '초음파 세척기', date: '24-05-08', type: 'PM', desc: '세척조 청소, 초음파 출력 점검', technician: '박자재', result: '정상', next: '24-08-08' },
]

const CALIB_SCHEDULE = [
  { eqp: 'EQP-M-003', name: '표면거칠기계', dueDate: '24-06-10', dday: '초과', body: 'KRISS', status: '긴급' },
  { eqp: 'EQP-P-002', name: '3축 CMM', dueDate: '24-07-01', dday: 'D-10', body: 'KRISS', status: '임박' },
  { eqp: 'EQP-M-005', name: '온습도계', dueDate: '24-08-05', dday: 'D-45', body: '한국교정연구원', status: '예정' },
  { eqp: 'EQP-M-002', name: '마이크로미터', dueDate: '24-12-01', dday: 'D-163', body: '한국교정연구원', status: '예정' },
  { eqp: 'EQP-M-001', name: '버니어 캘리퍼스', dueDate: '25-01-15', dday: 'D-208', body: '한국교정연구원', status: '예정' },
  { eqp: 'EQP-M-004', name: '하중계 500N', dueDate: '25-03-22', dday: 'D-274', body: '한국계량기술연구원', status: '예정' },
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
  if (s === '사용제한' || s === '긴급' || s === '초과') return 'red'
  if (s === '교정임박' || s === '임박') return 'amber'
  if (s === '사용가능' || s === '합격' || s === '정상' || s === '정상복구') return 'green'
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
    {breadcrumb && <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1" style={{ color: 'var(--ink-faint)' }}>설비·교정 / {breadcrumb}</div>}
    <h2 className="font-display text-[22px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>{children}</h2>
  </div>
)

/* ─── 서브뷰: 홈 ─── */
function EqpHome({ onNavigate }) {
  const urgent = CALIB_SCHEDULE.filter(c => c.status === '긴급' || c.status === '임박')
  const summary = [
    { label: '관리 설비·계측기', value: `${INSTRUMENTS.length}대`, sub: '등록된 전체 장비' },
    { label: '교정 임박', value: `${urgent.length}건`, sub: 'D-30 이내', warn: urgent.length > 0 },
    { label: '교정 초과', value: `${CALIB_SCHEDULE.filter(c=>c.status==='긴급').length}건`, sub: '즉시 사용 제한 필요', warn: CALIB_SCHEDULE.filter(c=>c.status==='긴급').length > 0 },
    { label: '사용 가능', value: `${INSTRUMENTS.filter(i=>i.status==='사용가능').length}대`, sub: '정상 운용 중' },
  ]
  const CARDS = [
    { id: 'instruments', icon: Wrench, label: '설비·계측기 목록', desc: '전체 장비 · 교정 상태 · 사용 위치' },
    { id: 'history', icon: FileText, label: '설비 이력 관리', desc: 'PM · 수리 · 교정 작업 이력 조회' },
    { id: 'schedule', icon: Calendar, label: '교정 일정 관리', desc: '교정 예정 일정 · D-day · 기관 현황' },
  ]
  return (
    <div>
      <div className="mb-5">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>EQP · EQUIPMENT · ISO 13485 §7.6</span>
        <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>설비·교정</div>
        <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>측정장비 · 생산설비 교정 및 이력 관리</div>
      </div>

      {urgent.length > 0 && (
        <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ background: 'var(--rust-soft)', border: '1px solid var(--rust)' }}>
          <AlertTriangle size={14} style={{ color: 'var(--rust)', marginTop: 2, flexShrink: 0 }} />
          <div className="text-[12.5px]" style={{ color: 'var(--rust)' }}>
            <b>교정 조치 필요 {urgent.length}건</b> — {urgent.map(u => `${u.name}(${u.dday})`).join(', ')} — ISO 13485 §7.6 교정 유효성 관리
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {summary.map(s => (
          <div key={s.label} className="card-base p-4">
            <div className="text-[12px] mb-1" style={{ color: 'var(--ink-mute)' }}>{s.label}</div>
            <div className="font-display text-[24px]" style={{ color: s.warn ? 'var(--rust)' : 'var(--moss)', fontWeight: 600 }}>{s.value}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="card-base p-4 mb-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>계측기 현황 요약 (ISO 13485 §7.6)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['ID', '명칭', '모델명', '교정범위', '최근교정', '차기교정', '교정주기', '상태', '위치'].map(h => <TH key={h}>{h}</TH>)}
              </tr>
            </thead>
            <tbody>
              {INSTRUMENTS.map(i => (
                <tr key={i.id}>
                  <TD mono color="var(--moss)">{i.id}</TD>
                  <TD><span className="font-medium">{i.name}</span></TD>
                  <TD color="var(--ink-mute)">{i.model}</TD>
                  <TD color="var(--ink-faint)">{i.range}</TD>
                  <TD mono color="var(--ink-faint)">{i.lastCalib}</TD>
                  <TD mono color={i.status === '교정임박' ? '#b45309' : 'var(--ink-faint)'}>{i.nextCalib}</TD>
                  <TD color="var(--ink-faint)">{i.interval}</TD>
                  <TD>
                    <Badge
                      text={i.status}
                      tone={i.status === '사용가능' ? 'green' : i.status === '교정임박' ? 'amber' : 'red'}
                    />
                  </TD>
                  <TD color="var(--ink-faint)">{i.location}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {CARDS.map(card => (
          <button key={card.id} onClick={() => onNavigate(card.id)}
            className="card-base p-4 text-left hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--leaf-soft)' }}>
              <card.icon size={18} style={{ color: 'var(--moss)' }} strokeWidth={1.7} />
            </div>
            <div className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>{card.label}</div>
            <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{card.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function InstrumentsView() {
  return (
    <div>
      <SectionTitle breadcrumb="설비·계측기 목록">설비·계측기 목록</SectionTitle>
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>전체 계측기·생산설비 (ISO 13485 §7.6)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['ID', '명칭', '모델', 'S/N', '범위/정도', '최근교정', '차기교정', '교정기관', '상태', '위치'].map(h => <TH key={h}>{h}</TH>)}
              </tr>
            </thead>
            <tbody>
              {INSTRUMENTS.map(i => (
                <tr key={i.id}>
                  <TD mono color="var(--moss)">{i.id}</TD>
                  <TD><span className="font-medium">{i.name}</span></TD>
                  <TD color="var(--ink-mute)">{i.model}</TD>
                  <TD mono color="var(--ink-faint)">{i.serial}</TD>
                  <TD color="var(--ink-faint)">{i.range}</TD>
                  <TD mono color="var(--ink-faint)">{i.lastCalib}</TD>
                  <TD mono color={i.status === '교정임박' ? '#b45309' : 'var(--ink-faint)'}>{i.nextCalib}</TD>
                  <TD color="var(--ink-faint)">{i.calibBody}</TD>
                  <TD><Badge text={i.status} tone={i.status === '사용가능' ? 'green' : i.status === '교정임박' ? 'amber' : 'red'} /></TD>
                  <TD color="var(--ink-faint)">{i.location}</TD>
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
  const TYPE_COLOR = { PM: 'blue', '수리': 'amber', '교정': 'green' }
  return (
    <div>
      <SectionTitle breadcrumb="설비 이력 관리">설비 이력 관리</SectionTitle>
      <div className="space-y-3">
        {EQP_HISTORY.map(h => (
          <div key={h.id} className="card-base p-4">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="font-mono text-[11.5px] font-medium" style={{ color: 'var(--moss)' }}>{h.id}</span>
              <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{h.date}</span>
              <Badge text={h.eqp} tone="gray" />
              <Badge text={h.type} tone={TYPE_COLOR[h.type] || 'gray'} />
              <Badge text={h.result} tone={statusTone(h.result)} />
            </div>
            <div className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{h.name}</div>
            <div className="text-[12.5px] mt-1" style={{ color: 'var(--ink-mute)' }}>{h.desc}</div>
            <div className="mt-2 flex items-center gap-4 text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
              <span>담당: {h.technician}</span>
              <span>다음 예정: {h.next}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScheduleView() {
  const urgent = CALIB_SCHEDULE.filter(c => c.status === '긴급' || c.status === '임박')
  return (
    <div>
      <SectionTitle breadcrumb="교정 일정 관리">교정 일정 관리</SectionTitle>
      {urgent.length > 0 && (
        <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ background: 'var(--rust-soft)', border: '1px solid var(--rust)' }}>
          <AlertTriangle size={14} style={{ color: 'var(--rust)', marginTop: 2, flexShrink: 0 }} />
          <div className="text-[12.5px]" style={{ color: 'var(--rust)' }}>
            <b>{urgent.length}건 즉시 조치 필요</b> — 교정 초과·임박 장비는 사용 전 교정 완료 (ISO 13485 §7.6)
          </div>
        </div>
      )}
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>교정 예정 일정 (오름차순)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>{['장비ID', '장비명', '교정 예정일', 'D-day', '교정기관', '상태'].map(h => <TH key={h}>{h}</TH>)}</tr>
            </thead>
            <tbody>
              {CALIB_SCHEDULE.map(c => (
                <tr key={c.eqp}>
                  <TD mono color="var(--moss)">{c.eqp}</TD>
                  <TD><span className="font-medium">{c.name}</span></TD>
                  <TD mono color="var(--ink-faint)">{c.dueDate}</TD>
                  <TD mono color={c.status === '긴급' ? 'var(--rust)' : c.status === '임박' ? '#b45309' : 'var(--ink-faint)'}>
                    <b>{c.dday}</b>
                  </TD>
                  <TD color="var(--ink-mute)">{c.body}</TD>
                  <TD><Badge text={c.status} tone={c.status === '긴급' ? 'red' : c.status === '임박' ? 'amber' : 'gray'} /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── 메인 허브 ─── */
export default function EquipmentHub() {
  const user = auth.current()
  const [view, setView] = useState('home')

  const viewMap = {
    home: <EqpHome onNavigate={setView} />,
    instruments: <InstrumentsView />,
    history: <HistoryView />,
    schedule: <ScheduleView />,
  }

  const tabLabels = {
    instruments: '설비·계측기 목록',
    history: '설비 이력 관리',
    schedule: '교정 일정 관리',
  }

  return (
    <AppLayout user={user} title="설비·교정" subtitle="계측기 · 생산설비 · 교정 이력 관리">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {view !== 'home' && (
          <button onClick={() => setView('home')}
            className="flex items-center gap-1.5 mb-5 text-[13px] hover:underline"
            style={{ color: 'var(--moss)' }}>
            <ArrowLeft size={14} /> 설비·교정 홈
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
