// src/pages/quality/ContainmentHub.jsx — 격리 조치 관리 (ISO 13485 §8.3)
import React, { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ShieldOff, ChevronDown, ChevronUp, CheckCircle2, Clock, ArrowLeft } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

const NCR_KEY = 'qualytree.ncrs'

function readNcrs() { try { return JSON.parse(localStorage.getItem(NCR_KEY) || '[]') } catch { return [] } }
function saveNcrs(arr) { localStorage.setItem(NCR_KEY, JSON.stringify(arr)) }

const SEV_COLOR = { Critical: '#DC2626', Major: '#F97316', Minor: '#64748B' }

export default function ContainmentHub() {
  const [searchParams] = useSearchParams()
  const focusId = searchParams.get('ncrId')

  const [ncrs, setNcrs] = useState(readNcrs)
  const [expanded, setExpanded] = useState(focusId || null)
  const [forms, setForms] = useState({}) // { ncrId: { text, skip } }

  function reload() { setNcrs(readNcrs()) }

  function getForm(id) { return forms[id] || { text: '', skip: false } }
  function setForm(id, patch) { setForms(f => ({ ...f, [id]: { ...getForm(id), ...patch } })) }

  function doContainment(ncr) {
    const f = getForm(ncr.id)
    if (!f.skip && !f.text.trim()) return alert('격리 조치 내용을 입력하거나 "격리 불필요"를 체크하세요')
    const cur = auth.current()
    const all = readNcrs().map(r =>
      r.id === ncr.id
        ? {
            ...r,
            status: 'contained',
            containment: f.text,
            containmentSkipped: f.skip,
            containmentAt: new Date().toISOString(),
            containmentBy: cur?.name || '미확인',
          }
        : r
    )
    saveNcrs(all)
    reload()
    setExpanded(null)
  }

  const pending = useMemo(() => ncrs.filter(r => r.status === 'investigating'), [ncrs])
  const done = useMemo(() => ncrs.filter(r => ['contained','corrected','closed'].includes(r.status)).slice(0,10), [ncrs])

  const card = { background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }
  const btn = (bg, fg = '#fff') => ({ background: bg, color: fg, border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 })
  const inp = { width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg-card)', color: 'var(--ink)', fontSize: 14, boxSizing: 'border-box' }

  return (
    <AppLayout>
      <HubBanner icon={ShieldOff} title="격리 조치 관리" subtitle="ISO 13485 §8.3 Containment" color="#EAB308" />

      {/* Back link */}
      <Link to="/quality" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-faint)', marginBottom: 16, textDecoration: 'none' }}>
        <ArrowLeft size={14} /> NCR·부적합 목록으로
      </Link>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#EAB308' }}>{pending.length}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>격리 결정 대기</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#22C55E' }}>{done.length}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>격리 완료</div>
        </div>
      </div>

      {/* Pending containment decisions */}
      <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>격리 결정 필요</h4>
      {pending.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 30, marginBottom: 20 }}>
          격리 결정이 필요한 NCR이 없습니다
        </div>
      )}
      {pending.map(ncr => {
        const isExp = expanded === ncr.id
        const f = getForm(ncr.id)
        const isFocus = ncr.id === focusId
        return (
          <div key={ncr.id} style={{ ...card, border: isFocus ? '2px solid #EAB308' : '1px solid var(--line)' }}>
            <div
              style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
              onClick={() => setExpanded(isExp ? null : ncr.id)}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: SEV_COLOR[ncr.severity] || '#64748B', background: (SEV_COLOR[ncr.severity] || '#64748B') + '22', padding: '2px 8px', borderRadius: 20 }}>{ncr.severity}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{ncr.id}</span>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{ncr.title}</span>
              <span style={{ fontSize: 11, color: '#EAB308', background: '#EAB30822', padding: '2px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> 격리 대기
              </span>
              {isExp ? <ChevronUp size={16} color="var(--ink-faint)" /> : <ChevronDown size={16} color="var(--ink-faint)" />}
            </div>
            {isExp && (
              <div style={{ borderTop: '1px solid var(--line)', padding: 16 }}>
                {ncr.description && <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 12 }}>{ncr.description}</div>}

                {/* Containment decision */}
                <div style={{ border: '1px solid #EAB308', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#EAB308', marginBottom: 10 }}>격리 조치 결정</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={f.skip} onChange={e => setForm(ncr.id, { skip: e.target.checked })} />
                    격리 불필요 (해당 없음 — 확산 위험 없음)
                  </label>
                  {!f.skip && (
                    <textarea
                      style={{ ...inp, minHeight: 80, resize: 'vertical', marginBottom: 10 }}
                      placeholder="격리·봉쇄 조치 내용을 입력하세요 (예: 해당 로트 생산 중단, 불량품 격리 보관)"
                      value={f.text}
                      onChange={e => setForm(ncr.id, { text: e.target.value })}
                    />
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={btn('#EAB308')} onClick={() => doContainment(ncr)}>
                      {f.skip ? '격리불필요 확인 후 다음 단계로' : '격리 완료 — 다음 단계로'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Completed containments */}
      {done.length > 0 && (
        <>
          <h4 style={{ margin: '20px 0 10px', fontSize: 14, fontWeight: 700, color: 'var(--ink-faint)' }}>최근 격리 완료 내역</h4>
          {done.map(ncr => (
            <div key={ncr.id} style={{ ...card, opacity: 0.75 }}>
              <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={14} color="#22C55E" />
                <span style={{ fontSize: 11, color: SEV_COLOR[ncr.severity], fontWeight: 600 }}>{ncr.severity}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{ncr.id}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{ncr.title}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                  {ncr.containmentSkipped ? '격리불필요' : '격리완료'} — {ncr.containmentAt ? ncr.containmentAt.slice(0,10) : ''}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </AppLayout>
  )
}
