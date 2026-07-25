// src/pages/device-file/DeviceFileHub.jsx
// ISO 13485 §4.2.3 — 의료기기 파일 (Device Master Record / Technical File)
import React, { useState, useMemo } from 'react'
import {
  Plus, Save, Edit2, Trash2, Package, FileText,
  CheckCircle2, AlertTriangle, Link2, Layers,
  ChevronDown, ChevronRight, ShieldCheck, Tag,
  BarChart2, BookOpen, Cpu, ClipboardList,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

// ── 상수 ─────────────────────────────────────────────────────
const LS_KEY = 'qualytree.device_files'

// §4.2.3 필수 항목 카테고리
const FILE_SECTIONS = [
  { key: 'general',        label: '기기 일반 정보',    icon: Package,       clause: '§4.2.3(a)' },
  { key: 'specs',          label: '사양 및 설계',       icon: Cpu,           clause: '§4.2.3(b)' },
  { key: 'manufacturing',  label: '제조 절차',          icon: Layers,        clause: '§4.2.3(c)' },
  { key: 'qms',            label: 'QMS 요구사항',       icon: ShieldCheck,   clause: '§4.2.3(d)' },
  { key: 'risk',           label: '위험관리',           icon: AlertTriangle, clause: '§4.2.3(e)' },
  { key: 'labeling',       label: '라벨·포장',          icon: Tag,           clause: '§4.2.3(f)' },
  { key: 'regulatory',     label: '인허가',             icon: BookOpen,      clause: '§4.2.3(g)' },
  { key: 'links',          label: '연결 문서',          icon: Link2,         clause: '참조' },
]

const DEVICE_CLASSES = ['Class I', 'Class II', 'Class IIa', 'Class IIb', 'Class III', '미분류']
const STERILITY_OPTIONS = ['비멸균', '멸균 (EO)', '멸균 (감마선)', '멸균 (증기)', '멸균 (기타)']
const FILE_STATUSES = {
  draft:    { label: '초안',   color: '#9CA3AF', bg: '#F3F4F6' },
  review:   { label: '검토',   color: '#D97706', bg: '#FEF3C7' },
  approved: { label: '승인',   color: '#059669', bg: '#D1FAE5' },
  obsolete: { label: '폐기',   color: '#6B7280', bg: '#F3F4F6' },
}

function genId() { return `DMR-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function today() { return new Date().toISOString().slice(0, 10) }

const EMPTY_FILE = {
  // §4.2.3(a) 기기 일반 정보
  productName: '', productCode: '', modelNo: '', revision: 'Rev.0',
  deviceClass: 'Class II', intendedUse: '', indications: '',
  contraindications: '', patientPopulation: '',
  sterility: '비멸균', singleUse: false, implantable: false, activeDevice: false,
  status: 'draft', preparedBy: '', reviewedBy: '', approvedBy: '',
  issueDate: today(), reviewDate: '',

  // §4.2.3(b) 사양 및 설계
  drawingNos: '', materialSpec: '', performanceSpec: '', safetySpec: '',
  biocompatibility: '', softwareVersion: '', softwareClass: '',
  linkedDhfId: '',

  // §4.2.3(c) 제조 절차
  mfgSiteAddress: '', mfgProcedures: '', processList: '',
  equipmentList: '', environmentReqs: '', packagingSpec: '',
  sterilizationSpec: '', shelfLife: '',

  // §4.2.3(d) QMS 요구사항
  applicableStandards: '', testMethods: '', acceptanceCriteria: '',
  inspectionReqs: '', recordsToMaintain: '',
  linkedChangeId: '', linkedValidationId: '',

  // §4.2.3(e) 위험관리
  riskMgmtSummary: '', residualRiskAcceptable: false,
  usabilityStudy: '', linkedRiskId: '',

  // §4.2.3(f) 라벨·포장
  labelContent: '', labelLanguages: '', labelingStandard: '',
  ifu: false, ifuContent: '', packagingMaterial: '',
  udiDI: '', udiFormatType: 'GS1-128',

  // §4.2.3(g) 인허가
  regulatoryStatus: '', certNo: '', certBody: '', certExpiry: '',
  submissionType: '', submissionDate: '', approvalDate: '',
  marketedCountries: '', notifiedBodyNo: '',
  linkedRegulatoryId: '',

  // 연결
  linkedQpId: '', linkedDocControlIds: '',
  notes: '',

  // 완성도 섹션 체크
  sectionStatus: {}, // { sectionKey: 'complete'|'partial'|'' }
}

// ── 메인 ─────────────────────────────────────────────────────
export default function DeviceFileHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  const [files, setFiles] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
  })
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FILE)
  const [editId, setEditId] = useState(null)
  const [activeSection, setActiveSection] = useState('general')
  const [filterStatus, setFilterStatus] = useState('all')
  const [tab, setTab] = useState('list')   // list | detail | analysis

  function save(list) { setFiles(list); localStorage.setItem(LS_KEY, JSON.stringify(list)) }

  function submitFile() {
    if (!form.productName.trim()) return alert('제품명을 입력하세요.')
    const isEdit = !!editId
    const obj = isEdit
      ? files.map(f => f.id === editId ? { ...f, ...form } : f)
      : [{ id: genId(), createdAt: today(), ...form }, ...files]
    save(obj)
    setShowForm(false); setForm(EMPTY_FILE); setEditId(null)
  }

  function deleteFile(id) {
    if (!confirm('의료기기 파일을 삭제하시겠습니까?')) return
    save(files.filter(f => f.id !== id))
    if (selectedId === id) { setSelectedId(null); setTab('list') }
  }

  const selectedFile = files.find(f => f.id === selectedId)

  // 각 파일의 완성도 계산
  function calcCompleteness(file) {
    const checks = {
      general:       !!(file.productName && file.intendedUse && file.deviceClass),
      specs:         !!(file.drawingNos || file.materialSpec || file.performanceSpec),
      manufacturing: !!(file.mfgProcedures || file.processList || file.packagingSpec),
      qms:           !!(file.applicableStandards || file.testMethods || file.acceptanceCriteria),
      risk:          !!(file.riskMgmtSummary || file.linkedRiskId),
      labeling:      !!(file.labelContent || file.udiDI),
      regulatory:    !!(file.regulatoryStatus || file.certNo),
    }
    const done = Object.values(checks).filter(Boolean).length
    return { checks, done, total: Object.keys(checks).length, pct: Math.round((done / Object.keys(checks).length) * 100) }
  }

  const filtered = useMemo(() => files.filter(f => filterStatus === 'all' || f.status === filterStatus), [files, filterStatus])

  const analysis = useMemo(() => {
    const byStatus = {}
    Object.keys(FILE_STATUSES).forEach(k => { byStatus[k] = files.filter(f => f.status === k).length })
    const byClass = {}
    DEVICE_CLASSES.forEach(c => { byClass[c] = files.filter(f => f.deviceClass === c).length })
    const avgPct = files.length ? Math.round(files.reduce((acc, f) => acc + calcCompleteness(f).pct, 0) / files.length) : 0
    const incomplete = files.filter(f => calcCompleteness(f).pct < 100)
    return { byStatus, byClass, avgPct, incomplete }
  }, [files])

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <AppLayout user={user} title="의료기기 파일" subtitle="ISO 13485 §4.2.3 — Device Master Record / Technical File">
      <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'list',     label: `파일 목록 (${files.length})` },
            { key: 'detail',   label: selectedFile ? `상세: ${selectedFile.productName}` : '상세 보기' },
            { key: 'analysis', label: '현황 분석' },
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

        {/* ── 목록 탭 ── */}
        {tab === 'list' && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">전체 상태</option>
                {Object.entries(FILE_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setForm(EMPTY_FILE); setEditId(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 의료기기 파일 등록
                </button>
              )}
            </div>

            {showForm && (
              <QuickCreateForm form={form} F={F} onSave={submitFile}
                onCancel={() => { setShowForm(false); setForm(EMPTY_FILE); setEditId(null) }}
                isEdit={!!editId} />
            )}

            <div className="space-y-3">
              {filtered.length === 0 && (
                <div className="text-center py-16 text-[13px]" style={{ color: 'var(--ink-faint)' }}>등록된 의료기기 파일이 없습니다.</div>
              )}
              {filtered.map(file => {
                const comp = calcCompleteness(file)
                const st = FILE_STATUSES[file.status] || FILE_STATUSES.draft
                return (
                  <div key={file.id} className="p-4 rounded-2xl cursor-pointer transition"
                    style={{ background: 'var(--bg-card)', border: `1.5px solid ${selectedId === file.id ? 'var(--moss)' : 'var(--line)'}` }}
                    onClick={() => { setSelectedId(file.id); setTab('detail') }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-[14px]" style={{ color: 'var(--ink)' }}>{file.productName}</span>
                          <span className="font-mono text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>{file.productCode}</span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>{file.deviceClass}</span>
                          <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{file.revision}</span>
                          {file.singleUse && <span className="text-[10.5px] px-1.5 py-0.5 rounded" style={{ background: '#FEF3C7', color: '#D97706' }}>일회용</span>}
                          {file.implantable && <span className="text-[10.5px] px-1.5 py-0.5 rounded" style={{ background: '#EDE9FE', color: '#7C3AED' }}>이식형</span>}
                        </div>
                        {file.intendedUse && (
                          <div className="text-[12.5px] line-clamp-1 mb-2" style={{ color: 'var(--ink-soft)' }}>{file.intendedUse}</div>
                        )}
                        {/* 완성도 바 */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg-soft)', maxWidth: 200 }}>
                            <div className="h-1.5 rounded-full transition-all"
                              style={{ width: `${comp.pct}%`, background: comp.pct >= 80 ? '#059669' : comp.pct >= 50 ? '#D97706' : '#DC2626' }} />
                          </div>
                          <span className="text-[11px] font-bold" style={{ color: comp.pct >= 80 ? '#059669' : comp.pct >= 50 ? '#D97706' : '#DC2626' }}>
                            {comp.pct}% ({comp.done}/{comp.total})
                          </span>
                          <div className="flex gap-1 ml-2">
                            {FILE_SECTIONS.slice(0, 7).map(s => (
                              <div key={s.key} title={s.label}
                                className="w-2 h-2 rounded-full"
                                style={{ background: comp.checks[s.key] ? '#059669' : '#FEE2E2', border: `1px solid ${comp.checks[s.key] ? '#059669' : '#FECACA'}` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {canEdit && (
                          <>
                            <button onClick={() => { setForm({ ...EMPTY_FILE, ...file }); setEditId(file.id); setShowForm(true); setTab('list') }}
                              className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                              <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                            </button>
                            <button onClick={() => deleteFile(file.id)}
                              className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                              <Trash2 size={12} style={{ color: '#DC2626' }} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 상세 탭 ── */}
        {tab === 'detail' && !selectedFile && (
          <div className="text-center py-16 text-[13px]" style={{ color: 'var(--ink-faint)' }}>
            목록에서 의료기기 파일을 선택하세요.
          </div>
        )}
        {tab === 'detail' && selectedFile && (
          <DetailView file={selectedFile} canEdit={canEdit}
            onEdit={() => { setForm({ ...EMPTY_FILE, ...selectedFile }); setEditId(selectedFile.id); setShowForm(false); setTab('list'); setTimeout(() => setShowForm(true), 50) }}
            activeSection={activeSection} setActiveSection={setActiveSection}
            calcCompleteness={calcCompleteness} />
        )}

        {/* ── 분석 탭 ── */}
        {tab === 'analysis' && <AnalysisView analysis={analysis} files={files} calcCompleteness={calcCompleteness} />}
      </div>
    </AppLayout>
  )
}

// ── 상세 뷰 ─────────────────────────────────────────────────
function DetailView({ file, canEdit, onEdit, activeSection, setActiveSection, calcCompleteness }) {
  const comp = calcCompleteness(file)
  const st = FILE_STATUSES[file.status] || FILE_STATUSES.draft

  return (
    <div className="flex gap-4 h-full">
      {/* 섹션 사이드바 */}
      <div className="shrink-0 w-48 space-y-1">
        {FILE_SECTIONS.map(s => {
          const Icon = s.icon
          const done = comp.checks[s.key]
          return (
            <button key={s.key} onClick={() => setActiveSection(s.key)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition"
              style={{
                background: activeSection === s.key ? 'var(--leaf-soft)' : 'var(--bg-card)',
                border: `1px solid ${activeSection === s.key ? 'var(--moss)' : 'var(--line)'}`,
                cursor: 'pointer',
              }}>
              <Icon size={13} style={{ color: activeSection === s.key ? 'var(--moss)' : 'var(--ink-faint)', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold truncate" style={{ color: activeSection === s.key ? 'var(--moss)' : 'var(--ink)' }}>
                  {s.label}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{s.clause}</div>
              </div>
              {s.key !== 'links' && (
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: done ? '#059669' : '#FEE2E2' }} />
              )}
            </button>
          )
        })}
        <div className="pt-3 text-center">
          <div className="text-[20px] font-bold" style={{ color: comp.pct >= 80 ? '#059669' : '#D97706' }}>{comp.pct}%</div>
          <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>파일 완성도</div>
        </div>
        {canEdit && (
          <button onClick={onEdit} className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-[12px] font-bold mt-2"
            style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Edit2 size={12} /> 편집
          </button>
        )}
      </div>

      {/* 섹션 컨텐츠 */}
      <div className="flex-1 min-w-0 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-4 pb-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <div>
            <div className="font-bold text-[16px]" style={{ color: 'var(--ink)' }}>{file.productName}</div>
            <div className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>
              {file.productCode} · {file.deviceClass} · {file.revision}
              <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: (FILE_STATUSES[file.status] || FILE_STATUSES.draft).bg, color: (FILE_STATUSES[file.status] || FILE_STATUSES.draft).color }}>
                {(FILE_STATUSES[file.status] || FILE_STATUSES.draft).label}
              </span>
            </div>
          </div>
        </div>

        {/* 각 섹션 내용 */}
        {activeSection === 'general' && (
          <SectionContent title="§4.2.3(a) 기기 일반 정보" items={[
            ['모델 번호', file.modelNo], ['기기 등급', file.deviceClass],
            ['멸균 여부', file.sterility], ['승인자', file.approvedBy],
            ['유효일', file.issueDate], ['검토 예정일', file.reviewDate],
            ['일회용', file.singleUse ? '예' : '아니오'], ['이식형', file.implantable ? '예' : '아니오'],
            ['능동형 기기', file.activeDevice ? '예' : '아니오'],
          ]} texts={[
            ['사용 목적 (Intended Use)', file.intendedUse],
            ['적응증', file.indications],
            ['금기사항', file.contraindications],
            ['대상 환자군', file.patientPopulation],
          ]} />
        )}
        {activeSection === 'specs' && (
          <SectionContent title="§4.2.3(b) 사양 및 설계" items={[
            ['도면 번호', file.drawingNos], ['소프트웨어 버전', file.softwareVersion],
            ['소프트웨어 등급', file.softwareClass], ['연결 DHF', file.linkedDhfId],
          ]} texts={[
            ['재료 사양', file.materialSpec], ['성능 사양', file.performanceSpec],
            ['안전 사양', file.safetySpec], ['생체적합성', file.biocompatibility],
          ]} />
        )}
        {activeSection === 'manufacturing' && (
          <SectionContent title="§4.2.3(c) 제조 절차" items={[
            ['제조 사업장', file.mfgSiteAddress], ['보관 수명', file.shelfLife],
          ]} texts={[
            ['제조 절차', file.mfgProcedures], ['공정 목록', file.processList],
            ['설비 목록', file.equipmentList], ['환경 요구사항', file.environmentReqs],
            ['포장 사양', file.packagingSpec], ['멸균 사양', file.sterilizationSpec],
          ]} />
        )}
        {activeSection === 'qms' && (
          <SectionContent title="§4.2.3(d) QMS 요구사항" items={[
            ['연결 변경관리', file.linkedChangeId], ['연결 밸리데이션', file.linkedValidationId],
          ]} texts={[
            ['적용 표준·규격', file.applicableStandards], ['시험 방법', file.testMethods],
            ['합격 기준', file.acceptanceCriteria], ['검사 요구사항', file.inspectionReqs],
            ['유지 기록 목록', file.recordsToMaintain],
          ]} />
        )}
        {activeSection === 'risk' && (
          <SectionContent title="§4.2.3(e) 위험관리" items={[
            ['연결 위험관리 ID', file.linkedRiskId], ['잔류위험 수용 가능', file.residualRiskAcceptable ? '예' : '아니오'],
          ]} texts={[
            ['위험관리 요약', file.riskMgmtSummary], ['사용적합성 연구', file.usabilityStudy],
          ]} />
        )}
        {activeSection === 'labeling' && (
          <SectionContent title="§4.2.3(f) 라벨·포장" items={[
            ['UDI-DI', file.udiDI], ['UDI 형식', file.udiFormatType],
            ['표시 언어', file.labelLanguages], ['라벨 표준', file.labelingStandard],
            ['사용설명서 (IFU)', file.ifu ? '포함' : '해당 없음'],
          ]} texts={[
            ['라벨 표시 내용', file.labelContent], ['IFU 내용 요약', file.ifuContent],
            ['포장 재료', file.packagingMaterial],
          ]} />
        )}
        {activeSection === 'regulatory' && (
          <SectionContent title="§4.2.3(g) 인허가" items={[
            ['인허가 상태', file.regulatoryStatus], ['인증 번호', file.certNo],
            ['인증 기관', file.certBody], ['인증 만료일', file.certExpiry],
            ['신청 유형', file.submissionType], ['신청일', file.submissionDate],
            ['승인일', file.approvalDate], ['공인 기관 번호', file.notifiedBodyNo],
            ['연결 인허가 ID', file.linkedRegulatoryId],
          ]} texts={[
            ['판매 국가·지역', file.marketedCountries],
          ]} />
        )}
        {activeSection === 'links' && (
          <SectionContent title="연결 문서 참조" items={[
            ['연결 품질 계획', file.linkedQpId],
          ]} texts={[
            ['연결 문서 번호 목록', file.linkedDocControlIds],
            ['비고', file.notes],
          ]} />
        )}
      </div>
    </div>
  )
}

// ── 섹션 내용 렌더러 ─────────────────────────────────────────
function SectionContent({ title, items = [], texts = [] }) {
  return (
    <div>
      <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{title}</div>
      {items.filter(([, v]) => v).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {items.filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="p-2.5 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
              <div className="text-[10.5px] font-bold mb-0.5" style={{ color: 'var(--ink-faint)' }}>{label}</div>
              <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{value}</div>
            </div>
          ))}
        </div>
      )}
      {texts.filter(([, v]) => v).map(([label, value]) => (
        <div key={label} className="mb-3 p-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
          <div className="text-[11px] font-bold mb-1" style={{ color: 'var(--ink-faint)' }}>{label}</div>
          <p className="text-[12.5px] whitespace-pre-line leading-relaxed" style={{ color: 'var(--ink)' }}>{value}</p>
        </div>
      ))}
      {items.filter(([, v]) => v).length === 0 && texts.filter(([, v]) => v).length === 0 && (
        <div className="text-center py-10 text-[13px]" style={{ color: 'var(--ink-faint)' }}>
          이 섹션에 등록된 정보가 없습니다. 편집 버튼을 눌러 내용을 입력하세요.
        </div>
      )}
    </div>
  )
}

// ── 빠른 등록 폼 ─────────────────────────────────────────────
function QuickCreateForm({ form, F, onSave, onCancel, isEdit }) {
  const [section, setSection] = useState('general')
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-1" style={{ color: 'var(--ink)' }}>{isEdit ? '의료기기 파일 수정' : '의료기기 파일 등록 (§4.2.3)'}</div>
      <div className="text-[12px] mb-4" style={{ color: 'var(--ink-faint)' }}>기본 정보를 입력하고 저장 후 상세 탭에서 각 섹션을 완성하세요.</div>

      {/* 섹션 탭 */}
      <div className="flex flex-wrap gap-1 mb-4 p-1 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
        {[
          { key: 'general', label: '기기 정보' },
          { key: 'specs', label: '사양' },
          { key: 'manufacturing', label: '제조' },
          { key: 'qms', label: 'QMS' },
          { key: 'risk', label: '위험관리' },
          { key: 'labeling', label: '라벨' },
          { key: 'regulatory', label: '인허가' },
        ].map(t => (
          <button key={t.key} onClick={() => setSection(t.key)}
            className="px-3 py-1 rounded-lg text-[12px] font-semibold"
            style={{ background: section === t.key ? 'var(--bg-card)' : 'transparent', color: section === t.key ? 'var(--moss)' : 'var(--ink-soft)', border: 'none', cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {section === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="제품명 *" value={form.productName} onChange={v => F('productName', v)} />
          <Field label="제품 코드" value={form.productCode} onChange={v => F('productCode', v)} />
          <Field label="모델 번호" value={form.modelNo} onChange={v => F('modelNo', v)} />
          <Field label="개정 번호" value={form.revision} onChange={v => F('revision', v)} placeholder="Rev.0" />
          <FieldSelect label="기기 등급" value={form.deviceClass} onChange={v => F('deviceClass', v)} options={DEVICE_CLASSES.map(c => ({ value: c, label: c }))} />
          <FieldSelect label="상태" value={form.status} onChange={v => F('status', v)} options={Object.entries(FILE_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
          <FieldSelect label="멸균 여부" value={form.sterility} onChange={v => F('sterility', v)} options={STERILITY_OPTIONS.map(s => ({ value: s, label: s }))} />
          <Field label="승인자" value={form.approvedBy} onChange={v => F('approvedBy', v)} />
          <Field label="유효일" type="date" value={form.issueDate} onChange={v => F('issueDate', v)} />
          <div className="col-span-3">
            <FieldArea label="사용 목적 (Intended Use) *" value={form.intendedUse} onChange={v => F('intendedUse', v)} rows={2}
              placeholder="본 기기는 [환자군]에서 [목적]을 위해 사용됩니다..." />
          </div>
          <div className="flex gap-4 col-span-3">
            {[['singleUse','일회용'],['implantable','이식형'],['activeDevice','능동형 기기']].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink-soft)' }}>
                <input type="checkbox" checked={!!form[key]} onChange={e => F(key, e.target.checked)} className="accent-green-500 w-4 h-4" />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}
      {section === 'specs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="도면 번호" value={form.drawingNos} onChange={v => F('drawingNos', v)} />
          <Field label="소프트웨어 버전" value={form.softwareVersion} onChange={v => F('softwareVersion', v)} />
          <Field label="소프트웨어 등급 (IEC 62304)" value={form.softwareClass} onChange={v => F('softwareClass', v)} placeholder="Class A/B/C" />
          <Field label="연결 DHF ID" value={form.linkedDhfId} onChange={v => F('linkedDhfId', v)} placeholder="DHF-xxxx" />
          <FieldArea label="재료 사양" value={form.materialSpec} onChange={v => F('materialSpec', v)} rows={3} />
          <FieldArea label="성능 사양" value={form.performanceSpec} onChange={v => F('performanceSpec', v)} rows={3} />
          <FieldArea label="안전 사양" value={form.safetySpec} onChange={v => F('safetySpec', v)} rows={2} />
          <FieldArea label="생체적합성 (ISO 10993)" value={form.biocompatibility} onChange={v => F('biocompatibility', v)} rows={2} />
        </div>
      )}
      {section === 'manufacturing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="제조 사업장 주소" value={form.mfgSiteAddress} onChange={v => F('mfgSiteAddress', v)} />
          <Field label="보관 수명" value={form.shelfLife} onChange={v => F('shelfLife', v)} placeholder="2년, 24개월..." />
          <FieldArea label="제조 절차 목록" value={form.mfgProcedures} onChange={v => F('mfgProcedures', v)} rows={3} />
          <FieldArea label="공정 목록" value={form.processList} onChange={v => F('processList', v)} rows={3} />
          <FieldArea label="설비 목록" value={form.equipmentList} onChange={v => F('equipmentList', v)} rows={2} />
          <FieldArea label="환경 요구사항" value={form.environmentReqs} onChange={v => F('environmentReqs', v)} rows={2} />
          <FieldArea label="포장 사양" value={form.packagingSpec} onChange={v => F('packagingSpec', v)} rows={2} />
          <FieldArea label="멸균 사양" value={form.sterilizationSpec} onChange={v => F('sterilizationSpec', v)} rows={2} />
        </div>
      )}
      {section === 'qms' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="연결 변경관리 ID" value={form.linkedChangeId} onChange={v => F('linkedChangeId', v)} placeholder="CHG-xxxx" />
          <Field label="연결 밸리데이션 ID" value={form.linkedValidationId} onChange={v => F('linkedValidationId', v)} placeholder="VAL-xxxx" />
          <FieldArea label="적용 표준·규격" value={form.applicableStandards} onChange={v => F('applicableStandards', v)} rows={3} placeholder="ISO 13485, IEC 60601-1, ..." />
          <FieldArea label="시험 방법" value={form.testMethods} onChange={v => F('testMethods', v)} rows={3} />
          <FieldArea label="합격 기준" value={form.acceptanceCriteria} onChange={v => F('acceptanceCriteria', v)} rows={2} />
          <FieldArea label="유지 기록 목록" value={form.recordsToMaintain} onChange={v => F('recordsToMaintain', v)} rows={2} />
        </div>
      )}
      {section === 'risk' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="연결 위험관리 ID" value={form.linkedRiskId} onChange={v => F('linkedRiskId', v)} placeholder="RISK-xxxx" />
          <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink-soft)' }}>
            <input type="checkbox" checked={!!form.residualRiskAcceptable} onChange={e => F('residualRiskAcceptable', e.target.checked)} className="accent-green-500 w-4 h-4" />
            잔류위험 수용 가능 (ISO 14971)
          </label>
          <FieldArea label="위험관리 요약" value={form.riskMgmtSummary} onChange={v => F('riskMgmtSummary', v)} rows={4} />
          <FieldArea label="사용적합성 연구 (IEC 62366)" value={form.usabilityStudy} onChange={v => F('usabilityStudy', v)} rows={4} />
        </div>
      )}
      {section === 'labeling' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="UDI-DI" value={form.udiDI} onChange={v => F('udiDI', v)} />
          <FieldSelect label="UDI 형식" value={form.udiFormatType} onChange={v => F('udiFormatType', v)}
            options={['GS1-128','GS1 DataMatrix','HIBC','기타'].map(o => ({ value: o, label: o }))} />
          <Field label="표시 언어" value={form.labelLanguages} onChange={v => F('labelLanguages', v)} placeholder="한국어, 영어..." />
          <Field label="라벨 표준" value={form.labelingStandard} onChange={v => F('labelingStandard', v)} placeholder="ISO 15223-1..." />
          <FieldArea label="라벨 표시 내용" value={form.labelContent} onChange={v => F('labelContent', v)} rows={4} />
          <FieldArea label="포장 재료" value={form.packagingMaterial} onChange={v => F('packagingMaterial', v)} rows={2} />
          <label className="flex items-center gap-2 col-span-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink-soft)' }}>
            <input type="checkbox" checked={!!form.ifu} onChange={e => F('ifu', e.target.checked)} className="accent-green-500 w-4 h-4" />
            사용설명서 (IFU) 포함
          </label>
          {form.ifu && <FieldArea label="IFU 내용 요약" value={form.ifuContent} onChange={v => F('ifuContent', v)} rows={3} />}
        </div>
      )}
      {section === 'regulatory' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="인허가 상태" value={form.regulatoryStatus} onChange={v => F('regulatoryStatus', v)} placeholder="허가완료, 신청중..." />
          <Field label="인증 번호" value={form.certNo} onChange={v => F('certNo', v)} />
          <Field label="인증 기관" value={form.certBody} onChange={v => F('certBody', v)} placeholder="식약처, CE, FDA..." />
          <Field label="인증 만료일" type="date" value={form.certExpiry} onChange={v => F('certExpiry', v)} />
          <Field label="신청일" type="date" value={form.submissionDate} onChange={v => F('submissionDate', v)} />
          <Field label="승인일" type="date" value={form.approvalDate} onChange={v => F('approvalDate', v)} />
          <Field label="연결 인허가 ID" value={form.linkedRegulatoryId} onChange={v => F('linkedRegulatoryId', v)} placeholder="REG-xxxx" />
          <Field label="공인기관 번호" value={form.notifiedBodyNo} onChange={v => F('notifiedBodyNo', v)} />
          <div className="col-span-3">
            <FieldArea label="판매 국가·지역" value={form.marketedCountries} onChange={v => F('marketedCountries', v)} rows={2} placeholder="대한민국, EU, 미국..." />
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4">
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

// ── 분석 뷰 ──────────────────────────────────────────────────
function AnalysisView({ analysis, files, calcCompleteness }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '총 의료기기 파일', value: files.length, color: '#2563EB', bg: '#DBEAFE' },
          { label: '평균 완성도', value: `${analysis.avgPct}%`, color: analysis.avgPct >= 80 ? '#059669' : '#D97706', bg: analysis.avgPct >= 80 ? '#D1FAE5' : '#FEF3C7' },
          { label: '승인 완료', value: analysis.byStatus.approved || 0, color: '#059669', bg: '#D1FAE5' },
          { label: '미완성 파일', value: analysis.incomplete.length, color: analysis.incomplete.length > 0 ? '#DC2626' : '#059669', bg: analysis.incomplete.length > 0 ? '#FEE2E2' : '#D1FAE5' },
        ].map(c => (
          <div key={c.label} className="p-4 rounded-2xl text-center" style={{ background: c.bg, border: `1px solid ${c.color}30` }}>
            <div className="text-[26px] font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {analysis.incomplete.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: '#92400E' }}>⚠ 완성도 미흡 파일</div>
          {analysis.incomplete.map(f => {
            const comp = calcCompleteness(f)
            return (
              <div key={f.id} className="flex items-center gap-3 mb-2 p-2.5 rounded-xl" style={{ background: '#FEF9C3', border: '1px solid #FCD34D' }}>
                <span className="font-bold text-[13px]" style={{ color: '#92400E' }}>{f.productName}</span>
                <div className="flex-1 h-1.5 rounded-full" style={{ background: '#FEF3C7' }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${comp.pct}%`, background: '#D97706' }} />
                </div>
                <span className="text-[12px] font-bold w-10 text-right" style={{ color: '#92400E' }}>{comp.pct}%</span>
                <div className="flex gap-1">
                  {FILE_SECTIONS.slice(0, 7).map(s => (
                    !comp.checks[s.key] && (
                      <span key={s.key} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#FEE2E2', color: '#DC2626' }}>{s.label}</span>
                    )
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>상태별 분포</div>
          {Object.entries(FILE_STATUSES).map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 mb-2">
              <span className="text-[12px] w-20" style={{ color: 'var(--ink-soft)' }}>{v.label}</span>
              <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                <div className="h-2 rounded-full" style={{ width: files.length ? `${((analysis.byStatus[k] || 0) / files.length) * 100}%` : '0%', background: v.color }} />
              </div>
              <span className="text-[12px] font-bold w-5 text-right" style={{ color: 'var(--ink)' }}>{analysis.byStatus[k] || 0}</span>
            </div>
          ))}
        </div>
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>기기 등급별 분포</div>
          {DEVICE_CLASSES.filter(c => (analysis.byClass[c] || 0) > 0).map(c => (
            <div key={c} className="flex items-center gap-3 mb-2">
              <span className="text-[12px] w-20" style={{ color: 'var(--ink-soft)' }}>{c}</span>
              <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                <div className="h-2 rounded-full" style={{ width: files.length ? `${((analysis.byClass[c] || 0) / files.length) * 100}%` : '0%', background: 'var(--moss)' }} />
              </div>
              <span className="text-[12px] font-bold w-5 text-right" style={{ color: 'var(--ink)' }}>{analysis.byClass[c] || 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 공통 ─────────────────────────────────────────────────────
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
function FieldArea({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
