// src/pages/quality-manual/QualityManualHub.jsx
// ISO 13485 품질매뉴얼 — 본문 작성·AI 초안·개정이력·전체보기·PDF 출력
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import AppLayout from '../../components/AppLayout'
import { BookOpen, Edit3, History, Eye, Printer, Sparkles, Save, ChevronDown, ChevronRight, Check } from 'lucide-react'

const QM_SECTIONS = [
  { id: '1',   title: '1. 적용 범위',                   clause: '§1' },
  { id: '4',   title: '4. 품질경영시스템',               clause: '§4' },
  { id: '4.1', title: '4.1 일반 요구사항',               clause: '§4.1' },
  { id: '4.2', title: '4.2 문서화 요구사항',             clause: '§4.2' },
  { id: '5',   title: '5. 경영 책임',                    clause: '§5' },
  { id: '5.1', title: '5.1 경영 의지',                   clause: '§5.1' },
  { id: '5.2', title: '5.2 고객 중심',                   clause: '§5.2' },
  { id: '5.3', title: '5.3 품질 방침',                   clause: '§5.3' },
  { id: '5.4', title: '5.4 기획',                        clause: '§5.4' },
  { id: '5.5', title: '5.5 책임·권한·의사소통',          clause: '§5.5' },
  { id: '5.6', title: '5.6 경영 검토',                   clause: '§5.6' },
  { id: '6',   title: '6. 자원 관리',                    clause: '§6' },
  { id: '6.1', title: '6.1 자원 제공',                   clause: '§6.1' },
  { id: '6.2', title: '6.2 인적 자원',                   clause: '§6.2' },
  { id: '6.3', title: '6.3 인프라',                      clause: '§6.3' },
  { id: '6.4', title: '6.4 작업 환경',                   clause: '§6.4' },
  { id: '7',   title: '7. 제품 실현',                    clause: '§7' },
  { id: '7.1', title: '7.1 제품 실현 기획',              clause: '§7.1' },
  { id: '7.2', title: '7.2 고객 관련 프로세스',          clause: '§7.2' },
  { id: '7.3', title: '7.3 설계·개발',                   clause: '§7.3' },
  { id: '7.4', title: '7.4 구매',                        clause: '§7.4' },
  { id: '7.5', title: '7.5 생산·서비스 제공',            clause: '§7.5' },
  { id: '7.6', title: '7.6 모니터링·측정 장비 관리',     clause: '§7.6' },
  { id: '8',   title: '8. 측정·분석·개선',               clause: '§8' },
  { id: '8.1', title: '8.1 일반',                        clause: '§8.1' },
  { id: '8.2', title: '8.2 모니터링·측정',               clause: '§8.2' },
  { id: '8.3', title: '8.3 부적합 제품 관리',            clause: '§8.3' },
  { id: '8.4', title: '8.4 데이터 분석',                 clause: '§8.4' },
  { id: '8.5', title: '8.5 개선',                        clause: '§8.5' },
]

const TABS = [
  { key: 'write',   label: '본문 작성', icon: Edit3 },
  { key: 'history', label: '개정이력',  icon: History },
  { key: 'view',    label: '전체보기',  icon: Eye },
]

export default function QualityManualHub() {
  const [activeTab, setActiveTab] = useState('write')
  const [selectedSection, setSelectedSection] = useState(QM_SECTIONS[0])
  const [sectionContents, setSectionContents] = useState({})
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 })
  const [editText, setEditText] = useState('')
  const [companyName, setCompanyName] = useState('(주)귀사')
  const [expandedSections, setExpandedSections] = useState(new Set(['4','5','6','7','8']))
  const printRef = useRef()

  useEffect(() => { fetchAll() }, [])
  useEffect(() => {
    setEditText(sectionContents[selectedSection.id]?.content || '')
  }, [selectedSection.id, sectionContents])

  async function fetchAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
      if (profile?.company_id) {
        const { data: co } = await supabase.from('companies').select('name').eq('id', profile.company_id).single()
        if (co?.name) setCompanyName(co.name)
      }
    }
    const { data: contents } = await supabase.from('quality_manual_sections').select('*').order('updated_at', { ascending: false })
    if (contents) {
      const map = {}
      contents.forEach(c => { map[c.section_id] = c })
      setSectionContents(map)
    }
    const { data: revs } = await supabase.from('quality_manual_revisions').select('*').order('created_at', { ascending: false }).limit(50)
    if (revs) setRevisions(revs)
    setLoading(false)
  }

  async function handleSave() {
    if (!editText.trim()) return
    setSaving(true)
    const now = new Date().toISOString()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: existing } = await supabase.from('quality_manual_sections').select('id').eq('section_id', selectedSection.id).single()
    if (existing?.id) {
      await supabase.from('quality_manual_sections').update({ content: editText, updated_at: now, updated_by: user?.email }).eq('id', existing.id)
    } else {
      await supabase.from('quality_manual_sections').insert({ section_id: selectedSection.id, section_title: selectedSection.title, content: editText, updated_at: now, updated_by: user?.email })
    }
    await supabase.from('quality_manual_revisions').insert({ section_id: selectedSection.id, section_title: selectedSection.title, content: editText, created_at: now, created_by: user?.email, note: '수동 저장' })
    setSectionContents(prev => ({ ...prev, [selectedSection.id]: { content: editText, updatedAt: now } }))
    setSaving(false)
    fetchAll()
  }

  async function handleAIDraft() {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai-draft', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType: 'qm', fields: { section: selectedSection.clause + ' ' + selectedSection.title, company: companyName, productType: '의료기기' } }) })
      const data = await res.json()
      if (data.ok) setEditText(data.draft)
      else alert('AI 초안 생성 실패: ' + (data.error || ''))
    } catch (e) { alert('오류: ' + e.message) }
    setAiLoading(false)
  }
  async function handleBatchAIDraft() {
    const missing = QM_SECTIONS.filter(s => !sectionContents[s.id]?.content)
    if (missing.length === 0) { alert('모든 조항이 이미 작성되어 있습니다.'); return }
    if (!window.confirm('미작성 ' + missing.length + '개 조항을 AI로 일괄 생성하시겠습니까?')) return
    setBatchLoading(true)
    setBatchProgress({ done: 0, total: missing.length })
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()
    let done = 0
    for (const sec of missing) {
      try {
        const res = await fetch('/api/ai-draft', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docType: 'qm', fields: { section: sec.clause + ' ' + sec.title, company: companyName, productType: '의료기기' } }) })
        const data = await res.json()
        if (data.ok && data.draft) {
          const { data: ex } = await supabase.from('quality_manual_sections').select('id').eq('section_id', sec.id).single()
          if (ex?.id) { await supabase.from('quality_manual_sections').update({ content: data.draft, updated_at: now, updated_by: user?.email }).eq('id', ex.id) }
          else { await supabase.from('quality_manual_sections').insert({ section_id: sec.id, section_title: sec.title, content: data.draft, updated_at: now, updated_by: user?.email }) }
        }
      } catch (e) { /* skip */ }
      done++
      setBatchProgress({ done, total: missing.length })
    }
    setBatchLoading(false)
    fetchAll()
  }

  function toggleSection(id) {
    setExpandedSections(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const topLevel = QM_SECTIONS.filter(s => !s.id.includes('.'))
  const children = (pid) => QM_SECTIONS.filter(s => s.id.startsWith(pid + '.') && s.id.split('.').length === pid.split('.').length + 1)
  const doneCount = QM_SECTIONS.filter(s => sectionContents[s.id]?.content).length

  return (
    <AppLayout>
      <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <BookOpen size={21} style={{ color: 'var(--moss)' }} /> 품질매뉴얼
            </h1>
            <p style={{ color: 'var(--ink-faint)', margin: '3px 0 0', fontSize: 13 }}>ISO 13485 §4.2.2 — {doneCount}/{QM_SECTIONS.length}개 섹션 작성 완료</p>
          </div>
          {activeTab === 'view' && (
            <>
                        <button onClick={handleBatchAIDraft} disabled={batchLoading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', background: batchLoading ? 'var(--line)' : '#EDE9FE', color: batchLoading ? 'var(--ink-faint)' : '#7C3AED', border: '1px solid #DDD6FE', borderRadius: 8, cursor: batchLoading ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 600 }}>
              <Sparkles size={14} /> {batchLoading ? batchProgress.done + '/' + batchProgress.total + ' 생성 중...' : '전체 조항 AI 일괄생성'}
            </button>
            <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              <Printer size={14} /> PDF 출력
            </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid var(--line)', marginBottom: 20 }}>
          {TABS.map(t => { const Icon = t.icon; return (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13,
              fontWeight: activeTab === t.key ? 700 : 400, color: activeTab === t.key ? 'var(--moss)' : 'var(--ink-faint)',
              borderBottom: activeTab === t.key ? '2px solid var(--moss)' : '2px solid transparent', marginBottom: -2 }}>
              <Icon size={14} /> {t.label}
            </button>
          )})}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-faint)' }}>불러오는 중…</div>}

        {!loading && activeTab === 'write' && (
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'start' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 12, maxHeight: 600, overflowY: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8, padding: '0 4px' }}>섹션</div>
              {topLevel.map(sec => {
                const ch = children(sec.id)
                const exp = expandedSections.has(sec.id)
                return (
                  <div key={sec.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 6px', borderRadius: 6, cursor: 'pointer', background: selectedSection.id === sec.id ? 'rgba(60,130,90,0.08)' : 'transparent' }}
                      onClick={() => { setSelectedSection(sec); if (ch.length) toggleSection(sec.id) }}>
                      {ch.length > 0 && <span style={{ color: 'var(--ink-faint)', flexShrink: 0 }}>{exp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>}
                      <span style={{ fontSize: 12, fontWeight: selectedSection.id === sec.id ? 700 : 400, color: 'var(--ink)', flex: 1 }}>{sec.title}</span>
                      {sectionContents[sec.id]?.content && <Check size={11} style={{ color: 'var(--moss)', flexShrink: 0 }} />}
                    </div>
                    {exp && ch.map(child => (
                      <div key={child.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px 4px 22px', borderRadius: 6, cursor: 'pointer', background: selectedSection.id === child.id ? 'rgba(60,130,90,0.08)' : 'transparent' }}
                        onClick={() => setSelectedSection(child)}>
                        <span style={{ fontSize: 12, fontWeight: selectedSection.id === child.id ? 600 : 400, color: 'var(--ink)', flex: 1 }}>{child.title}</span>
                        {sectionContents[child.id]?.content && <Check size={11} style={{ color: 'var(--moss)', flexShrink: 0 }} />}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{selectedSection.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>{selectedSection.clause}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleAIDraft} disabled={aiLoading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: aiLoading ? 'var(--line)' : '#f0fdf4', color: aiLoading ? 'var(--ink-faint)' : 'var(--moss)', border: '1px solid rgba(60,130,90,0.3)', borderRadius: 7, cursor: aiLoading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
                    <Sparkles size={12} /> {aiLoading ? 'AI 생성 중…' : 'AI 초안'}
                  </button>
                  <button onClick={handleSave} disabled={saving || !editText.trim()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 16px', background: editText.trim() && !saving ? 'var(--moss)' : 'var(--line)', color: editText.trim() && !saving ? '#fff' : 'var(--ink-faint)', border: 'none', borderRadius: 7, cursor: editText.trim() && !saving ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600 }}>
                    <Save size={12} /> {saving ? '저장 중…' : '저장'}
                  </button>
                </div>
              </div>
              <textarea value={editText} onChange={e => setEditText(e.target.value)}
                placeholder={`${selectedSection.title}에 대한 내용을 작성하세요.\nAI 초안 버튼으로 초안을 생성할 수 있습니다.`}
                style={{ width: '100%', minHeight: 360, padding: '14px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, lineHeight: 1.8, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
              {sectionContents[selectedSection.id]?.updatedAt && (
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 8 }}>마지막 저장: {new Date(sectionContents[selectedSection.id].updatedAt).toLocaleString('ko-KR')}</div>
              )}
            </div>
          </div>
        )}

        {!loading && activeTab === 'history' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {['일시','섹션','작성자','비고'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid var(--line)', color: 'var(--ink-faint)', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {revisions.map((r, i) => (
                  <tr key={r.id || i} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--ink-faint)', fontSize: 12 }}>{new Date(r.created_at).toLocaleString('ko-KR')}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>{r.section_title}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--ink-faint)', fontSize: 12 }}>{r.created_by || '-'}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--ink-faint)', fontSize: 12 }}>{r.note || '-'}</td>
                  </tr>
                ))}
                {revisions.length === 0 && <tr><td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--ink-faint)' }}>개정이력 없음</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeTab === 'view' && (
          <div ref={printRef} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 32 }}>
            <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>
            <div style={{ textAlign: 'center', marginBottom: 32, borderBottom: '2px solid var(--line)', paddingBottom: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 4 }}>QT-QM-001</div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px' }}>품질매뉴얼</h1>
              <div style={{ fontSize: 14, color: 'var(--ink-faint)' }}>{companyName} · ISO 13485:2016</div>
            </div>
            {QM_SECTIONS.map(sec => {
              const cnt = sectionContents[sec.id]?.content
              if (!cnt) return null
              const isTop = !sec.id.includes('.')
              return (
                <div key={sec.id} style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: isTop ? 17 : 14, fontWeight: isTop ? 700 : 600, margin: '0 0 8px', color: 'var(--ink)', paddingLeft: isTop ? 0 : 12 }}>{sec.title}</h2>
                  <div style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--ink)', whiteSpace: 'pre-wrap', paddingLeft: isTop ? 0 : 12 }}>{cnt}</div>
                </div>
              )
            })}
            {Object.keys(sectionContents).length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink-faint)' }}>아직 작성된 섹션이 없습니다. 본문 작성 탭에서 내용을 입력하세요.</div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
