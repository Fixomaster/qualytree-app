// src/pages/measurement-plan/MeasurementPlanHub.jsx
// ISO 13485 §8.1 — 측정, 분석 및 개선의 계획
//
// 개편 사유(#277-279): 기존에는 "측정 항목"을 이 화면에서 수기로 별도 등록했으나,
// 실제로는 카테고리별 측정 데이터가 이미 각 전담 허브(NCR·CAPA, 고객불만, 내부감사,
// 공급업체평가, 설비교정, 리스크관리, CAPA개선, 검사 등)에 실기록으로 존재해 중복
// 입력이 되고 있었다. 이에 "측정 항목"은 수기 등록을 없애고, §8.1이 요구하는 9개
// 측정 영역이 실제 어느 화면에서 다뤄지고 있는지 실시간 건수와 함께 보여주는
// 읽기 전용 안내 색인으로 전환한다. §8.1 계획 문서는 그대로 유지하되(회사 고유의
// 서술형 절차 내용이라 다른 화면에서 파생할 SSoT가 없음), 일반 사용자에게는 항상
// 열람 전용으로 보이고 편집은 관리자만 가능하도록 명확히 한다.
import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Edit2, Save, X, Trash2, CheckCircle2, AlertTriangle,
  Target, TrendingUp, ClipboardList, ExternalLink, Eye,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

// ── 상수 ─────────────────────────────────────────────────────
const LS_KEY_PLAN = 'qualytree.measurement_plan'

function lsCount(k) { try { return (JSON.parse(localStorage.getItem(k) || '[]') || []).length } catch { return 0 } }

// §8.1이 요구하는 9개 측정 영역 — 각 영역은 이미 전담 허브에서 실제 데이터로 관리되므로
// 여기서는 수기 중복 등록 없이 해당 허브로 안내하고 실시간 건수만 보여준다.
const MEASURE_AREAS = [
  { key: 'product',     label: '제품 적합성',    clause: '§8.2.3/8.2.4', color: '#2563EB', bg: '#DBEAFE', path: '/inspection',      pathLabel: '공정·최종 검사', countKey: 'qualytree.inspections' },
  { key: 'process',     label: '공정 모니터링',  clause: '§8.2.3',       color: '#7C3AED', bg: '#EDE9FE', path: '/manufacturing',   pathLabel: '생산 현황' },
  { key: 'customer',    label: '고객 만족',      clause: '§8.2.1',       color: '#059669', bg: '#D1FAE5', path: '/complaints',      pathLabel: '고객불만 관리', countKey: 'qualytree.complaints' },
  { key: 'audit',       label: '내부 감사',      clause: '§8.2.2',       color: '#D97706', bg: '#FEF3C7', path: '/audit',           pathLabel: '내부감사', countKey: 'qualytree.audits' },
  { key: 'qms',         label: 'QMS 성과',       clause: '§8.2/8.4',     color: '#DC2626', bg: '#FEE2E2', path: '/kpi-dashboard',   pathLabel: '품질 KPI', countKeys: ['qualytree.ncrs', 'qualytree.capas'] },
  { key: 'supplier',    label: '공급업체 성과',  clause: '§7.4',         color: '#0891B2', bg: '#CFFAFE', path: '/supplier',        pathLabel: '공급업체 관리', countKey: 'qualytree.supplier_evals' },
  { key: 'equipment',   label: '설비·교정',      clause: '§7.6',         color: '#6366F1', bg: '#E0E7FF', path: '/calibration',     pathLabel: '교정관리', countKey: 'qualytree.calibrations' },
  { key: 'risk',        label: '위험 관리',      clause: 'ISO 14971',    color: '#EA580C', bg: '#FFEDD5', path: '/risk',            pathLabel: '리스크관리', countKey: 'qualytree.risks' },
  { key: 'improvement', label: '개선 활동',      clause: '§8.5',         color: '#16A34A', bg: '#DCFCE7', path: '/improvement',     pathLabel: 'CAPA·개선', countKey: 'qualytree.improvements' },
]

function today() { return new Date().toISOString().slice(0, 10) }

// §8.1 계획 문서 기본값
const DEFAULT_PLAN = {
  revision: 'Rev.0', issueDate: '', approvedBy: '', reviewDate: '',
  scope: '',
  objectives: '',
  improvementApproach: '',
  statisticalRationale: '',
  revisionHistory: [],
}

export default function MeasurementPlanHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2
  const nav = useNavigate()

  const [plan, setPlan] = useState(() => {
    try { return { ...DEFAULT_PLAN, ...JSON.parse(localStorage.getItem(LS_KEY_PLAN) || '{}') } } catch { return DEFAULT_PLAN }
  })
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState('plan') // plan | areas

  function savePlan() {
    const updated = { ...draft }
    setPlan(updated)
    localStorage.setItem(LS_KEY_PLAN, JSON.stringify(updated))
    setEditing(false); setDraft(null)
  }
  function startEdit() { setDraft({ ...plan }); setEditing(true) }
  function cancelEdit() { setEditing(false); setDraft(null) }
  const D = (k, v) => setDraft(d => ({ ...d, [k]: v }))

  // 실제 각 영역 허브에 기록이 존재하는지 실시간 카운트
  const areaCounts = useMemo(() => MEASURE_AREAS.map(a => {
    let count = null
    if (a.countKey) count = lsCount(a.countKey)
    else if (a.countKeys) count = a.countKeys.reduce((s, k) => s + lsCount(k), 0)
    return { ...a, count }
  }), [])

  // 완성도 — 계획 문서 서술 항목 + 실제 데이터가 존재하는 측정 영역 비율
  const completeness = useMemo(() => {
    const areasWithData = areaCounts.filter(a => a.count === null || a.count > 0).length
    const checks = [
      { label: '계획 범위 기술', ok: !!plan.scope },
      { label: '측정 목적 기술', ok: !!plan.objectives },
      { label: '개선 접근 방법', ok: !!plan.improvementApproach },
      { label: `측정 영역 ${areaCounts.length}개 중 데이터 존재`, ok: areasWithData === areaCounts.length, detail: `${areasWithData}/${areaCounts.length}` },
    ]
    const done = checks.filter(c => c.ok).length
    return { checks, done, total: checks.length, pct: Math.round((done / checks.length) * 100) }
  }, [plan, areaCounts])

  return (
    <AppLayout user={user} title="측정·분석·개선 계획" subtitle="ISO 13485 §8.1 — 측정·모니터링·분석·개선 활동의 계획">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        {/* 완성도 배지 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-bold"
            style={{ background: completeness.pct >= 80 ? '#D1FAE5' : '#FEF3C7', color: completeness.pct >= 80 ? '#065F46' : '#92400E' }}>
            {completeness.pct >= 80 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            §8.1 이행 {completeness.pct}% ({completeness.done}/{completeness.total})
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'plan',  label: '§8.1 계획 문서' },
            { key: 'areas', label: `측정 영역 (${MEASURE_AREAS.length})` },
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

        {/* ── 계획 문서 탭 ── */}
        {tab === 'plan' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <Eye size={14} style={{ color: '#1E40AF' }} />
              <span className="text-[12.5px] font-semibold" style={{ color: '#1E40AF' }}>
                본 계획 문서는 열람 전용이며, 관리자만 수정할 수 있습니다. 배포용 공식 절차서는 문서관리에서 관리하세요.
              </span>
              <button onClick={() => nav('/document-control')} className="flex items-center gap-1 ml-auto text-[12px] font-bold px-2.5 py-1 rounded-lg"
                style={{ background: '#1E40AF', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <ExternalLink size={12} /> 문서관리로 이동
              </button>
            </div>

            {canEdit && !editing && (
              <div className="flex justify-end">
                <button onClick={startEdit} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Edit2 size={13} /> 편집
                </button>
              </div>
            )}
            {editing && (
              <div className="flex gap-2 justify-end">
                <button onClick={savePlan} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Save size={13} /> 저장
                </button>
                <button onClick={cancelEdit} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                  <X size={13} /> 취소
                </button>
              </div>
            )}

            {/* 기본 정보 */}
            <PlanSection icon={<ClipboardList size={15} />} title="계획 기본 정보" accent="#2563EB">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <PF label="개정 번호" value={editing ? draft.revision : plan.revision} onChange={v => D('revision', v)} editing={editing} />
                <PF label="발행일" type="date" value={editing ? draft.issueDate : plan.issueDate} onChange={v => D('issueDate', v)} editing={editing} />
                <PF label="승인자" value={editing ? draft.approvedBy : plan.approvedBy} onChange={v => D('approvedBy', v)} editing={editing} />
                <PF label="차기 검토일" type="date" value={editing ? draft.reviewDate : plan.reviewDate} onChange={v => D('reviewDate', v)} editing={editing} />
              </div>
            </PlanSection>

            {/* §8.1 핵심 계획 내용 */}
            <PlanSection icon={<Target size={15} />} title="§8.1 측정·분석·개선 계획" accent="#7C3AED">
              <div className="space-y-4">
                <PF label="적용 범위" value={editing ? draft.scope : plan.scope} onChange={v => D('scope', v)} editing={editing} multiline rows={2}
                  placeholder="본 계획은 당사 QMS의 모든 측정·분석·개선 활동에 적용된다..." />
                <PF label="목적 및 의도" value={editing ? draft.objectives : plan.objectives} onChange={v => D('objectives', v)} editing={editing} multiline rows={3}
                  placeholder="측정·분석·개선 활동의 목적: (a) 제품 적합성 실증, (b) QMS 적합성 보장, (c) 효과성 지속적 개선..." />
                <PF label="§8.1 통계적 기법 선택 근거" value={editing ? draft.statisticalRationale : plan.statisticalRationale} onChange={v => D('statisticalRationale', v)} editing={editing} multiline rows={2}
                  placeholder="AQL 샘플링: 수입검사 적용 (KS Q ISO 2859-1), SPC: 핵심 공정 파라미터 관리, 기초 통계: 고객 만족도 및 불만 추세 분석..." />
                <PF label="§8.5.1 지속적 개선 접근 방법" value={editing ? draft.improvementApproach : plan.improvementApproach} onChange={v => D('improvementApproach', v)} editing={editing} multiline rows={2}
                  placeholder="품질 방침·목표 검토, CAPA, 내부감사 결과, 경영검토를 통한 개선 기회 식별 및 실행..." />
              </div>
            </PlanSection>

            {/* 개정 이력 */}
            <PlanSection icon={<TrendingUp size={15} />} title="개정 이력" accent="#6B7280">
              {editing ? (
                <RevisionEditor list={draft.revisionHistory || []} onChange={v => D('revisionHistory', v)} />
              ) : (
                (plan.revisionHistory || []).length === 0
                  ? <p className="text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>개정 이력이 없습니다.</p>
                  : <table className="w-full text-[12px]">
                      <thead><tr style={{ background: 'var(--bg-soft)' }}>
                        {['개정', '일자', '내용', '작성자'].map(h => (
                          <th key={h} className="px-3 py-2 text-left" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>{(plan.revisionHistory || []).map((r, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                          <td className="px-3 py-2">{r.rev}</td><td className="px-3 py-2">{r.date}</td>
                          <td className="px-3 py-2">{r.desc}</td><td className="px-3 py-2">{r.by}</td>
                        </tr>
                      ))}</tbody>
                    </table>
              )}
            </PlanSection>
          </div>
        )}

        {/* ── 측정 영역 탭 (읽기 전용 색인) ── */}
        {tab === 'areas' && (
          <div>
            <div className="mb-4 p-3 rounded-xl text-[12.5px]" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <span style={{ color: '#1E40AF' }}>
                §8.1이 요구하는 9개 측정 영역은 각각 전담 허브에서 실제 데이터로 관리됩니다. 이 화면에서 별도로 등록하지 않고, 아래에서 해당 허브로 바로 이동해 확인·기록하세요.
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {areaCounts.map(a => (
                <div key={a.key} onClick={() => nav(a.path)} className="p-4 rounded-2xl cursor-pointer transition"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = a.color }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: a.bg, color: a.color }}>{a.clause}</span>
                    {a.count !== null && (
                      <span className="text-[11px] font-bold" style={{ color: a.count > 0 ? '#059669' : '#DC2626' }}>
                        {a.count > 0 ? `${a.count}건 기록됨` : '기록 없음'}
                      </span>
                    )}
                  </div>
                  <div className="text-[14px] font-bold mb-1" style={{ color: 'var(--ink)' }}>{a.label}</div>
                  <div className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                    <ExternalLink size={11} /> {a.pathLabel}로 이동
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

// ── 공통 컴포넌트 ─────────────────────────────────────────────
function PlanSection({ icon, title, accent, children }) {
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

function PF({ label, value, onChange, editing, type = 'text', multiline, rows = 2, placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      {editing ? (
        multiline
          ? <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
              className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
          : <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
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

function RevisionEditor({ list, onChange }) {
  const [row, setRow] = useState({ rev: '', date: today(), desc: '', by: '' })
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        {[['rev', '개정 번호'], ['date', '일자'], ['desc', '개정 내용'], ['by', '작성자']].map(([k, l]) => (
          <input key={k} type={k === 'date' ? 'date' : 'text'} value={row[k]}
            onChange={e => setRow(r => ({ ...r, [k]: e.target.value }))} placeholder={l}
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
            {['개정', '일자', '내용', '작성자', ''].map(h => (
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
