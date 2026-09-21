// src/components/QmsSetupCard.jsx
// QMS 초기 세팅 12단계 체크리스트 — 홈 대시보드용 (isCompanyAdmin 유저에게만 노출)
import React, { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

const QMS_SETUP_STEPS = [
  { id:1,  title:'회사 마스터 정보 완성',          link:'/company-master'        },
  { id:2,  title:'품질책임자(QMR) 지정',            link:'/company-master'        },
  { id:3,  title:'품질방침 수립',                        link:'/quality-policy'        },
  { id:4,  title:'품질목표 설정',                        link:'/quality-objectives'    },
  { id:5,  title:'직원 초대 및 권한 설정',           link:'/admin'                 },
  { id:6,  title:'품질매뉴얼 작성',                  link:'/quality-manual'        },
  { id:7,  title:'핵심 SOP 작성',                    link:'/sop'                   },
  { id:8,  title:'제품 정보 등록',                      link:'/product-identification' },
  { id:9,  title:'위험관리 계획 수립',               link:'/risk-management'       },
  { id:10, title:'내부심사 계획 수립',               link:'/audit'                 },
  { id:11, title:'공급업체 등록',                      link:'/supplier'              },
  { id:12, title:'GMP 자가점검 실시',                  link:'/gmp-self-inspection'   },
]
const LS_KEY = 'qualytree.qms_setup'

export default function QmsSetupCard({ nav }) {
  const [done, setDone] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
  })
  const [expanded, setExpanded] = useState(false)

  const toggle = (id) => setDone(prev => {
    const next = { ...prev, [id]: !prev[id] }
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
    return next
  })

  const doneCount = QMS_SETUP_STEPS.filter(s => !!done[s.id]).length
  const nextStep = QMS_SETUP_STEPS.find(s => !done[s.id])
  if (doneCount === 12) return null

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--leaf)' }}>
      {/* 헤더 */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'var(--leaf-soft)', borderBottom: '1px solid var(--leaf)' }}>
        <CheckCircle2 size={17} style={{ color: 'var(--moss)', flexShrink: 0 }} />
        <div className="flex-1">
          <div className="font-semibold text-[13.5px]" style={{ color: 'var(--moss)' }}>QMS 초기 세팅</div>
          <div className="text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{doneCount}/12 단계 완료</div>
        </div>
        <div style={{ width: 70, height: 5, background: 'var(--line)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ width: `${Math.round((doneCount / 12) * 100)}%`, height: '100%', background: 'var(--moss)', borderRadius: 3, transition: 'width .3s' }} />
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5, color: 'var(--ink-soft)', flexShrink: 0 }}
        >
          {expanded ? '접기 ▲' : '전체 ▼'}
        </button>
      </div>

      {/* 다음 단계 (접힌 상태) */}
      {nextStep && !expanded && (
        <div className="px-4 py-2.5 flex items-center gap-2">
          <span className="text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>다음 단계:</span>
          <span className="text-[12.5px] font-medium flex-1" style={{ color: 'var(--ink)' }}>
            {nextStep.id}. {nextStep.title}
          </span>
          <button
            onClick={() => nav(nextStep.link)}
            className="px-3 py-1 rounded-lg text-[11.5px] font-medium"
            style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            이동 →
          </button>
        </div>
      )}

      {/* 전체 목록 (펼침 상태) */}
      {expanded && (
        <div className="p-4 space-y-1.5">
          {QMS_SETUP_STEPS.map(step => (
            <div key={step.id} className="flex items-center gap-2.5">
              <button
                onClick={() => toggle(step.id)}
                style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                  border: `1px solid ${done[step.id] ? 'var(--moss)' : 'var(--line)'}`,
                  background: done[step.id] ? 'var(--moss)' : 'var(--bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {done[step.id] && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
              </button>
              <span
                className="text-[12.5px] flex-1"
                style={{
                  color: done[step.id] ? 'var(--ink-faint)' : 'var(--ink)',
                  textDecoration: done[step.id] ? 'line-through' : 'none',
                }}
              >
                {step.id}. {step.title}
              </span>
              {!done[step.id] && (
                <button
                  onClick={() => nav(step.link)}
                  style={{ fontSize: 11, padding: '1px 8px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--ink-soft)', cursor: 'pointer' }}
                >
                  이동
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
