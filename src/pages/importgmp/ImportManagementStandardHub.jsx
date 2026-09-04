import React, { useState, useEffect } from 'react'
import { FileText, ChevronRight, CheckCircle, Circle, ExternalLink, Printer, AlertCircle, BookOpen } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { useNavigate } from 'react-router-dom'

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_KEY = 'qualytree.import_management_standard'
function loadStandard() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch { return {} }
}
function saveStandard(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

// ── section registry ──────────────────────────────────────────────────────────
const PHASES = [
  { id: 'basic',    label: '기본 요건' },
  { id: 'supply',   label: '공급망 관리' },
  { id: 'clearance',label: '수입통관' },
  { id: 'post',     label: '사후 관리' },
  { id: 'record',   label: '기록 보존' },
]

const SECTIONS = [
  {
    key: 'scope', phase: 'basic',
    label: '1. 적용 범위',
    kgmpRef: '수입품질관리기준 §1',
    relatedHub: null,
    placeholder: '이 기준서가 적용되는 수입 의료기기 품목, 대상 업무, 적용 법령을 기술합니다.',
    guidance: [
      '식품의약품안전처 고시 「의료기기 수입품질관리기준」에 따른 적용 범위',
      '적용 대상: 회사가 수입하는 모든 의료기기 (예외 품목 명시)',
      '관련 법령: 의료기기법, 의료기기 수입관리기준 고시',
    ],
  },
  {
    key: 'organization', phase: 'basic',
    label: '2. 조직 및 책임',
    kgmpRef: '수입품질관리기준 §3',
    relatedHub: null,
    placeholder: '수입 업무 담당 조직구조, 책임자 지정, 품질책임자 역할을 기술합니다.',
    guidance: [
      '대표이사: 수입품질관리 총괄 책임',
      '품질책임자(QP): 수입 심사·승인·이상사례 보고 책임',
      '수입담당자: 통관서류 관리, 수입검사 실시, 기록 유지',
    ],
  },
  {
    key: 'siteSelection', phase: 'supply',
    label: '3. 외국제조소 선정·관리',
    kgmpRef: '수입품질관리기준 §4',
    relatedHub: '/foreign-manufacturer',
    placeholder: '외국 제조소 선정 기준, GMP 적합성 평가, 정기 재평가 주기를 기술합니다.',
    guidance: [
      '외국제조소 GMP 인증서 확인 (CE, FDA 510k, ISO 13485 등)',
      '제조소 현장실사 또는 서류 심사 기준',
      '평가 등급 기준 (A/B/C) 및 후속 조치 기준',
      '정기 재평가 주기: 최소 2년 1회 이상',
    ],
  },
  {
    key: 'licenseManagement', phase: 'supply',
    label: '4. 인허가·변경관리',
    kgmpRef: '의료기기법 §15, §26',
    relatedHub: '/regulatory',
    placeholder: '수입 허가·인증 유지 관리, 변경사항 신고 절차를 기술합니다.',
    guidance: [
      '품목허가(신고) 유효기간 관리 및 갱신 절차',
      '변경허가·변경신고 대상 사항 목록',
      '외국 제조소 변경 시 국내 허가 변경 연동 절차',
      '인허가 만료 60일 전 사전 갱신 착수 원칙',
    ],
  },
  {
    key: 'clearanceInspection', phase: 'clearance',
    label: '5. 통관 및 수입검사',
    kgmpRef: '수입품질관리기준 §5, §6',
    relatedHub: '/import-clearance',
    placeholder: '수입통관 절차, 수입검사 방법, 검사 기준 및 불합격 처리를 기술합니다.',
    guidance: [
      '수입신고 서류: 품목허가서, 거래명세서, COA, COC',
      '수입검사 항목: 외관검사, 표시사항, 유통기한, 포장 상태',
      '관능검사/정밀검사 기준 및 샘플링 방법 (AQL 등)',
      '부적합 판정 시 격리·폐기·반송 처리 절차',
    ],
  },
  {
    key: 'storageDistribution', phase: 'clearance',
    label: '6. 보관 및 유통',
    kgmpRef: '수입품질관리기준 §7',
    relatedHub: null,
    placeholder: '수입품 보관 조건, 유통 온도 관리, 추적성 유지 방법을 기술합니다.',
    guidance: [
      '보관 조건: 온도·습도·빛 차단 요건 (품목별 명시)',
      '선입선출(FIFO) 원칙 준수',
      '추적성: 로트번호 → 수입일자 → 거래처 역추적 가능',
      '콜드체인 의료기기 온도이력 기록 보관',
    ],
  },
  {
    key: 'complaintReporting', phase: 'post',
    label: '7. 고객불만·이상사례',
    kgmpRef: '의료기기법 §31, §32',
    relatedHub: null,
    placeholder: '고객불만 접수·처리 절차, 이상사례(MDR) 보고 기준을 기술합니다.',
    guidance: [
      '고객불만 접수 후 15일 이내 초기 조사 완료',
      'MDR 보고 기준: 사망·중상해 유발 또는 유발 우려 시',
      '중대한 이상사례: 식약처 30일 이내 보고',
      '외국 제조소에 이상사례 정보 전달 및 피드백 관리',
    ],
  },
  {
    key: 'recall', phase: 'post',
    label: '8. 회수(Recall) 관리',
    kgmpRef: '의료기기법 §34',
    relatedHub: null,
    placeholder: '자발적·행정명령 회수 절차, 회수 등급 판정, 보고·추적 방법을 기술합니다.',
    guidance: [
      '회수 등급: Class I(72시간), II(10일), III(30일) 이내 완료',
      '회수 대상 로트 추적 및 고객 통보 절차',
      '식약처 회수계획 사전 신고 및 회수 종료 보고',
      '회수 제품 격리·폐기 또는 제조소 반송 처리',
    ],
  },
  {
    key: 'recordKeeping', phase: 'record',
    label: '9. 기록 관리·보존',
    kgmpRef: '수입품질관리기준 §10',
    relatedHub: null,
    placeholder: '수입 관련 기록의 종류, 보존 기간, 전자기록 관리 방법을 기술합니다.',
    guidance: [
      '보존 기간: 제품 유통기한 + 2년 이상 (최소 3년)',
      '전자기록: 백업 절차, 접근권한 관리',
      '기록 종류: 수입검사 기록, 통관서류, 이상사례 보고서, 회수 기록',
      '외부 감사 시 72시간 이내 제출 가능 체계 유지',
    ],
  },
]

const STATUS_CFG = {
  draft:    { label: '미작성',  color: '#6B7280', bg: '#F3F4F6' },
  inprogress:{ label: '작성 중', color: '#D97706', bg: '#FEF3C7' },
  review:   { label: '검토 중', color: '#2563EB', bg: '#DBEAFE' },
  approved: { label: '승인완료', color: '#059669', bg: '#D1FAE5' },
}

// ── main component ─────────────────────────────────────────────────────────────
export default function ImportManagementStandardHub() {
  const navigate = useNavigate()
  const [user, setUser]         = useState(null)
  const [standard, setStandard] = useState(loadStandard)
  const [activeKey, setActiveKey] = useState('scope')
  const [editing, setEditing]   = useState(false)
  const [draft, setDraft]       = useState('')

  useEffect(() => {
    const u = auth.current ? auth.current() : auth.getUser?.() || null
    setUser(u)
  }, [])

  const isAdmin = user?.user_metadata?.role === 'admin' || user?.user_metadata?.isAdmin

  function getSection(key) { return standard[key] || { content: '', status: 'draft' } }
  function persist(key, updates) {
    const updated = { ...standard, [key]: { ...getSection(key), ...updates, updatedAt: new Date().toISOString() } }
    setStandard(updated)
    saveStandard(updated)
  }

  function startEdit() {
    setDraft(getSection(activeKey).content || '')
    setEditing(true)
  }
  function saveEdit() {
    persist(activeKey, { content: draft, status: getSection(activeKey).status === 'draft' ? 'inprogress' : getSection(activeKey).status })
    setEditing(false)
  }

  // Completion stats
  const filled = SECTIONS.filter(s => (getSection(s.key).content || '').trim().length > 10).length
  const pct = Math.round((filled / SECTIONS.length) * 100)

  const activeSec = SECTIONS.find(s => s.key === activeKey)
  const activeData = getSection(activeKey)

  function printDoc() {
    const rows = SECTIONS.map(s => {
      const d = getSection(s.key)
      return `<h2 style="font-size:14px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-top:20px">${s.label}</h2>
      <p style="font-size:11px;color:#6b7280">KGMP 근거: ${s.kgmpRef}</p>
      <div style="font-size:13px;white-space:pre-wrap;margin-top:6px">${(d.content || '(미작성)').replace(/</g,'&lt;')}</div>`
    }).join('')
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>수입관리기준서</title>
    <style>body{font-family:'Malgun Gothic',sans-serif;padding:36px;color:#111}h1{font-size:20px;border-bottom:2px solid #1d4ed8;padding-bottom:8px}
    .meta{font-size:12px;color:#6b7280;margin-bottom:24px}@media print{button{display:none}}</style>
    </head><body><h1>수입관리기준서</h1>
    <div class="meta">출력일: ${new Date().toLocaleDateString('ko-KR')} &nbsp;|&nbsp; 작성 완료: ${filled}/${SECTIONS.length}개 섹션</div>
    ${rows}<script>setTimeout(()=>window.print(),400)</script></body></html>`)
    w.document.close()
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BookOpen size={28} color="#2563eb" />
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>수입관리기준서</h1>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>수입 의료기기 품질관리 기준 문서 | 수입품질관리기준 준거</p>
            </div>
          </div>
          <button onClick={printDoc} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            <Printer size={14} /> 전체 출력
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>작성 진척률</span>
            <span style={{ fontSize: 13, color: '#2563eb', fontWeight: 700 }}>{filled}/{SECTIONS.length}개 섹션 ({pct}%)</span>
          </div>
          <div style={{ height: 8, background: '#e0f2fe', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#2563eb', borderRadius: 4, transition: 'width 0.4s' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            {PHASES.map(ph => {
              const secs = SECTIONS.filter(s => s.phase === ph.id)
              const done = secs.filter(s => (getSection(s.key).content || '').trim().length > 10).length
              return (
                <span key={ph.id} style={{ fontSize: 12, color: done === secs.length ? '#059669' : '#6b7280' }}>
                  {done === secs.length ? '✓' : '○'} {ph.label} ({done}/{secs.length})
                </span>
              )
            })}
          </div>
        </div>

        {/* Main layout: section nav + editor */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* Section nav */}
          <div style={{ width: 240, flexShrink: 0 }}>
            {PHASES.map(ph => {
              const phaseSecs = SECTIONS.filter(s => s.phase === ph.id)
              return (
                <div key={ph.id} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, paddingLeft: 4 }}>{ph.label}</div>
                  {phaseSecs.map(sec => {
                    const d = getSection(sec.key)
                    const hasCnt = (d.content || '').trim().length > 10
                    const isActive = activeKey === sec.key
                    return (
                      <div
                        key={sec.key}
                        onClick={() => { setActiveKey(sec.key); setEditing(false) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '9px 10px', borderRadius: 7, cursor: 'pointer', marginBottom: 2,
                          background: isActive ? '#eff6ff' : 'transparent',
                          border: isActive ? '1px solid #bfdbfe' : '1px solid transparent',
                        }}
                      >
                        {hasCnt
                          ? <CheckCircle size={14} color="#10b981" style={{ flexShrink: 0 }} />
                          : <Circle size={14} color="#d1d5db" style={{ flexShrink: 0 }} />
                        }
                        <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? '#1d4ed8' : '#374151', flex: 1 }}>
                          {sec.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Section editor */}
          <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>

            {/* Section header */}
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{activeSec?.label}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                    KGMP 근거: {activeSec?.kgmpRef}
                    {activeSec?.relatedHub && (
                      <button
                        onClick={() => navigate(activeSec.relatedHub)}
                        style={{ marginLeft: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                      >
                        <ExternalLink size={11} /> 연관 허브 이동
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Status badge */}
                  {(() => {
                    const cfg = STATUS_CFG[activeData.status || 'draft']
                    return <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                  })()}
                  {isAdmin && !editing && (
                    <select
                      value={activeData.status || 'draft'}
                      onChange={e => persist(activeKey, { status: e.target.value })}
                      style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid #d1d5db' }}
                    >
                      {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Guidance panel */}
            <div style={{ padding: '12px 20px', background: '#fefce8', borderBottom: '1px solid #fde68a' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
                <AlertCircle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                작성 가이드
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {activeSec?.guidance.map((g, i) => (
                  <li key={i} style={{ fontSize: 12, color: '#78350f', lineHeight: 1.7 }}>{g}</li>
                ))}
              </ul>
            </div>

            {/* Content editor */}
            <div style={{ padding: 20 }}>
              {editing ? (
                <>
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder={activeSec?.placeholder}
                    rows={14}
                    style={{ width: '100%', padding: 12, border: '1px solid #93c5fd', borderRadius: 8, fontSize: 14, lineHeight: 1.7, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={saveEdit} style={{ padding: '8px 20px', borderRadius: 7, background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>저장</button>
                    <button onClick={() => setEditing(false)} style={{ padding: '8px 16px', borderRadius: 7, background: 'white', border: '1px solid #d1d5db', cursor: 'pointer', fontSize: 13 }}>취소</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    minHeight: 160, padding: 16, borderRadius: 8,
                    background: activeData.content ? 'white' : '#f9fafb',
                    border: '1px solid #e5e7eb',
                    fontSize: 14, lineHeight: 1.8, color: activeData.content ? '#111' : '#9ca3af',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {activeData.content || activeSec?.placeholder}
                  </div>
                  {activeData.updatedAt && (
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                      최종 수정: {new Date(activeData.updatedAt).toLocaleString('ko-KR')}
                    </div>
                  )}
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button onClick={startEdit} style={{ padding: '8px 18px', borderRadius: 7, background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      {activeData.content ? '수정' : '작성 시작'}
                    </button>
                    {activeSec?.relatedHub && (
                      <button
                        onClick={() => navigate(activeSec.relatedHub)}
                        style={{ padding: '8px 14px', borderRadius: 7, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <ExternalLink size={13} /> 연관 데이터 확인
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

      </div>
    </AppLayout>
  )
}
