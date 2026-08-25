// src/pages/quality/QualityHub.jsx — ISO 13485 §8.3 NCR·부적합 관리
import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, Plus, Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { evaluateForCAPA, capa, CAPA_STATUS } from '../../lib/capaState'
import { auth } from '../../lib/auth'

const LS_KEY = 'qualytree.ncrs'
const CNT_KEY = 'qualytree.ncrCounter'

function lsRead() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
function lsWrite(arr) { localStorage.setItem(LS_KEY, JSON.stringify(arr)) }
function nextId() {
  const n = parseInt(localStorage.getItem(CNT_KEY) || '0', 10) + 1
  localStorage.setItem(CNT_KEY, String(n))
  return 'NCR-' + new Date().getFullYear() + '-' + String(n).padStart(4, '0')
}

function getLinkedCapas(ncrId) {
  try {
    const all = JSON.parse(localStorage.getItem('qualytree.capas') || '[]')
    return all.filter(c => Array.isArray(c.sourceNcrIds) && c.sourceNcrIds.includes(ncrId))
  } catch { return [] }
}

const STATUS_LABEL = { investigating: '조사중', contained: '격리완료', corrected: '시정완료', closed: '종결' }
const STATUS_COLOR = { investigating: '#EAB308', contained: '#3B82F6', corrected: '#8B5CF6', closed: '#22C55E' }
const SEV_COLOR = { Critical: '#DC2626', Major: '#F97316', Minor: '#64748B' }
const SEVERITIES = ['Critical', 'Major', 'Minor']
const SOURCES = ['내부검사', '고객불만', '공급업체', '공정', '기타']

export default function QualityHub() {
  const [ncrs, setNcrs] = useState(lsRead)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState({ title: '', severity: 'Major', source: '내부검사', description: '', detectedAt: '', detectedBy: '' })

  function reload() { setNcrs(lsRead()) }

  function save() {
    if (!form.title.trim()) return alert('제목을 입력하세요')
    const cur = auth.current()
    const all = lsRead()
    const newRecord = {
      ...form,
      id: nextId(),
      status: 'investigating',
      createdAt: new Date().toISOString(),
      createdByEmail: cur?.email || '',
      createdByName: cur?.name || '',
      containment: '',
      containmentSkipped: false,
      containmentAt: null,
      approvals: [],
    }
    all.unshift(newRecord)
    lsWrite(all)
    const capaT = evaluateForCAPA(newRecord)
    if (capaT) capa.raise({ title: capaT.suggestedTitle, description: capaT.reason, trigger: capaT.trigger, triggerReason: capaT.reason, sourceNcrIds: [newRecord.id] })
    reload()
    setModal(false)
    setExpanded(newRecord.id)
  }

  function updateRecord(id, patch) {
    const all = lsRead().map(r => r.id === id ? { ...r, ...patch } : r)
    lsWrite(all)
    reload()
  }

  function remove(id) {
    if (!confirm('삭제하시겠습니까?')) return
    lsWrite(lsRead().filter(r => r.id !== id))
    reload()
  }

  const filtered = useMemo(() =>
    ncrs.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.id.includes(search)),
    [ncrs, search])

  const stats = useMemo(() => ({
    total: ncrs.length,
    investigating: ncrs.filter(r => r.status === 'investigating').length,
    contained: ncrs.filter(r => r.status === 'contained').length,
    corrected: ncrs.filter(r => r.status === 'corrected').length,
    closed: ncrs.filter(r => r.status === 'closed').length,
  }), [ncrs])

  const statCard = { background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }
  const btn = (bg, fg = '#fff') => ({ background: bg, color: fg, border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 })
  const inp = { width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg-card)', color: 'var(--ink)', fontSize: 14, boxSizing: 'border-box' }

  return (
    <AppLayout>
      <HubBanner icon={ShieldAlert} title="NCR·부적합 관리" subtitle="ISO 13485 §8.3" color="#DC2626" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
        {[['전체', stats.total, 'var(--ink)'], ['조사중', stats.investigating, '#EAB308'], ['격리완료', stats.contained, '#3B82F6'], ['시정완료', stats.corrected, '#8B5CF6'], ['종결', stats.closed, '#22C55E']].map(([label, n, color]) => (
          <div key={label} style={statCard}>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{n}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)' }} />
          <input style={{ ...inp, paddingLeft: 30 }} placeholder="NCR ID 또는 제목 검색" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button style={btn('#DC2626')} onClick={() => { setForm({ title: '', severity: 'Major', source: '내부검사', description: '', detectedAt: '', detectedBy: '' }); setModal(true) }}>
          <Plus size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />부적합 등록
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 40 }}>등록된 부적합이 없습니다</div>}
      {filtered.map(r => (
        <NcrCard key={r.id} r={r}
          expanded={expanded === r.id}
          onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
          onUpdate={patch => updateRecord(r.id, patch)}
          onRemove={() => remove(r.id)}
          btn={btn} inp={inp} onReload={reload} />
      ))}

      {/* Register Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 28, width: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>부적합 신규 등록</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            {[
              ['제목', <input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="부적합 내용 요약" />],
              ['심각도', <select style={inp} value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>{SEVERITIES.map(s => <option key={s}>{s}</option>)}</select>],
              ['발생출처', <select style={inp} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>{SOURCES.map(s => <option key={s}>{s}</option>)}</select>],
              ['발견일', <input type="date" style={inp} value={form.detectedAt} onChange={e => setForm(f => ({ ...f, detectedAt: e.target.value }))} />],
              ['발견자', <input style={inp} value={form.detectedBy} onChange={e => setForm(f => ({ ...f, detectedBy: e.target.value }))} />],
              ['상세내용', <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />],
            ].map(([label, el]) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 4 }}>{label}</label>
                {el}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={btn('transparent', 'var(--ink)')} onClick={() => setModal(false)}>취소</button>
              <button style={btn('#DC2626')} onClick={save}>등록</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

function NcrCard({ r, expanded, onToggle, onUpdate, onRemove, btn, inp, onReload }) {
  const curUser = auth.current()
  const isApprover = (curUser?.level || 0) >= 3
  const [approveNote, setApproveNote] = useState('')

  const linkedCapas = getLinkedCapas(r.id)
  const capasDone = linkedCapas.length === 0 || linkedCapas.every(c => c.status === CAPA_STATUS.CLOSED)

  function doCorrect() {
    if (!capasDone) return alert('연결된 CAPA가 아직 완료되지 않았습니다. CAPA·개선 메뉴에서 CAPA를 종결하세요.')
    onUpdate({ status: 'corrected', correctedAt: new Date().toISOString() })
  }

  function doApprove() {
    onUpdate({
      status: 'closed',
      closedAt: new Date().toISOString(),
      approvals: [{
        role: '승인자',
        name: curUser?.name || '미확인',
        email: curUser?.email || '',
        level: curUser?.level || 0,
        note: approveNote,
        signedAt: new Date().toISOString(),
      }],
    })
  }

  const stageBox = (color) => ({ border: `1px solid ${color}`, borderRadius: 10, padding: 14, marginBottom: 12 })
  const stageTitle = (color, text) => <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 10 }}>{text}</div>
  const linkBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#EAB308', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={onToggle}>
        <span style={{ fontSize: 11, fontWeight: 700, color: SEV_COLOR[r.severity] || '#64748B', background: (SEV_COLOR[r.severity] || '#64748B') + '22', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{r.severity}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{r.id}</span>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{r.title}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[r.status], background: STATUS_COLOR[r.status] + '22', padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{STATUS_LABEL[r.status]}</span>
        {expanded ? <ChevronUp size={16} color="var(--ink-faint)" /> : <ChevronDown size={16} color="var(--ink-faint)" />}
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--line)', padding: 16 }}>
          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14, fontSize: 13, color: 'var(--ink-faint)' }}>
            <span>출처: {r.source}</span>
            <span>발견일: {r.detectedAt || '-'}</span>
            <span>발견자: {r.detectedBy || '-'}</span>
            <span>등록자: {r.createdByName || '-'}</span>
          </div>
          {r.description && (
            <div style={{ fontSize: 13, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 14, lineHeight: 1.6 }}>{r.description}</div>
          )}

          {/* Stage 1 — 격리 조치 메뉴로 이동 */}
          {r.status === 'investigating' && (
            <div style={stageBox('#EAB308')}>
              {stageTitle('#EAB308', '① 격리 조치')}
              <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: '0 0 12px', lineHeight: 1.6 }}>
                격리 여부(격리 실시 / 격리 불필요)를 격리관리 메뉴에서 결정해주세요.
                결정 완료 시 자동으로 다음 단계로 전환됩니다.
              </p>
              <Link to={`/containment?ncrId=${r.id}`} style={linkBtn}>격리관리 메뉴로 이동 →</Link>
            </div>
          )}

          {/* Stage 2 — CAPA 확인 후 시정완료 */}
          {r.status === 'contained' && (
            <div style={stageBox('#3B82F6')}>
              {stageTitle('#3B82F6', '② CAPA 진행 확인')}
              {r.containmentSkipped
                ? <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 10 }}>격리: 불필요 처리됨 ({r.containmentAt ? r.containmentAt.slice(0,10) : ''})</div>
                : r.containment
                  ? <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 10 }}>격리 조치: {r.containment}</div>
                  : null}
              {linkedCapas.length > 0 ? (
                <div style={{ marginBottom: 10 }}>
                  {linkedCapas.map(c => (
                    <div key={c.id} style={{ fontSize: 13, padding: '6px 10px', background: 'var(--bg)', borderRadius: 6, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{c.id} — {c.title}</span>
                      <span style={{ fontWeight: 600, color: c.status === CAPA_STATUS.CLOSED ? '#22C55E' : '#F97316' }}>{c.status}</span>
                    </div>
                  ))}
                  {!capasDone && (
                    <div style={{ fontSize: 12, color: '#F97316', marginTop: 6 }}>
                      CAPA 완료 후 자동으로 시정완료로 전환됩니다.
                      <Link to="/improvement" style={{ marginLeft: 8, color: '#3B82F6', fontWeight: 600 }}>CAPA·개선 메뉴 →</Link>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 10 }}>자동 생성 CAPA 없음 (Critical·반복 Major NCR이 아닌 경우 직접 시정완료 가능)</div>
              )}
              <button
                style={btn(capasDone ? '#8B5CF6' : '#CBD5E1', capasDone ? '#fff' : '#94A3B8')}
                onClick={doCorrect}
              >시정완료로 전환</button>
            </div>
          )}

          {/* Stage 3 — 역할 기반 승인 */}
          {r.status === 'corrected' && (
            <div style={stageBox('#8B5CF6')}>
              {stageTitle('#8B5CF6', '③ 검토·승인')}
              {isApprover ? (
                <>
                  <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 10 }}>
                    승인자: <strong style={{ color: 'var(--ink)' }}>{curUser?.name}</strong> (Level {curUser?.level})
                  </div>
                  <textarea
                    style={{ ...inp, minHeight: 60, resize: 'vertical', marginBottom: 10 }}
                    placeholder="승인 의견 (선택)"
                    value={approveNote}
                    onChange={e => setApproveNote(e.target.value)}
                  />
                  <button style={btn('#22C55E')} onClick={doApprove}>승인하고 종결</button>
                </>
              ) : (
                <div style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>승인 대기 중</div>
                  <div style={{ color: 'var(--ink-faint)', lineHeight: 1.6 }}>
                    Level 3 이상 관리자의 승인이 필요합니다.<br />
                    관리자가 이 NCR을 열면 승인 버튼이 표시됩니다.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stage 4 — 종결 */}
          {r.status === 'closed' && (
            <div style={stageBox('#22C55E')}>
              {stageTitle('#22C55E', '✓ 종결 완료')}
              {r.approvals && r.approvals.map(a => (
                <div key={a.role} style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 4 }}>
                  {a.role}: <strong style={{ color: 'var(--ink) }}>{a.name}</strong>
                  {a.note ? <span> — {a.note}</span> : null}
                  <span> ({a.signedAt ? a.signedAt.slice(0, 10) : ''})</span>
                </div>
              ))}
              {r.closedAt && <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6 }}>종결일: {r.closedAt.slice(0, 10)}</div>}
            </div>
          )}

          {/* Delete */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: 12, cursor: 'pointer' }} onClick={onRemove}>삭제</button>
          </div>
        </div>
      )}
    </div>
  )
}
