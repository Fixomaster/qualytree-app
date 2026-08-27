// src/pages/qms-overview/QmsOverviewHub.jsx
// QMS 개요 — 품질매뉴얼 데이터 읽기 전용 뷰어 (ISO 13485 §4.1 / §4.2.1)
// 데이터 입력: /quality-manual (품질매뉴얼 관리 허브)
import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Edit2, Building2, Target, ShieldCheck,
  ArrowRight, FileText, Users, GitBranch, AlertTriangle,
  CheckCircle2, Clock, ChevronRight, Layers, Star,
  ExternalLink, LayoutDashboard } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

const LS_KEY = 'qualytree.quality_manual'

const PROCESS_INTERACTIONS = [
  { from: '고객 요구사항',   to: '품질 계획' },
  { from: '품질 계획',       to: '설계·개발' },
  { from: '설계·개발',       to: '구매' },
  { from: '구매',            to: '수입검사 (IQC)' },
  { from: '수입검사 (IQC)',  to: '생산·서비스' },
  { from: '생산·서비스',     to: '공정 검사' },
  { from: '공정 검사',       to: '최종 검사·출하' },
  { from: '최종 검사·출하',  to: '고객' },
  { from: '고객',            to: '고객불만·피드백' },
  { from: '고객불만·피드백', to: 'CAPA·개선' },
  { from: 'CAPA·개선',       to: '경영 검토' },
]

function ls() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') } catch { return null }
}

function Section({ icon: Icon, title, color = 'var(--moss)', children, action }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--line)', background: `${color}08` }}>
        <div className="flex items-center gap-2">
          <Icon size={15} style={{ color }} />
          <span className="font-semibold text-[13.5px]" style={{ color: 'var(--ink)' }}>{title}</span>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, empty = '미입력' }) {
  const isEmpty = !value || (Array.isArray(value) && value.length === 0)
  return (
    <div className="flex gap-3 py-2" style={{ borderBottom: '1px solid var(--line)' }}>
      <span className="text-[11.5px] font-mono w-32 flex-shrink-0 pt-0.5" style={{ color: 'var(--ink-faint)' }}>{label}</span>
      <span className="text-[13px] flex-1" style={{ color: isEmpty ? 'var(--ink-faint)' : 'var(--ink)', fontStyle: isEmpty ? 'italic' : 'normal' }}>
        {isEmpty ? empty : (Array.isArray(value) ? value.join(', ') : value)}
      </span>
    </div>
  )
}

function EmptyPrompt({ nav }) {
  return (
    <div className="rounded-2xl flex flex-col items-center py-16 text-center"
      style={{ background: 'var(--bg-card)', border: '2px dashed var(--line)' }}>
      <BookOpen size={36} style={{ color: 'var(--ink-faint)', opacity: 0.4, marginBottom: 12 }} />
      <div className="font-semibold text-[15px] mb-2" style={{ color: 'var(--ink-soft)' }}>품질매뉴얼 데이터가 없습니다</div>
      <div className="text-[13px] mb-5" style={{ color: 'var(--ink-faint)' }}>
        품질매뉴얼 관리 허브에서 내용을 입력하면 여기에 표시됩니다
      </div>
      <button onClick={() => nav('/quality-manual')}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-medium"
        style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
        <Edit2 size={14} /> 품질매뉴얼 입력하러 가기
      </button>
    </div>
  )
}

export default function QmsOverviewHub() {
  const nav = useNavigate()
  const user = auth.current()
  const isAdmin = user?.identityKind === 'operator' || user?.isCompanyAdmin === true

  const manual = useMemo(() => ls(), [])

  const hasData = manual && (
    manual.companyName || manual.scope || manual.qualityPolicy || manual.deviceTypes
  )

  const processNodes = useMemo(() => {
    const nodes = new Set()
    PROCESS_INTERACTIONS.forEach(p => { nodes.add(p.from); nodes.add(p.to) })
    return [...nodes]
  }, [])

  const EditBtn = () => isAdmin ? (
    <button onClick={() => nav('/quality-manual')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
      style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
      <Edit2 size={12} /> 수정
    </button>
  ) : null

  return (
    <AppLayout user={user} title="QMS 개요" subtitle="ISO 13485 §4.1 · §4.2.1 — 품질경영시스템 현황">
      <HubBanner icon={LayoutDashboard} title="QMS 개요" subtitle="ISO 13485 §4.1" color="slate" />
      <div className="px-6 lg:px-8 py-6 max-w-[960px] mx-auto space-y-5">

        <div className="rounded-2xl p-5 flex items-center justify-between gap-4"
          style={{ background: 'linear-gradient(135deg, #10B98108, #3B82F608)', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#10B98115' }}>
              <Layers size={22} style={{ color: '#10B981' }} />
            </div>
            <div>
              <div className="font-bold text-[16px]" style={{ color: 'var(--ink)' }}>
                {hasData && manual.companyName ? manual.companyName : '품질경영시스템'} 개요
              </div>
              <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                {hasData
                  ? `${manual.manualNo || 'QM-001'} · ${manual.revision || 'Rev.0'} · 시행일 ${manual.effectiveDate || '-'}`
                  : 'ISO 13485 §4.1 / §4.2.1 — 품질경영시스템 현황 요약'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <button onClick={() => nav('/quality-manual')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium"
                style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <Edit2 size={14} /> 품질매뉴얼 수정
              </button>
            )}
          </div>
        </div>

        {!hasData ? <EmptyPrompt nav={nav} /> : (
          <>
            <Section icon={Building2} title="기본 정보" color="#6366F1" action={<EditBtn />}>
              <div className="divide-y" style={{ borderTop: '1px solid var(--line)' }}>
                <InfoRow label="회사명" value={manual.companyName} />
                <InfoRow label="문서번호" value={manual.manualNo} />
                <InfoRow label="제목" value={manual.title} />
                <InfoRow label="개정번호" value={manual.revision} />
                <InfoRow label="발행일" value={manual.issueDate} />
                <InfoRow label="시행일" value={manual.effectiveDate} />
                <InfoRow label="작성자" value={manual.preparedBy} />
                <InfoRow label="검토자" value={manual.reviewedBy} />
                <InfoRow label="승인자" value={manual.approvedBy} />
              </div>
            </Section>

            <Section icon={Target} title="QMS 적용 범위 (§4.2.1(a))" color="#3B82F6" action={<EditBtn />}>
              <div className="space-y-4">
                {manual.scope ? (
                  <div className="p-4 rounded-xl text-[13.5px] leading-relaxed whitespace-pre-wrap"
                    style={{ background: 'var(--bg-soft)', color: 'var(--ink)', border: '1px solid var(--line)' }}>
                    {manual.scope}
                  </div>
                ) : (
                  <div className="text-[13px] italic" style={{ color: 'var(--ink-faint)' }}>범위 미입력</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                    <div className="text-[10.5px] font-mono mb-1.5" style={{ color: 'var(--ink-faint)' }}>적용 의료기기</div>
                    <div className="text-[13px]" style={{ color: manual.deviceTypes ? 'var(--ink)' : 'var(--ink-faint)', fontStyle: manual.deviceTypes ? 'normal' : 'italic' }}>
                      {manual.deviceTypes || '미입력'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                    <div className="text-[10.5px] font-mono mb-1.5" style={{ color: 'var(--ink-faint)' }}>기기 등급</div>
                    <div className="text-[13px]" style={{ color: (manual.deviceClasses || []).length ? 'var(--ink)' : 'var(--ink-faint)', fontStyle: (manual.deviceClasses || []).length ? 'normal' : 'italic' }}>
                      {(manual.deviceClasses || []).length ? manual.deviceClasses.join(', ') : '미입력'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                    <div className="text-[10.5px] font-mono mb-1.5" style={{ color: 'var(--ink-faint)' }}>조직 활동</div>
                    <div className="text-[13px]" style={{ color: manual.activities ? 'var(--ink)' : 'var(--ink-faint)', fontStyle: manual.activities ? 'normal' : 'italic' }}>
                      {manual.activities || '미입력'}
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {manual.qualityPolicy ? (
              <Section icon={Star} title="품질 방침 (§5.3)" color="#F59E0B" action={<EditBtn />}>
                <div className="p-4 rounded-xl text-[14px] leading-relaxed whitespace-pre-wrap font-medium"
                  style={{ background: '#FEF3C720', color: 'var(--ink)', border: '1px solid #F59E0B30', lineHeight: 1.8 }}>
                  {manual.qualityPolicy}
                </div>
              </Section>
            ) : (
              <Section icon={Star} title="품질 방침 (§5.3)" color="#F59E0B" action={<EditBtn />}>
                <div className="text-[13px] italic" style={{ color: 'var(--ink-faint)' }}>품질 방침 미입력</div>
              </Section>
            )}

            <Section icon={AlertTriangle} title="제외 사항 (§4.2.1(b))" color="#EF4444" action={<EditBtn />}>
              {!manual.hasExclusions ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} style={{ color: '#10B981' }} />
                  <span className="text-[13px]" style={{ color: '#10B981', fontWeight: 500 }}>제외 사항 없음 — 전체 조항 적용</span>
                </div>
              ) : (manual.exclusions || []).length === 0 ? (
                <div className="text-[13px] italic" style={{ color: 'var(--ink-faint)' }}>제외 항목 미등록</div>
              ) : (
                <div className="space-y-2">
                  {manual.exclusions.map((ex, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl" style={{ background: '#FEF2F2', border: '1px solid #EF444420' }}>
                      <span className="text-[12px] font-bold px-2 py-0.5 rounded" style={{ background: '#EF444415', color: '#EF4444', flexShrink: 0 }}>§{ex.clause}</span>
                      <span className="text-[13px]" style={{ color: 'var(--ink)' }}>{ex.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section icon={GitBranch} title="프로세스 상호작용 (§4.1)" color="#8B5CF6">
              <div className="flex flex-wrap items-center gap-1.5">
                {PROCESS_INTERACTIONS.map((step, i) => (
                  <React.Fragment key={i}>
                    {i === 0 && (
                      <span className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium"
                        style={{ background: '#8B5CF615', color: '#8B5CF6', border: '1px solid #8B5CF625' }}>
                        {step.from}
                      </span>
                    )}
                    <ArrowRight size={13} style={{ color: 'var(--ink-faint)' }} />
                    <span className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium"
                      style={{
                        background: i === PROCESS_INTERACTIONS.length - 1 ? '#10B98115' : '#8B5CF615',
                        color: i === PROCESS_INTERACTIONS.length - 1 ? '#10B981' : '#8B5CF6',
                        border: `1px solid ${i === PROCESS_INTERACTIONS.length - 1 ? '#10B98125' : '#8B5CF625'}`,
                      }}>
                      {step.to}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              {manual.processNotes && (
                <div className="mt-3 p-3 rounded-xl text-[12.5px]"
                  style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}>
                  <span className="font-mono text-[11px] mr-2" style={{ color: 'var(--ink-faint)' }}>비고</span>
                  {manual.processNotes}
                </div>
              )}
            </Section>

            {(manual.procedureRefs || []).length > 0 && (
              <Section icon={FileText} title="문서화된 절차 참조 (§4.2.1(c))" color="#3B82F6" action={<EditBtn />}>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--line)' }}>
                        {['문서번호', '제목', '해당 조항', '절차서 코드'].map(h => (
                          <th key={h} className="text-left py-2 pr-4 font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {manual.procedureRefs.map((ref, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                          <td className="py-2 pr-4 font-mono" style={{ color: 'var(--ink-soft)' }}>{ref.docNo}</td>
                          <td className="py-2 pr-4" style={{ color: 'var(--ink)' }}>{ref.title}</td>
                          <td className="py-2 pr-4" style={{ color: 'var(--ink-faint)' }}>§{ref.clause}</td>
                          <td className="py-2 pr-4" style={{ color: 'var(--ink-soft)' }}>{ref.sop}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {(manual.distributionList || []).length > 0 && (
              <Section icon={Users} title="배포 목록" color="#10B981" action={<EditBtn />}>
                <div className="flex flex-wrap gap-2">
                  {manual.distributionList.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                      <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>{d.name}</span>
                      <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{d.dept}</span>
                      {d.copyNo && <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: '#10B98115', color: '#10B981' }}>#{d.copyNo}</span>}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {(manual.revisionHistory || []).length > 0 && (
              <Section icon={Clock} title="개정 이력" color="#6B7280">
                <div className="space-y-2">
                  {[...manual.revisionHistory].reverse().map((r, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: i === 0 ? 'var(--leaf-soft)' : 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded font-mono flex-shrink-0 mt-0.5"
                        style={{ background: i === 0 ? 'var(--moss)' : 'var(--bg-card)', color: i === 0 ? '#fff' : 'var(--ink-soft)', border: '1px solid var(--line)' }}>
                        {r.rev}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>{r.description}</span>
                          {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'var(--moss)', color: '#fff' }}>최신</span>}
                        </div>
                        <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                          {r.date} · {r.by}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[12px] font-semibold mb-3" style={{ color: 'var(--ink-faint)' }}>관련 메뉴 바로가기</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: '품질매뉴얼 수정', to: '/quality-manual', color: '#3B82F6' },
                  { label: '문서 관리', to: '/document-control', color: '#6366F1' },
                  { label: '의료기기 파일', to: '/device-file', color: '#8B5CF6' },
                  { label: '경영 의지·품질방침', to: '/management-commitment', color: '#10B981' },
                ].map(l => (
                  <button key={l.to} onClick={() => nav(l.to)}
                    className="flex items-center justify-between p-3 rounded-xl text-left"
                    style={{ background: `${l.color}08`, border: `1px solid ${l.color}20`, cursor: 'pointer' }}>
                    <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>{l.label}</span>
                    <ExternalLink size={11} style={{ color: l.color }} />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
