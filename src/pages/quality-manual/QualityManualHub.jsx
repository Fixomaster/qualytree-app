// src/pages/quality-manual/QualityManualHub.jsx
// ISO 13485 품질매뉴얼 — 본문 작성·AI 초안·개정이력·전체보기·PDF 출력
// [Fix] quality_manual_sections 테이블 없음 → company_data 테이블 사용
// [Fix] profiles.company_id → auth.current()?.company?.id 로 수정
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { auth } from '../../lib/auth'
import AppLayout from '../../components/AppLayout'
import RichTextEditor from '../../components/RichTextEditor'
import RichView from '../../components/RichView'
import { htmlToText } from '../../lib/richText'
import { BookOpen, Edit3, History, Eye, Printer, Sparkles, Save, ChevronDown, ChevronRight, Check } from 'lucide-react'

const QM_SECTIONS = [
  { id: '1',    title: '1. 적용 범위',                  clause: '§1' },
  { id: '4',    title: '4. 품질경영시스템',              clause: '§4' },
  { id: '4.1',  title: '4.1 일반 요구사항',              clause: '§4.1' },
  { id: '4.2',  title: '4.2 문서화 요구사항',            clause: '§4.2' },
  { id: '5',    title: '5. 경영 책임',                   clause: '§5' },
  { id: '5.1',  title: '5.1 경영 의지',                  clause: '§5.1' },
  { id: '5.2',  title: '5.2 고객 중심',                  clause: '§5.2' },
  { id: '5.3',  title: '5.3 품질 방침',                  clause: '§5.3' },
  { id: '5.4',  title: '5.4 기획',                       clause: '§5.4' },
  { id: '5.5',  title: '5.5 책임·권한·의사소통',          clause: '§5.5' },
  { id: '5.6',  title: '5.6 경영 검토',                  clause: '§5.6' },
  { id: '6',    title: '6. 자원 관리',                   clause: '§6' },
  { id: '6.1',  title: '6.1 자원 확보',                  clause: '§6.1' },
  { id: '6.2',  title: '6.2 인적 자원',                  clause: '§6.2' },
  { id: '6.3',  title: '6.3 인프라',                     clause: '§6.3' },
  { id: '6.4',  title: '6.4 작업 환경',                  clause: '§6.4' },
  { id: '7',    title: '7. 제품 실현',                   clause: '§7' },
  { id: '7.1',  title: '7.1 제품 실현 기획',             clause: '§7.1' },
  { id: '7.2',  title: '7.2 고객 관련 프로세스',         clause: '§7.2' },
  { id: '7.3',  title: '7.3 설계 및 개발',               clause: '§7.3' },
  { id: '7.4',  title: '7.4 구매',                       clause: '§7.4' },
  { id: '7.5',  title: '7.5 생산 및 서비스 제공',        clause: '§7.5' },
  { id: '7.6',  title: '7.6 모니터링·측정 장비 관리',    clause: '§7.6' },
  { id: '8',    title: '8. 측정·분석·개선',              clause: '§8' },
  { id: '8.1',  title: '8.1 일반',                       clause: '§8.1' },
  { id: '8.2',  title: '8.2 모니터링 및 측정',           clause: '§8.2' },
  { id: '8.3',  title: '8.3 부적합품 관리',              clause: '§8.3' },
  { id: '8.4',  title: '8.4 데이터 분석',                clause: '§8.4' },
  { id: '8.5',  title: '8.5 개선',                       clause: '§8.5' },
]

const TABS = [
  { id: 'write',   label: '본문 작성',   icon: Edit3 },
  { id: 'history', label: '개정 이력',   icon: History },
  { id: 'view',    label: '전체 보기',   icon: Eye },
]

// ── company_id 헬퍼 ──────────────────────────────────────────────────────────
async function getCompanyId() {
  // 1순위: auth.current()에서 company.id
  const session = auth.current()
  if (session?.company?.id) return session.company.id
  // 2순위: Supabase auth user → company_members 조회
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: member } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single()
      if (member?.company_id) return member.company_id
    }
  } catch (e) {
    console.warn('[QualityManualHub] company_id 조회 실패:', e)
  }
  return null
}

// ── Supabase company_data 헬퍼 ───────────────────────────────────────────────
const DATA_TYPE_CONTENT  = 'quality_manual_content'
const DATA_TYPE_REVISIONS = 'quality_manual_revisions'

async function loadSectionContent(companyId, sectionId) {
  const { data } = await supabase
    .from('company_data')
    .select('payload')
    .eq('company_id', companyId)
    .eq('data_type', DATA_TYPE_CONTENT)
    .eq('data_key', sectionId)
    .single()
  return data?.payload || null
}

async function loadAllContents(companyId) {
  const { data } = await supabase
    .from('company_data')
    .select('data_key, payload')
    .eq('company_id', companyId)
    .eq('data_type', DATA_TYPE_CONTENT)
  return (data || []).reduce((acc, row) => {
    acc[row.data_key] = row.payload
    return acc
  }, {})
}

async function saveSectionContent(companyId, sectionId, sectionTitle, content, userEmail) {
  const now = new Date().toISOString()
  const payload = { content, section_title: sectionTitle, updated_at: now, updated_by: userEmail }
  await supabase
    .from('company_data')
    .upsert({
      company_id: companyId,
      data_type: DATA_TYPE_CONTENT,
      data_key: sectionId,
      payload,
      updated_at: now,
    }, { onConflict: 'company_id,data_type,data_key' })
  // 개정이력 을탁
  const { data: revRow } = await supabase
    .from('company_data')
    .select('payload')
    .eq('company_id', companyId)
    .eq('data_type', DATA_TYPE_REVISIONS)
    .eq('data_key', 'all')
    .single()
  const revisions = revRow?.payload?.list || []
  revisions.unshift({ section_id: sectionId, section_title: sectionTitle, content, created_at: now, created_by: userEmail, note: '작적저장' })
  await supabase
    .from('company_data')
    .upsert({
      company_id: companyId,
      data_type: DATA_TYPE_REVISIONS,
      data_key: 'all',
      payload: { list: revisions.slice(0, 200) }, // 최대 200건 보관
      updated_at: now,
    }, { onConflict: 'company_id,data_type,data_key' })
}

async function loadRevisions(companyId) {
  const { data } = await supabase
    .from('company_data')
    .select('payload')
    .eq('company_id', companyId)
    .eq('data_type', DATA_TYPE_REVISIONS)
    .eq('data_key', 'all')
    .single()
  return data?.payload?.list || []
}

// ── 전체 버전 비교 (개정 이력 탭) ─────────────────────────────────────────────
// 조항을 저장할 때마다 개정 이력에 기록되므로, 특정 시점의 "전체 매뉴얼"은
// 그 시점까지 각 조항의 가장 마지막 저장본을 모으면 복원된다.
function VersionCompare({ revisions, sectionContents }) {
  const sorted = [...revisions].filter(r => r.created_at).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const n = sorted.length
  const fmt = (d) => new Date(d).toLocaleString('ko-KR')
  const options = [
    { key: 'current', label: '현재 버전 (최신 전체)' },
    ...sorted.map((r, i) => ({ key: 'r' + i, label: fmt(r.created_at) + ' 저장 직후 · ' + (r.section_title || r.section_id) })).reverse(),
    { key: 'empty', label: '최초 (첫 저장 이전)' },
  ]
  const [aKey, setAKey] = useState(n >= 2 ? 'r' + (n - 2) : 'empty')
  const [bKey, setBKey] = useState('current')
  const [onlyChanged, setOnlyChanged] = useState(true)

  const snapshot = (key) => {
    if (key === 'empty') return {}
    if (key === 'current') {
      const cur = {}
      QM_SECTIONS.forEach(sec => { const c = sectionContents[sec.id]?.content; if (c) cur[sec.id] = c })
      return cur
    }
    const idx = Number(key.slice(1)); const map = {}
    for (let i = 0; i <= idx && i < n; i++) map[sorted[i].section_id] = sorted[i].content
    return map
  }
  const A = snapshot(aKey), B = snapshot(bKey)
  const norm = (v) => (v || '').replace(/\s+/g, ' ').trim()
  const rows = QM_SECTIONS.map(sec => {
    const a = A[sec.id] || '', b = B[sec.id] || ''
    let status = 'same'
    if (!norm(a) && !norm(b)) status = 'none'
    else if (!norm(a)) status = 'added'
    else if (!norm(b)) status = 'removed'
    else if (norm(a) !== norm(b)) status = 'changed'
    return { sec, a, b, status }
  }).filter(r => r.status !== 'none')
  const changedCount = rows.filter(r => r.status !== 'same').length
  const shown = onlyChanged ? rows.filter(r => r.status !== 'same') : rows
  const badge = { changed: ['변경됨', '#fef3c7', '#92400e'], added: ['신규', '#dcfce7', '#166534'], removed: ['삭제됨', '#fee2e2', '#991b1b'], same: ['동일', '#f3f4f6', '#6b7280'] }
  const sel = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff', width: '100%' }

  if (n === 0) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 24 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>전체 버전 비교</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
        수정되기 전 전체 매뉴얼과 현재 전체 매뉴얼을 조항별로 나란히 비교합니다. (조항을 저장할 때마다 이력이 쌓입니다)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#6b7280' }}>이전 버전
          <select value={aKey} onChange={e => setAKey(e.target.value)} style={sel}>
            {options.filter(o => o.key !== 'current').map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: '#6b7280' }}>비교할 버전
          <select value={bKey} onChange={e => setBKey(e.target.value)} style={sel}>
            {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, fontSize: 13, color: '#374151' }}>
        <span>변경된 조항 <b>{changedCount}</b>개 / 전체 {rows.length}개</span>
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyChanged} onChange={e => setOnlyChanged(e.target.checked)} /> 변경된 조항만 보기 (해제하면 전체 조항 표시)
        </label>
      </div>
      {shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 13 }}>선택한 두 버전 사이에 변경된 조항이 없습니다.</div>
      ) : shown.map(({ sec, a, b, status }) => (
        <div key={sec.id} style={{ border: '1px solid ' + (status === 'same' ? '#e5e7eb' : '#fcd34d'), borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: status === 'same' ? '#f9fafb' : '#fffbeb', borderBottom: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{sec.title}</span>
            <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 999, background: badge[status][1], color: badge[status][2], fontWeight: 600 }}>{badge[status][0]}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ padding: 12, borderRight: '1px solid #e5e7eb', fontSize: 13, lineHeight: 1.7, background: status === 'changed' || status === 'removed' ? '#fffafa' : '#fff' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>이전 버전</div>
              <RichView value={a} empty={<span style={{ color: '#d1d5db' }}>(내용 없음)</span>} />
            </div>
            <div style={{ padding: 12, fontSize: 13, lineHeight: 1.7, background: status === 'changed' || status === 'added' ? '#f7fef9' : '#fff' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>비교 버전</div>
              <RichView value={b} empty={<span style={{ color: '#d1d5db' }}>(내용 없음)</span>} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 쮹포넌트 ──────────────────────────────────────────────────────────────────
export default function QualityManualHub() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => ['write', 'history', 'view'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'write')
  const [companyId, setCompanyId] = useState(null)
  const [companyName, setCompanyName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [selectedSection, setSelectedSection] = useState(QM_SECTIONS[0])
  const [sectionContents, setSectionContents] = useState({}) // { sectionId: { content, updatedAt } }
  const [editText, setEditText] = useState('')
  const [revisions, setRevisions] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState({ '4': true, '5': true, '6': true, '7': true, '8': true })
  const printRef = useRef()

  // 초기 로드
  useEffect(() => {
    async function init() {
      setLoading(true)
      const cid = await getCompanyId()
      setCompanyId(cid)
      if (cid) {
        // 회사명 로드
        const { data: co } = await supabase.from('companies').select('name').eq('id', cid).single()
        if (co?.name) setCompanyName(co.name)
        // 전체 섹션 내용 로드
        const contents = await loadAllContents(cid)
        const mapped = {}
        Object.entries(contents).forEach(([key, val]) => {
          mapped[key] = { content: val.content, updatedAt: val.updated_at }
        })
        setSectionContents(mapped)
        // 첫 섹션 편집창 초기화
        setEditText(mapped[QM_SECTIONS[0].id]?.content || '')
        // 개정이력 로드
        const revs = await loadRevisions(cid)
        setRevisions(revs)
      }
      // 사용자 이메일
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) setUserEmail(user.email)
      setLoading(false)
    }
    init()
  }, [])

  // 섹션 선택 시 편집 내용 갱신
  useEffect(() => {
    setEditText(sectionContents[selectedSection.id]?.content || '')
  }, [selectedSection])

  // 저장
  async function handleSave() {
    if (!companyId) { alert('회사 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.'); return }
    setSaving(true)
    await saveSectionContent(companyId, selectedSection.id, selectedSection.title, editText, userEmail)
    const now = new Date().toISOString()
    setSectionContents(prev => ({ ...prev, [selectedSection.id]: { content: editText, updatedAt: now } }))
    const revs = await loadRevisions(companyId)
    setRevisions(revs)
    setSaving(false)
    setSaveOk(true)
    setTimeout(() => setSaveOk(false), 2000)
  }

  // AI 초안 생성
  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `ISO 13485 품질매뉴얼 ${selectedSection.title}(${selectedSection.clause}) 조항에 대한 본문을 작성해주세요. 회사명: ${companyName || '당사'}. 의료기기 제조업체 관점에서 규제 요건을 충족하는 실용적인 내용으로 작성하세요.`,
        }),
      })
      const data = await res.json()
      if (data.content) setEditText(data.content)
    } catch (e) {
      alert('AI 초안 생성 중 오류가 발생했습니다.')
    }
    setGenerating(false)
  }

  // 인쇄/PDF
  function handlePrint() {
    window.print()
  }

  // 그룹 토글 (섹션 트리)
  function toggleGroup(id) {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // 섹션을 최상위(숫자만)와 하위로 구분
  const topSections = QM_SECTIONS.filter(s => !s.id.includes('.'))
  function getChildren(parentId) {
    return QM_SECTIONS.filter(s => s.id.startsWith(parentId + '.') && s.id.split('.').length === parentId.split('.').length + 1)
  }

  const completedCount = Object.keys(sectionContents).filter(k => sectionContents[k]?.content?.trim()).length

  if (loading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#6b7280' }}>
          품질매뉴얼 데이터를 불러오는 중...
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ background: '#1a4731', borderRadius: 10, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>품질매뉴얼</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>ISO 13485 §4.2.1 · 본문 작성 및 개정이력 관리</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>작성 완료</span>
            <span style={{ fontWeight: 700, color: '#1a4731' }}>{completedCount} / {QM_SECTIONS.length} 조항</span>
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e5e7eb' }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                  border: 'none', borderBottom: active ? '2px solid #1a4731' : '2px solid transparent',
                  background: 'none', cursor: 'pointer', color: active ? '#1a4731' : '#6b7280',
                  fontWeight: active ? 700 : 400, fontSize: 14, marginBottom: -1,
                }}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
          <button
            onClick={handlePrint}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280',
              fontSize: 14, marginLeft: 'auto',
            }}
          >
            <Printer size={15} />
            PDF 출력
          </button>
        </div>

        {/* 본문 작성 탭 */}
        {activeTab === 'write' && (
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
            {/* 섹션 트리 */}
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, height: 'fit-content' }}>
              {topSections.map(top => {
                const children = getChildren(top.id)
                const isGroup = children.length > 0
                const isExpanded = expandedGroups[top.id]
                const isSelected = selectedSection.id === top.id
                return (
                  <div key={top.id}>
                    <button
                      onClick={() => isGroup ? toggleGroup(top.id) : setSelectedSection(top)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                        padding: '6px 8px', borderRadius: 6, border: 'none',
                        background: isSelected && !isGroup ? '#e8f5ee' : 'none',
                        cursor: 'pointer', textAlign: 'left', fontSize: 13,
                        color: isSelected && !isGroup ? '#1a4731' : '#374151',
                        fontWeight: isSelected && !isGroup ? 600 : 400,
                      }}
                    >
                      {isGroup ? (isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <span style={{ width: 13 }} />}
                      <span style={{ flex: 1 }}>{top.title}</span>
                      {sectionContents[top.id]?.content && <Check size={12} color="#22c55e" />}
                    </button>
                    {isGroup && isExpanded && children.map(child => {
                      const isSel = selectedSection.id === child.id
                      return (
                        <button
                          key={child.id}
                          onClick={() => setSelectedSection(child)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                            padding: '5px 8px 5px 26px', borderRadius: 6, border: 'none',
                            background: isSel ? '#e8f5ee' : 'none',
                            cursor: 'pointer', textAlign: 'left', fontSize: 12,
                            color: isSel ? '#1a4731' : '#6b7280',
                            fontWeight: isSel ? 600 : 400,
                          }}
                        >
                          <span style={{ flex: 1 }}>{child.title}</span>
                          {sectionContents[child.id]?.content && <Check size={11} color="#22c55e" />}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* 편집 영역 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{selectedSection.title}</div>
                  {sectionContents[selectedSection.id]?.updatedAt && (
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      마지막 저장: {new Date(sectionContents[selectedSection.id].updatedAt).toLocaleString('ko-KR')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                      background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8,
                      color: '#15803d', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    <Sparkles size={14} />
                    {generating ? 'AI 생성 중...' : 'AI 초안 생성'}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                      background: saveOk ? '#f0fdf4' : '#1a4731', border: 'none', borderRadius: 8,
                      color: saveOk ? '#15803d' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {saveOk ? <Check size={14} /> : <Save size={14} />}
                    {saving ? '저장 중...' : saveOk ? '저장됨' : '저장'}
                  </button>
                </div>
              </div>
              <RichTextEditor
                value={editText}
                onChange={setEditText}
                minHeight={420}
                placeholder={`${selectedSection.title} 조항 내용을 입력하세요. Word·Excel·웹의 표/그림도 그대로 붙여넣을 수 있습니다.`}
              />
            </div>
          </div>
        )}

        {/* 개정 이력 탭 */}
        {activeTab === 'history' && (
          <div>
            <VersionCompare key={revisions.length} revisions={revisions} sectionContents={sectionContents} />
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
              총 {revisions.length}건의 개정 이력이 있습니다.
            </div>
            {revisions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                아직 저장된 개정 이력이 없습니다. 본문을 작성하고 저장하면 이력이 기록됩니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {revisions.map((rev, i) => (
                  <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{ background: '#e8f5ee', color: '#1a4731', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                        {rev.section_title || rev.section_id}
                      </span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>
                        {rev.created_at ? new Date(rev.created_at).toLocaleString('ko-KR') : ''}
                      </span>
                      <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>
                        {rev.created_by || ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'hidden', position: 'relative' }}>
                      {htmlToText(rev.content || '').slice(0, 300)}{htmlToText(rev.content || '').length > 300 ? '...' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 전체 보기 탭 */}
        {activeTab === 'view' && (
          <div ref={printRef} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 40 }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: 2, marginBottom: 8 }}>ISO 13485 QUALITY MANAGEMENT SYSTEM</div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0 }}>품질매뉴얼</h2>
              {companyName && <div style={{ fontSize: 16, color: '#6b7280', marginTop: 8 }}>{companyName}</div>}
            </div>
            {QM_SECTIONS.map(sec => {
              const entry = sectionContents[sec.id]
              if (!entry?.content) return null
              const isTop = !sec.id.includes('.')
              return (
                <div key={sec.id} style={{ marginBottom: 28 }}>
                  <div style={{
                    fontSize: isTop ? 18 : 15, fontWeight: isTop ? 800 : 700,
                    color: '#111827', borderBottom: isTop ? '2px solid #1a4731' : '1px solid #e5e7eb',
                    paddingBottom: 6, marginBottom: 12,
                  }}>
                    {sec.title}
                  </div>
                  <RichView value={entry.content} style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }} />
                </div>
              )
            })}
            {Object.keys(sectionContents).filter(k => sectionContents[k]?.content).length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                아직 작성된 조항이 없습니다.
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
