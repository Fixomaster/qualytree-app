// src/pages/infrastructure/InfrastructureHub.jsx
// ISO 13485 §6.3 — 인프라 관리 허브
// 건물·시설 / IT·소프트웨어 / 유틸리티 / 지원서비스
import React, { useState, useMemo } from 'react'
import {
  Plus, Save, Edit2, Trash2, CheckCircle2, Clock,
  AlertTriangle, FileText, Wrench, Building2,
  Monitor, Zap, Truck, BarChart2, Link2, X,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

// ── 상수 ─────────────────────────────────────────────────────
const LS_KEY = 'qualytree.infrastructure'

const INFRA_CATEGORIES = {
  building:  { label: '건물·시설',     icon: Building2, color: '#7C3AED', bg: '#EDE9FE' },
  it:        { label: 'IT·소프트웨어', icon: Monitor,   color: '#2563EB', bg: '#DBEAFE' },
  utility:   { label: '유틸리티',      icon: Zap,       color: '#D97706', bg: '#FEF3C7' },
  service:   { label: '지원 서비스',   icon: Truck,     color: '#059669', bg: '#D1FAE5' },
  other:     { label: '기타',          icon: Wrench,    color: '#6B7280', bg: '#F3F4F6' },
}

const ITEM_STATUSES = {
  active:          { label: '운영 중',    color: '#059669', bg: '#D1FAE5' },
  maintenance:     { label: '점검 중',    color: '#D97706', bg: '#FEF3C7' },
  out_of_service:  { label: '사용 불가', color: '#DC2626', bg: '#FEE2E2' },
  retired:         { label: '폐기',       color: '#9CA3AF', bg: '#F3F4F6' },
}

const MAINT_FREQ = ['월 1회', '분기 1회', '반기 1회', '연 1회', '2년 1회', '수시', '기타']

const DEFAULT_CHECK_ITEMS_BY_CAT = {
  building: ['구조물 이상 여부 확인', '청결 상태 점검', '누수·누기 여부', '소화설비 정상 여부', '비상구·피난 통로 확보', '조도 적정 여부'],
  it:       ['하드웨어 이상 여부', '소프트웨어 라이선스 유효 여부', '백업 정상 동작', '보안 패치 적용 여부', '네트워크 연결 상태', '데이터 무결성 확인'],
  utility:  ['전력 공급 안정 여부', '용수 수질·공급 정상', '압축공기 압력·순도 확인', '냉난방 시스템 작동', 'UPS·비상전원 점검'],
  service:  ['계약 유효 여부 확인', '서비스 SLA 준수 여부', '공급업체 성과 평가', '대체 공급처 확보 여부'],
  other:    ['항목 이상 여부 확인', '유지보수 이력 갱신'],
}

function genId() { return `INF-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function genMntId() { return `MNT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function today() { return new Date().toISOString().slice(0, 10) }

function daysDiff(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

const EMPTY_FORM = {
  name: '', category: 'building', location: '', description: '',
  manufacturer: '', model: '', serialNo: '', installDate: '',
  status: 'active', owner: '', responsible: '',
  maintFreq: '연 1회', lastMaintDate: '', nextMaintDate: '',
  linkedCalId: '', linkedChangeId: '',
  notes: '',
  checkItems: DEFAULT_CHECK_ITEMS_BY_CAT.building.map(n => ({ name: n, required: true })),
}

// ── 메인 ─────────────────────────────────────────────────────
export default function InfrastructureHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
  })

  const [tab, setTab] = useState('list')   // list | detail | analysis
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [filterCat, setFilterCat] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showMntForm, setShowMntForm] = useState(false)
  const [mntForm, setMntForm] = useState({ date: today(), performedBy: '', verdict: 'pass', notes: '', checkResults: [] })

  function save(list) { setItems(list); localStorage.setItem(LS_KEY, JSON.stringify(list)) }

  function onCategoryChange(cat) {
    setForm(f => ({
      ...f, category: cat,
      checkItems: (DEFAULT_CHECK_ITEMS_BY_CAT[cat] || []).map(n => ({ name: n, required: true })),
    }))
  }

  function submitItem() {
    if (!form.name.trim()) return alert('인프라명을 입력하세요.')
    const next = editId
      ? items.map(i => i.id === editId ? { ...i, ...form } : i)
      : [{ id: genId(), createdAt: today(), maintenanceHistory: [], ...form }, ...items]
    save(next)
    setShowForm(false); setForm(EMPTY_FORM); setEditId(null)
  }

  function deleteItem(id) {
    if (!confirm('인프라 항목을 삭제하시겠습니까?')) return
    save(items.filter(i => i.id !== id))
    if (selectedId === id) { setSelectedId(null); setTab('list') }
  }

  function quickStatus(id, status) {
    save(items.map(i => i.id === id ? { ...i, status } : i))
  }

  function startMnt(item) {
    setMntForm({
      date: today(), performedBy: '', verdict: 'pass', notes: '',
      checkResults: (item.checkItems || []).map(c => ({ name: c.name, result: null })),
    })
    setShowMntForm(true)
  }

  function submitMnt(itemId) {
    if (!mntForm.performedBy.trim()) return alert('수행자를 입력하세요.')
    const entry = { id: genMntId(), ...mntForm }
    // 다음 점검일 계산
    const freqMap = { '월 1회': 1, '분기 1회': 3, '반기 1회': 6, '연 1회': 12, '2년 1회': 24 }
    const months = freqMap[items.find(i => i.id === itemId)?.maintFreq] || 12
    const next = new Date(mntForm.date)
    next.setMonth(next.getMonth() + months)
    const nextDateStr = next.toISOString().slice(0, 10)
    save(items.map(i => {
      if (i.id !== itemId) return i
      return {
        ...i,
        lastMaintDate: mntForm.date,
        nextMaintDate: nextDateStr,
        maintenanceHistory: [...(i.maintenanceHistory || []), entry],
      }
    }))
    setShowMntForm(false)
  }

  const selected = items.find(i => i.id === selectedId)

  const filtered = useMemo(() => items.filter(i => {
    if (filterCat !== 'all' && i.category !== filterCat) return false
    if (filterStatus !== 'all' && i.status !== filterStatus) return false
    return true
  }), [items, filterCat, filterStatus])

  // 분석
  const analysis = useMemo(() => {
    const byCat = {}
    Object.keys(INFRA_CATEGORIES).forEach(k => { byCat[k] = items.filter(i => i.category === k).length })
    const byStatus = {}
    Object.keys(ITEM_STATUSES).forEach(k => { byStatus[k] = items.filter(i => i.status === k).length })
    const overdueItems = items.filter(i => {
      const d = daysDiff(i.nextMaintDate)
      return d !== null && d < 0 && i.status !== 'retired'
    })
    const nearItems = items.filter(i => {
      const d = daysDiff(i.nextMaintDate)
      return d !== null && d >= 0 && d <= 30 && i.status !== 'retired'
    })
    return { byCat, byStatus, overdueItems, nearItems }
  }, [items])

  return (
    <AppLayout user={user} title="인프라 관리" subtitle="ISO 13485 §6.3 — 건물·시설·IT·유틸리티·지원서비스">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'list',     label: `인프라 목록 (${items.length})` },
            { key: 'detail',   label: '상세·유지보수', disabled: !selectedId },
            { key: 'analysis', label: '현황 분석' },
          ].map(t => (
            <button key={t.key} onClick={() => !t.disabled && setTab(t.key)} disabled={t.disabled}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: t.disabled ? 'var(--ink-faint)' : tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                border: 'none', cursor: t.disabled ? 'not-allowed' : 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 목록 탭 ── */}
        {tab === 'list' && (
          <div>
            {/* 카테고리 필터 탭 */}
            <div className="flex gap-1 flex-wrap mb-3">
              <CatTabBtn active={filterCat === 'all'} onClick={() => setFilterCat('all')} label="전체" color="#6B7280" />
              {Object.entries(INFRA_CATEGORIES).map(([k, v]) => (
                <CatTabBtn key={k} active={filterCat === k} onClick={() => setFilterCat(filterCat === k ? 'all' : k)}
                  label={v.label} color={v.color} count={analysis.byCat[k]} />
              ))}
            </div>

            <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">전체 상태</option>
                {Object.entries(ITEM_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 인프라 항목 등록
                </button>
              )}
            </div>

            {showForm && (
              <ItemForm form={form} setForm={setForm} onSave={submitItem}
                onCancel={() => { setShowForm(false); setForm(EMPTY_FORM); setEditId(null) }}
                isEdit={!!editId} onCategoryChange={onCategoryChange} />
            )}

            {/* 점검 기한 경보 배너 */}
            {(analysis.overdueItems.length > 0 || analysis.nearItems.length > 0) && (
              <div className="mb-4 space-y-2">
                {analysis.overdueItems.length > 0 && (
                  <div className="p-3 rounded-xl flex items-center gap-2 text-[12.5px]"
                    style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B' }}>
                    <AlertTriangle size={14} />
                    점검 기한 초과 {analysis.overdueItems.length}건:
                    {analysis.overdueItems.slice(0, 3).map(i => (
                      <span key={i.id} className="font-bold cursor-pointer underline" onClick={() => { setSelectedId(i.id); setTab('detail') }}>{i.name}</span>
                    ))}
                    {analysis.overdueItems.length > 3 && <span> 외 {analysis.overdueItems.length - 3}건</span>}
                  </div>
                )}
                {analysis.nearItems.length > 0 && (
                  <div className="p-3 rounded-xl flex items-center gap-2 text-[12.5px]"
                    style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E' }}>
                    <Clock size={14} />
                    30일 내 점검 예정 {analysis.nearItems.length}건:
                    {analysis.nearItems.slice(0, 3).map(i => (
                      <span key={i.id} className="font-bold cursor-pointer underline" onClick={() => { setSelectedId(i.id); setTab('detail') }}>{i.name}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
                <Building2 size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div className="text-[14px]">등록된 인프라 항목이 없습니다.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(item => {
                  const cat = INFRA_CATEGORIES[item.category] || INFRA_CATEGORIES.other
                  const st = ITEM_STATUSES[item.status] || ITEM_STATUSES.active
                  const CatIcon = cat.icon
                  const daysLeft = daysDiff(item.nextMaintDate)
                  const isOverdue = daysLeft !== null && daysLeft < 0
                  const isNear = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30
                  return (
                    <div key={item.id} className="p-4 rounded-2xl cursor-pointer transition"
                      style={{ background: 'var(--bg-card)', border: `1.5px solid ${isOverdue ? '#FECACA' : isNear ? '#FDE68A' : 'var(--line)'}` }}
                      onClick={() => { setSelectedId(item.id); setTab('detail') }}>
                      <div className="flex items-start gap-3 mb-2">
                        <div className="p-2 rounded-xl" style={{ background: cat.bg }}>
                          <CatIcon size={16} style={{ color: cat.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{item.id}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          </div>
                          <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{item.name}</div>
                          <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>{cat.label} {item.location ? `· ${item.location}` : ''}</div>
                        </div>
                      </div>

                      {/* 점검 정보 */}
                      <div className="mt-2 p-2 rounded-xl text-[11.5px]" style={{ background: isOverdue ? '#FEF2F2' : isNear ? '#FFFBEB' : 'var(--bg-soft)' }}>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--ink-faint)' }}>최근 점검</span>
                          <span style={{ color: 'var(--ink-soft)' }}>{item.lastMaintDate || '-'}</span>
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span style={{ color: 'var(--ink-faint)' }}>다음 점검</span>
                          <span className="font-bold" style={{ color: isOverdue ? '#DC2626' : isNear ? '#D97706' : 'var(--ink)' }}>
                            {item.nextMaintDate || '-'}
                            {daysLeft !== null && (
                              <span className="ml-1">{isOverdue ? `(${Math.abs(daysLeft)}일 초과)` : `(D-${daysLeft})`}</span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span style={{ color: 'var(--ink-faint)' }}>주기</span>
                          <span style={{ color: 'var(--ink-soft)' }}>{item.maintFreq}</span>
                        </div>
                      </div>

                      {canEdit && (
                        <div className="flex gap-1 mt-3 flex-wrap" onClick={e => e.stopPropagation()}>
                          {item.status === 'active' && (
                            <QuickBtn label="점검 기록" color="#059669"
                              onClick={() => { setSelectedId(item.id); setTab('detail'); startMnt(item) }} />
                          )}
                          {item.status !== 'retired' && item.status !== 'out_of_service' && (
                            <QuickBtn label="사용 불가" color="#DC2626" onClick={() => quickStatus(item.id, 'out_of_service')} />
                          )}
                          {item.status === 'out_of_service' && (
                            <QuickBtn label="복구" color="#059669" onClick={() => quickStatus(item.id, 'active')} />
                          )}
                          <button onClick={() => { setForm({ ...EMPTY_FORM, ...item }); setEditId(item.id); setShowForm(true) }}
                            className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                            <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                          </button>
                          <button onClick={() => deleteItem(item.id)}
                            className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                            <Trash2 size={12} style={{ color: '#DC2626' }} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 상세 탭 ── */}
        {tab === 'detail' && selected && (
          <DetailView
            item={selected} canEdit={canEdit}
            showMntForm={showMntForm} setShowMntForm={setShowMntForm}
            mntForm={mntForm} setMntForm={setMntForm}
            startMnt={startMnt} submitMnt={submitMnt}
          />
        )}

        {/* ── 분석 탭 ── */}
        {tab === 'analysis' && (
          <AnalysisView analysis={analysis} items={items} setSelectedId={setSelectedId} setTab={setTab} />
        )}
      </div>
    </AppLayout>
  )
}

// ── 상세 뷰 ──────────────────────────────────────────────────
function DetailView({ item, canEdit, showMntForm, setShowMntForm, mntForm, setMntForm, startMnt, submitMnt }) {
  const [newCheckName, setNewCheckName] = useState('')
  const addCheckItem = () => {
    const name = newCheckName.trim()
    if (!name) return
    setMntForm(f => ({ ...f, checkResults: [...f.checkResults, { name, result: null }] }))
    setNewCheckName('')
  }
  const removeCheckItem = (i) => {
    setMntForm(f => ({ ...f, checkResults: f.checkResults.filter((_, idx) => idx !== i) }))
  }
  const cat = INFRA_CATEGORIES[item.category] || INFRA_CATEGORIES.other
  const st = ITEM_STATUSES[item.status] || ITEM_STATUSES.active
  const CatIcon = cat.icon
  const daysLeft = daysDiff(item.nextMaintDate)
  const isOverdue = daysLeft !== null && daysLeft < 0
  const isNear = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-2xl" style={{ background: cat.bg }}>
            <CatIcon size={22} style={{ color: cat.color }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[12px] font-mono" style={{ color: 'var(--ink-faint)' }}>{item.id}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
            </div>
            <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{item.name}</div>
            {item.description && <div className="text-[13px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>{item.description}</div>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {[
            { label: '위치', value: item.location || '-' },
            { label: '제조사', value: item.manufacturer || '-' },
            { label: '모델', value: item.model || '-' },
            { label: '시리얼', value: item.serialNo || '-' },
            { label: '설치일', value: item.installDate || '-' },
            { label: '관리 부서', value: item.owner || '-' },
            { label: '담당자', value: item.responsible || '-' },
            { label: '점검 주기', value: item.maintFreq },
          ].map(({ label, value }) => (
            <div key={label} className="p-2 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
              <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{label}</div>
              <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 점검 상태 */}
        <div className="p-3 rounded-xl mb-3" style={{ background: isOverdue ? '#FEE2E2' : isNear ? '#FEF3C7' : 'var(--bg-soft)', border: `1px solid ${isOverdue ? '#FECACA' : isNear ? '#FDE68A' : 'var(--line)'}` }}>
          <div className="flex gap-6 text-[12.5px] flex-wrap">
            <div><span style={{ color: 'var(--ink-faint)' }}>최근 점검: </span><strong style={{ color: 'var(--ink)' }}>{item.lastMaintDate || '-'}</strong></div>
            <div>
              <span style={{ color: 'var(--ink-faint)' }}>다음 점검: </span>
              <strong style={{ color: isOverdue ? '#DC2626' : isNear ? '#D97706' : 'var(--ink)' }}>
                {item.nextMaintDate || '-'}
                {daysLeft !== null && ` (${isOverdue ? `${Math.abs(daysLeft)}일 초과` : `D-${daysLeft}`})`}
              </strong>
            </div>
            <div><span style={{ color: 'var(--ink-faint)' }}>점검 이력: </span><strong style={{ color: 'var(--ink)' }}>{(item.maintenanceHistory || []).length}건</strong></div>
          </div>
        </div>

        {(item.linkedCalId || item.linkedChangeId) && (
          <div className="flex gap-2 flex-wrap mb-2">
            {item.linkedCalId && <LinkChip label={`교정: ${item.linkedCalId}`} color="#2563EB" />}
            {item.linkedChangeId && <LinkChip label={`변경: ${item.linkedChangeId}`} color="#7C3AED" />}
          </div>
        )}

        {canEdit && !showMntForm && (
          <button onClick={() => startMnt(item)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold mt-2"
            style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Wrench size={13} /> 점검 기록 추가
          </button>
        )}
      </div>

      {/* 점검 기록 폼 */}
      {showMntForm && canEdit && (
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>점검 기록 입력</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>점검일 *</label>
              <input type="date" value={mntForm.date} onChange={e => setMntForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>수행자 *</label>
              <input type="text" value={mntForm.performedBy} onChange={e => setMntForm(f => ({ ...f, performedBy: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>종합 판정</label>
              <select value={mntForm.verdict} onChange={e => setMntForm(f => ({ ...f, verdict: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="pass">이상 없음</option>
                <option value="minor">경미한 문제 (조치 중)</option>
                <option value="fail">이상 발견 (즉시 조치 필요)</option>
              </select>
            </div>
          </div>

          {/* 체크 항목 */}
          <div className="mb-4">
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink)' }}>점검 항목</div>
            {mntForm.checkResults.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {mntForm.checkResults.map((ch, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
                    <span className="flex-1 text-[12.5px]" style={{ color: 'var(--ink)' }}>{ch.name}</span>
                    <div className="flex gap-1">
                      {[{ v: 'pass', label: '이상無', c: '#059669' }, { v: 'fail', label: '이상有', c: '#DC2626' }, { v: 'na', label: 'N/A', c: '#9CA3AF' }].map(({ v, label, c }) => (
                        <button key={v} onClick={() => {
                          const r = [...mntForm.checkResults]
                          r[i] = { ...r[i], result: r[i].result === v ? null : v }
                          setMntForm(f => ({ ...f, checkResults: r }))
                        }}
                          className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold"
                          style={{ background: ch.result === v ? c : 'var(--bg)', color: ch.result === v ? '#fff' : c, border: `1px solid ${c}50`, cursor: 'pointer' }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => removeCheckItem(i)} className="text-slate-300 hover:text-rose-600"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={newCheckName} onChange={e => setNewCheckName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem() } }}
                placeholder="점검 항목명을 입력 후 추가 (예: 배수구 상태 확인)"
                className="flex-1 px-3 py-1.5 rounded-xl text-[12.5px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              <button onClick={addCheckItem}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12.5px] font-bold"
                style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
                <Plus size={13} /> 추가
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>비고·조치 내용</label>
            <textarea value={mntForm.notes} onChange={e => setMntForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
          </div>

          <div className="flex gap-2">
            <button onClick={() => submitMnt(item.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
              style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <Save size={13} /> 저장
            </button>
            <button onClick={() => setShowMntForm(false)}
              className="px-4 py-2 rounded-xl text-[13px]"
              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>취소</button>
          </div>
        </div>
      )}

      {/* 점검 이력 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>점검 이력 ({(item.maintenanceHistory || []).length}건)</div>
        {(item.maintenanceHistory || []).length === 0 ? (
          <div className="text-center py-8 text-[13px]" style={{ color: 'var(--ink-faint)' }}>점검 이력이 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {[...(item.maintenanceHistory || [])].reverse().map(m => {
              const verdictMap = { pass: { label: '이상 없음', color: '#059669', bg: '#D1FAE5' }, minor: { label: '경미한 문제', color: '#D97706', bg: '#FEF3C7' }, fail: { label: '이상 발견', color: '#DC2626', bg: '#FEE2E2' } }
              const v = verdictMap[m.verdict] || verdictMap.pass
              return (
                <div key={m.id} className="p-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <span className="text-[12px] font-bold" style={{ color: 'var(--ink)' }}>{m.date}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: v.bg, color: v.color }}>{v.label}</span>
                    <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{m.performedBy}</span>
                    <span className="text-[10.5px] font-mono ml-auto" style={{ color: 'var(--ink-faint)' }}>{m.id}</span>
                  </div>
                  {m.notes && <div className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>{m.notes}</div>}
                  {m.checkResults && m.checkResults.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.checkResults.filter(c => c.result === 'fail').map((c, i) => (
                        <span key={i} className="text-[10.5px] px-1.5 py-0.5 rounded" style={{ background: '#FEE2E2', color: '#DC2626' }}>⚠ {c.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 분석 탭 ──────────────────────────────────────────────────
function AnalysisView({ analysis, items, setSelectedId, setTab }) {
  return (
    <div className="space-y-5">
      {/* 카테고리 현황 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(INFRA_CATEGORIES).map(([k, v]) => {
          const Icon = v.icon
          return (
            <div key={k} className="p-4 rounded-2xl text-center" style={{ background: v.bg, border: `1px solid ${v.color}30` }}>
              <Icon size={18} style={{ color: v.color, margin: '0 auto 6px' }} />
              <div className="text-[24px] font-bold" style={{ color: v.color }}>{analysis.byCat[k] || 0}</div>
              <div className="text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{v.label}</div>
            </div>
          )
        })}
      </div>

      {/* 상태별 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(ITEM_STATUSES).map(([k, v]) => (
          <div key={k} className="p-4 rounded-2xl text-center" style={{ background: v.bg, border: `1px solid ${v.color}40` }}>
            <div className="text-[26px] font-bold" style={{ color: v.color }}>{analysis.byStatus[k] || 0}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{v.label}</div>
          </div>
        ))}
      </div>

      {analysis.overdueItems.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: '#DC2626' }}>⚠ 점검 기한 초과 ({analysis.overdueItems.length}건)</div>
          <div className="space-y-1.5">
            {analysis.overdueItems.map(item => {
              const d = daysDiff(item.nextMaintDate)
              return (
                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer"
                  style={{ background: '#FFF5F5', border: '1px solid #FECACA' }}
                  onClick={() => { setSelectedId(item.id); setTab('detail') }}>
                  <div className="text-[12px] font-bold" style={{ color: '#991B1B' }}>{item.name}</div>
                  <div className="text-[11px]" style={{ color: '#DC2626' }}>{Math.abs(d)}일 초과</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {analysis.nearItems.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: '#92400E' }}>⏰ 30일 내 점검 예정 ({analysis.nearItems.length}건)</div>
          <div className="space-y-1.5">
            {analysis.nearItems.map(item => {
              const d = daysDiff(item.nextMaintDate)
              return (
                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer"
                  style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}
                  onClick={() => { setSelectedId(item.id); setTab('detail') }}>
                  <div className="text-[12px] font-bold" style={{ color: '#78350F' }}>{item.name}</div>
                  <div className="text-[11px] font-bold" style={{ color: '#D97706' }}>D-{d}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 등록 폼 ──────────────────────────────────────────────────
function ItemForm({ form, setForm, onSave, onCancel, isEdit, onCategoryChange }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="mb-6 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>
        {isEdit ? '인프라 항목 수정' : '인프라 항목 등록'}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="명칭 *" value={form.name} onChange={v => F('name', v)} />
        <div>
          <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>분류</label>
          <select value={form.category} onChange={e => onCategoryChange(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            {Object.entries(INFRA_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <FieldSelect label="상태" value={form.status} onChange={v => F('status', v)}
          options={Object.entries(ITEM_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Field label="위치" value={form.location} onChange={v => F('location', v)} />
        <Field label="제조사" value={form.manufacturer} onChange={v => F('manufacturer', v)} />
        <Field label="모델명" value={form.model} onChange={v => F('model', v)} />
        <Field label="시리얼 번호" value={form.serialNo} onChange={v => F('serialNo', v)} />
        <Field label="설치일" type="date" value={form.installDate} onChange={v => F('installDate', v)} />
        <Field label="관리 부서" value={form.owner} onChange={v => F('owner', v)} />
        <Field label="담당자" value={form.responsible} onChange={v => F('responsible', v)} />
        <FieldSelect label="점검 주기" value={form.maintFreq} onChange={v => F('maintFreq', v)}
          options={MAINT_FREQ.map(t => ({ value: t, label: t }))} />
        <Field label="다음 점검 예정일" type="date" value={form.nextMaintDate} onChange={v => F('nextMaintDate', v)} />
        <Field label="연결 교정 ID" value={form.linkedCalId} onChange={v => F('linkedCalId', v)} placeholder="CAL-xxxx" />
        <Field label="연결 변경관리 ID" value={form.linkedChangeId} onChange={v => F('linkedChangeId', v)} placeholder="CHG-xxxx" />
      </div>
      <div className="mb-4">
        <FieldArea label="설명·비고" value={form.description} onChange={v => F('description', v)} rows={2} />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Save size={13} /> 저장
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>취소</button>
      </div>
    </div>
  )
}

// ── 공통 ─────────────────────────────────────────────────────
function CatTabBtn({ active, onClick, label, color, count }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold flex items-center gap-1"
      style={{
        background: active ? color : 'var(--bg-card)',
        color: active ? '#fff' : color,
        border: `1px solid ${color}60`,
        cursor: 'pointer',
      }}>
      {label}
      {count !== undefined && <span className="text-[10px] opacity-80">({count})</span>}
    </button>
  )
}

function QuickBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} className="px-2 py-1 rounded-lg text-[11px] font-bold"
      style={{ background: `${color}15`, border: `1px solid ${color}40`, color, cursor: 'pointer' }}>
      {label}
    </button>
  )
}

function LinkChip({ label, color }) {
  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: color + '15', color, border: `1px solid ${color}40` }}>
      <Link2 size={9} /> {label}
    </span>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
function FieldArea({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows}
        className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
