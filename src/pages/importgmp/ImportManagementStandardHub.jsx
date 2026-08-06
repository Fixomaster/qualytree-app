// src/pages/importgmp/ImportManagementStandardHub.jsx
// 수입관리기준서 — 「의료기기법 시행규칙」 및 「수입 의료기기 GMP 심사 세부운영 가이드라인」에 따라
// 수입업자가 갖추어야 하는 수입관리 절차 기준 문서. (#299)
// SterileControlHub.jsx의 PolicyTab(읽기전용 뷰 + 편집 모달) 패턴을 따른다.
import React, { useState } from 'react'
import { FileText, Edit2, Save, Trash2, XCircle, ClipboardList, Sparkles, Loader2 } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import CertGate from '../../components/CertGate'
import { auth } from '../../lib/auth'
import { permissions, requirePermission } from '../../lib/permissions'

const LS_KEY = 'qualytree.import_management_standard'
function today() { return new Date().toISOString().slice(0, 10) }

// #27 재수정 — 처음 진입 시 모든 항목이 "미입력"으로만 보여 "내용이 없다"는 지적을 받았다.
// 다른 절차서(품질매뉴얼 등)와 마찬가지로 사용자가 직접 채우는 문서이지만, 빈 화면 대신
// 「의료기기법 시행규칙」·「수입 의료기기 GMP 심사 세부운영 가이드라인」에 따른 표준 절차 문구를
// 기본값으로 제공하여 즉시 사용 가능한 초안 상태로 시작하고, 회사 상황에 맞게 수정·AI 초안 보완할 수 있도록 한다.
const DEFAULT_STANDARD = {
  docNo: 'IMS-001',
  revision: 'Rev.0',
  issueDate: today(),
  approvedBy: '',
  scope:
    '본 기준서는 「의료기기법 시행규칙」 제32조 및 「수입 의료기기 GMP 심사 세부운영 가이드라인」에 따라 당사가 수입하여 국내에 유통하는 모든 의료기기의 수입관리 절차를 규정한다. ' +
    '적용 대상은 당사가 수입업 허가(신고)를 득한 전 품목이며, 외국제조소 선정부터 통관, 보관·유통, 사후관리(불만처리·이상사례보고·회수)까지 전 과정에 적용한다.',
  organization:
    '수입관리책임자는 수입 품목의 품목허가 유지, 외국제조소 관리, 통관·수입검사 총괄을 담당하며, 품질책임자는 수입검사 기준 설정 및 부적합품 처리를 담당한다. ' +
    '수입관리책임자·품질책임자의 지정 현황은 기본정보 화면의 조직도·품질책임자 지정 정보를 따른다.',
  siteSelection:
    '외국제조소는 등록 전 GMP 적합인정서(또는 이에 준하는 인증서) 및 실사자료를 확인하여 선정하며, 적합인정서 유효기간을 주기적으로 점검한다. ' +
    '선정·관리 현황은 "외국제조소" 화면에서 제조소별 GMP 적합인정서·타 인증기관 실사자료로 관리하고, 위해우려제조소 해당 여부 등 특이사항이 있는 경우 별도 강화 관리한다.',
  licenseManagement:
    '수입 품목은 「의료기기법」에 따른 허가·신고·인증을 취득한 후 유통하며, 품목별 허가번호·인증번호·발급일을 관리한다. ' +
    '품목허가 현황은 "품목허가현황" 화면에서 제조소별·품목별로 등록·관리하고, 허가사항 변경 시 즉시 갱신한다.',
  clearanceInspection:
    '통관 시 수입신고서, 품목허가증, 시험성적서 등 관련 서류를 확인하고, 로트(LOT)별 수입검사(서류 확인 및 필요 시 시험)를 실시하여 합격 판정된 제품만 국내 유통한다. ' +
    '통관 및 수입검사 기록은 "수입통관기록" 화면에서 통관번호 단위로 관리하며, 하나의 통관번호에 여러 모델이 포함되는 경우도 함께 기록한다.',
  storageDistribution:
    '수입 제품은 제품 라벨에 명시된 보관 조건(온도·습도 등)에 따라 보관하며, 선입선출(FIFO) 원칙으로 출고한다. ' +
    '유통 이력은 로트 단위로 추적 가능하도록 관리하여, 회수 등 사후조치가 필요한 경우 신속히 추적할 수 있도록 한다.',
  complaintReporting:
    '고객불만은 접수 즉시 등록하고 원인 조사 후 조치 결과를 기록하며, 이 중 이상사례(부작용) 해당 여부를 품질부서가 검토하여 「의료기기법」상 의무보고 대상인 경우 식약처에 보고한다. ' +
    '고객불만 등록 및 품질부서 검토·MFDS 보고 처리는 "이상사례보고" 화면에서 연계 관리한다.',
  recall:
    '제품 결함, 이상사례, 규제기관 조치 등으로 회수가 필요하다고 판단되는 경우, 위해성 등급을 평가하여 회수 등급(1~3등급)을 결정하고, 관련 법령에 따라 회수계획을 수립·시행 및 사후 보고한다. ' +
    '로트 추적 결과를 근거로 회수 대상 유통처를 확정하고 회수 진행 상황을 기록·보관한다.',
  recordKeeping:
    '수입관리 관련 기록(허가·통관·수입검사·보관유통·불만처리·회수 기록 등)은 관련 법령 및 사내 문서관리 절차에 따른 보존기간 동안 보관하며, 전자기록(본 시스템) 형태로 관리하여 필요 시 즉시 조회·출력할 수 있도록 한다.',
  revisionHistory: [],
}

function loadStandard() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return DEFAULT_STANDARD
    return { ...DEFAULT_STANDARD, ...JSON.parse(raw) }
  } catch { return DEFAULT_STANDARD }
}
function saveStandard(v) { localStorage.setItem(LS_KEY, JSON.stringify(v)) }

const SECTIONS = [
  { key: 'scope',               label: '1. 목적 및 적용범위' },
  { key: 'organization',        label: '2. 수입관리 조직 및 책임 (수입관리책임자·품질책임자)' },
  { key: 'siteSelection',       label: '3. 외국제조소 선정 및 관리 기준 (GMP 적합인정서 확인·실사)' },
  { key: 'licenseManagement',   label: '4. 품목허가 및 수입신고 관리' },
  { key: 'clearanceInspection', label: '5. 통관 및 수입검사 기준' },
  { key: 'storageDistribution', label: '6. 보관 및 유통관리 기준' },
  { key: 'complaintReporting',  label: '7. 불만처리 및 이상사례 보고 연계' },
  { key: 'recall',              label: '8. 회수(Recall) 절차' },
  { key: 'recordKeeping',       label: '9. 기록의 관리 및 보존' },
]

const SECTION_PLACEHOLDERS = {
  scope: '이 기준서가 적용되는 수입 의료기기 품목 범위 및 목적을 기술합니다.',
  organization: '수입관리책임자·품질책임자의 지정 및 역할·책임을 기술합니다. (기본정보에 등록된 품질책임자 정보 참조)',
  siteSelection: '외국제조소 GMP 적합인정서 확인 절차, 정기 실사·서면심사 기준을 기술합니다. (외국제조소 GMP 화면 연계)',
  licenseManagement: '품목허가·신고·인증 취득 및 유지관리 절차를 기술합니다. (품목 허가 현황 화면 연계)',
  clearanceInspection: '수입신고, 통관, 수입검사(로트별 시험·서류 확인) 기준을 기술합니다. (수입 통관 기록 화면 연계)',
  storageDistribution: '보관 온습도 관리, 유통 이력 관리, 선입선출 등 보관·유통 기준을 기술합니다.',
  complaintReporting: '고객불만 접수 및 이상사례(MFDS 의무보고) 처리 절차를 기술합니다. (이상사례 보고 화면 연계)',
  recall: '제품 회수 결정 기준, 회수 등급, 회수 절차 및 사후 보고를 기술합니다.',
  recordKeeping: '수입관리 관련 기록의 종류, 보존기간, 보관 방법을 기술합니다.',
}

export default function ImportManagementStandardHub() {
  const user = auth.current()
  const canEdit = permissions.can('importgmp.site.edit')
  const [standard, setStandard] = useState(loadStandard)
  const update = (next) => { setStandard(next); saveStandard(next) }

  return (
    <AppLayout user={user} title="수입관리기준서" subtitle="수입 의료기기 수입관리 절차 기준 문서">
      <CertGate certId="kgmp_importer" label="수입 GMP">
        <div className="px-6 lg:px-8 py-6 max-w-[1100px] mx-auto fade-in">
          <HubBanner
            title="수입관리기준서"
            subtitle="수입 의료기기 GMP 심사 세부운영 가이드라인 · 수입관리 절차 기준 문서"
            icon={ClipboardList}
            color="#2563EB"
          />
          <div className="mt-5">
            <PolicyTab standard={standard} setStandard={update} canEdit={canEdit} />
          </div>
        </div>
      </CertGate>
    </AppLayout>
  )
}

function PolicyTab({ standard, setStandard, canEdit }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(standard)
  const [aiSectionKey, setAiSectionKey] = useState(null)
  const upd = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }))
  const openEdit = () => {
    if (!requirePermission('importgmp.site.edit')) return
    setDraft({ ...standard }); setEditing(true)
  }
  const save = () => { setStandard(draft); setEditing(false) }

  const addRev = () => {
    const row = { date: today(), revision: '', by: '', summary: '' }
    setDraft((d) => ({ ...d, revisionHistory: [...(d.revisionHistory || []), row] }))
  }
  const updRev = (i, k, v) => {
    const h = [...draft.revisionHistory]
    h[i] = { ...h[i], [k]: v }
    setDraft((d) => ({ ...d, revisionHistory: h }))
  }
  const delRev = (i) => setDraft((d) => ({ ...d, revisionHistory: d.revisionHistory.filter((_, j) => j !== i) }))

  return (
    <div>
      {/* 문서 헤더 — 읽기 전용 뷰 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>수입관리기준서</div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
            Import Management Standard · 문서번호 {standard.docNo}
          </div>
        </div>
        {canEdit && (
          <button onClick={openEdit} style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
            background: 'var(--moss)', color: '#fff', border: 'none',
            borderRadius: 6, padding: '7px 14px', cursor: 'pointer',
          }}><Edit2 size={13} /> 기준서 편집</button>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 16, padding: '8px 12px', background: 'var(--bg-soft)', borderRadius: 6 }}>
        이 화면은 수입관리기준서 내용을 조회 전용으로 표시합니다. 기준서가 수정되면 이 화면에도 즉시 동일한 내용이 반영됩니다.
      </div>

      {/* 문서 메타 정보 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)' }}>개정번호</div>
          <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 3 }}>{standard.revision || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)' }}>발행일</div>
          <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 3 }}>{standard.issueDate || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)' }}>승인자</div>
          <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 3 }}>{standard.approvedBy || '—'}</div>
        </div>
      </div>

      {/* 문서 본문 — 읽기 전용 */}
      {SECTIONS.map(({ key, label }) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 5 }}>{label}</div>
          <div style={{
            fontSize: 13, color: standard[key] ? 'var(--ink)' : 'var(--ink-faint)',
            lineHeight: 1.6, background: 'var(--bg-soft)', borderRadius: 6, padding: 10, minHeight: 48, whiteSpace: 'pre-line',
          }}>
            {standard[key] || <em>미입력</em>}
          </div>
        </div>
      ))}

      {/* 개정 이력 — 읽기 전용 */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>개정 이력</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
              {['날짜', '개정번호', '작성자', '내용 요약'].map((h) => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--ink-soft)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(standard.revisionHistory || []).map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '6px 10px' }}>{r.date}</td>
                <td style={{ padding: '6px 10px' }}>{r.revision}</td>
                <td style={{ padding: '6px 10px' }}>{r.by}</td>
                <td style={{ padding: '6px 10px' }}>{r.summary}</td>
              </tr>
            ))}
            {(standard.revisionHistory || []).length === 0 && (
              <tr><td colSpan={4} style={{ padding: '12px 10px', color: 'var(--ink-faint)', fontSize: 13 }}>개정 이력 없음</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 편집 모달 */}
      {editing && (
        <StdModal title="수입관리기준서 편집" onClose={() => setEditing(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="개정번호"><input style={inp} value={draft.revision} onChange={upd('revision')} /></Field>
            <Field label="발행일"><input type="date" style={inp} value={draft.issueDate} onChange={upd('issueDate')} /></Field>
            <Field label="승인자"><input style={inp} value={draft.approvedBy} onChange={upd('approvedBy')} /></Field>
          </div>

          {SECTIONS.map(({ key, label }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>{label}</div>
                <button type="button" onClick={() => setAiSectionKey(aiSectionKey === key ? null : key)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 600,
                    background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe',
                    borderRadius: 5, padding: '2px 8px', cursor: 'pointer',
                  }}><Sparkles size={10} /> AI 초안</button>
              </div>
              <textarea style={textarea} value={draft[key]} onChange={upd(key)} placeholder={SECTION_PLACEHOLDERS[key]} />
              {aiSectionKey === key && (
                <ImsDraftPanel sectionLabel={label} companyName={draft.approvedBy ? '' : ''}
                  onUse={(text) => { setDraft((d) => ({ ...d, [key]: d[key] ? d[key] + '\n' + text : text })); setAiSectionKey(null) }}
                  onClose={() => setAiSectionKey(null)} />
              )}
            </div>
          ))}

          {/* 개정 이력 편집 */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>개정 이력</div>
              <button onClick={addRev} style={{
                fontSize: 12, background: 'none', border: '1px solid var(--line)',
                borderRadius: 5, padding: '3px 10px', cursor: 'pointer', color: 'var(--ink-soft)',
              }}>+ 추가</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
                  {['날짜', '개정번호', '작성자', '내용 요약', ''].map((h) => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--ink-soft)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(draft.revisionHistory || []).map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '6px 10px' }}><input style={{ ...inp, padding: '3px 6px' }} value={r.date} onChange={(e) => updRev(i, 'date', e.target.value)} /></td>
                    <td style={{ padding: '6px 10px' }}><input style={{ ...inp, padding: '3px 6px' }} value={r.revision} onChange={(e) => updRev(i, 'revision', e.target.value)} /></td>
                    <td style={{ padding: '6px 10px' }}><input style={{ ...inp, padding: '3px 6px' }} value={r.by} onChange={(e) => updRev(i, 'by', e.target.value)} /></td>
                    <td style={{ padding: '6px 10px' }}><input style={{ ...inp, padding: '3px 6px' }} value={r.summary} onChange={(e) => updRev(i, 'summary', e.target.value)} /></td>
                    <td style={{ padding: '6px 10px' }}><button onClick={() => delRev(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={13} /></button></td>
                  </tr>
                ))}
                {(draft.revisionHistory || []).length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '12px 10px', color: 'var(--ink-faint)', fontSize: 13 }}>개정 이력 없음</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={save} style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
              background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 6,
              padding: '7px 16px', cursor: 'pointer',
            }}><Save size={14} /> 저장</button>
            <button onClick={() => setEditing(false)} style={{
              fontSize: 13, background: 'none', border: '1px solid var(--line)',
              borderRadius: 6, padding: '7px 14px', cursor: 'pointer', color: 'var(--ink-soft)',
            }}>취소</button>
          </div>
        </StdModal>
      )}
    </div>
  )
}

// #12 — 섹션별 AI 초안 생성 패널 (dhf-draft.js / regulatory-draft.js와 동일한 패턴)
function ImsDraftPanel({ sectionLabel, companyName, onUse, onClose }) {
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [draftText, setDraftText] = useState('')

  async function generate() {
    setLoading(true); setError(''); setDraftText('')
    try {
      const r = await fetch('/api/import-standard-draft', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sectionLabel, companyName, context: context.trim() }),
      })
      const j = await r.json()
      if (!j.ok) setError(j.message || 'AI 초안 생성에 실패했습니다.')
      else setDraftText(j.content || '')
    } catch (e) {
      setError('AI 초안 생성 중 오류가 발생했습니다: ' + String((e && e.message) || e))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: '#faf9ff', border: '1px solid #ddd6fe' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Sparkles size={12} /> {sectionLabel} — AI 초안
        </span>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><XCircle size={14} /></button>
      </div>
      <input style={{ ...inp, fontSize: 12, padding: '6px 10px', marginBottom: 8 }}
        placeholder="참고 내용 (선택) — 실제 회사 상황을 적을수록 초안 품질이 좋아집니다"
        value={context} onChange={(e) => setContext(e.target.value)} />
      {error && <div style={{ fontSize: 11.5, padding: '6px 10px', borderRadius: 6, background: '#fee2e2', color: '#991b1b', marginBottom: 8 }}>{error}</div>}
      <button type="button" onClick={generate} disabled={loading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6,
          fontSize: 12, fontWeight: 600, cursor: loading ? 'default' : 'pointer', border: 'none',
          background: '#7c3aed', color: '#fff', opacity: loading ? 0.7 : 1, marginBottom: draftText ? 8 : 0,
        }}>
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        {loading ? '생성 중...' : '초안 생성'}
      </button>
      {draftText && (
        <div>
          <div style={{ fontSize: 12, whiteSpace: 'pre-wrap', padding: 10, borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', marginBottom: 8 }}>
            {draftText}
          </div>
          <button type="button" onClick={() => onUse(draftText)}
            style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
              border: '1px solid var(--moss)', background: 'var(--leaf-soft)', color: 'var(--moss)',
            }}>이 내용을 섹션에 추가</button>
        </div>
      )}
      <p style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 6 }}>AI 초안은 참고용입니다 — 반드시 검토·수정 후 저장하세요.</p>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>{label}</label>
      {children}
    </div>
  )
}

const inp = {
  background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6,
  padding: '6px 10px', color: 'var(--ink)', fontSize: 13, width: '100%', boxSizing: 'border-box',
}
const textarea = { ...inp, resize: 'vertical', minHeight: 72, fontFamily: 'inherit' }

function StdModal({ title, onClose, children }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 620,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', border: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><XCircle size={19} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
