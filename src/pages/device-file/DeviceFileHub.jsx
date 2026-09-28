// src/pages/device-file/DeviceFileHub.jsx
// ISO 13485 Â§4.2.3 â ìë£ê¸°ê¸° íì¼ (Device Master Record / Technical File)
import React, { useState, useMemo, useEffect } from 'react'
import {
  Plus, Save, Edit2, Trash2, Package, FileText,
  CheckCircle2, AlertTriangle, Link2, Layers,
  ChevronDown, ChevronRight, ShieldCheck, Tag,
  BarChart2, BookOpen, Cpu, ClipboardList,
  FolderOpen,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabaseClient'
import { useSearchParams } from 'react-router-dom'

// ââ ìì âââââââââââââââââââââââââââââââââââââââââââââââââââââ
const LS_KEY = 'qualytree.device_files'
let _sbCidDf = null

// Â§4.2.3 íì í­ëª© ì¹´íê³ ë¦¬
const FILE_SECTIONS = [
  { key: 'general',        label: 'ê¸°ê¸° ì¼ë° ì ë³´',    icon: Package,       clause: 'Â§4.2.3(a)' },
  { key: 'specs',          label: 'ì¬ì ë° ì¤ê³',       icon: Cpu,           clause: 'Â§4.2.3(b)' },
  { key: 'manufacturing',  label: 'ì ì¡° ì ì°¨',          icon: Layers,        clause: 'Â§4.2.3(c)' },
  { key: 'qms',            label: 'QMS ìêµ¬ì¬í­',       icon: ShieldCheck,   clause: 'Â§4.2.3(d)' },
  { key: 'risk',           label: 'ìíê´ë¦¬',           icon: AlertTriangle, clause: 'Â§4.2.3(e)' },
  { key: 'labeling',       label: 'ë¼ë²¨Â·í¬ì¥',          icon: Tag,           clause: 'Â§4.2.3(f)' },
  { key: 'regulatory',     label: 'ì¸íê°',             icon: BookOpen,      clause: 'Â§4.2.3(g)' },
  { key: 'links',          label: 'ì°ê²° ë¬¸ì',          icon: Link2,         clause: 'ì°¸ì¡°' },
]

const DEVICE_CLASSES = ['Class I', 'Class II', 'Class IIa', 'Class IIb', 'Class III', 'ë¯¸ë¶ë¥']
const STERILITY_OPTIONS = ['ë¹ë©¸ê· ', 'ë©¸ê·  (EO)', 'ë©¸ê·  (ê°ë§ì )', 'ë©¸ê·  (ì¦ê¸°)', 'ë©¸ê·  (ê¸°í)']
const FILE_STATUSES = {
  draft:    { label: 'ì´ì',   color: '#9CA3AF', bg: '#F3F4F6' },
  review:   { label: 'ê²í ',   color: '#D97706', bg: '#FEF3C7' },
  approved: { label: 'ì¹ì¸',   color: '#059669', bg: '#D1FAE5' },
  obsolete: { label: 'íê¸°',   color: '#6B7280', bg: '#F3F4F6' },
}

function genId() { return `DMR-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function today() { return new Date().toISOString().slice(0, 10) }

const EMPTY_FILE = {
  // Â§4.2.3(a) ê¸°ê¸° ì¼ë° ì ë³´
  productKey: '', productName: '', productCode: '', modelNo: '', revision: 'Rev.0',
  deviceClass: 'Class II', intendedUse: '', indications: '',
  contraindications: '', patientPopulation: '',
  sterility: 'ë¹ë©¸ê· ', singleUse: false, implantable: false, activeDevice: false,
  status: 'draft', preparedBy: '', reviewedBy: '', approvedBy: '',
  issueDate: today(), reviewDate: '',

  // Â§4.2.3(b) ì¬ì ë° ì¤ê³
  drawingNos: '', materialSpec: '', performanceSpec: '', safetySpec: '',
  biocompatibility: '', softwareVersion: '', softwareClass: '',
  linkedDhfId: '',

  // Â§4.2.3(c) ì ì¡° ì ì°¨
  mfgSiteAddress: '', mfgProcedures: '', processList: '',
  equipmentList: '', environmentReqs: '', packagingSpec: '',
  sterilizationSpec: '', shelfLife: '',

  // Â§4.2.3(d) QMS ìêµ¬ì¬í­
  applicableStandards: '', testMethods: '', acceptanceCriteria: '',
  inspectionReqs: '', recordsToMaintain: '',
  linkedChangeId: '', linkedValidationId: '',

  // Â§4.2.3(e) ìíê´ë¦¬
  riskMgmtSummary: '', residualRiskAcceptable: false,
  usabilityStudy: '', linkedRiskId: '',

  // Â§4.2.3(f) ë¼ë²¨Â·í¬ì¥
  labelContent: '', labelLanguages: '', labelingStandard: '',
  ifu: false, ifuContent: '', packagingMaterial: '',
  udiDI: '', udiFormatType: 'GS1-128',

  // Â§4.2.3(g) ì¸íê°
  regulatoryStatus: '', certNo: '', certBody: '', certExpiry: '',
  submissionType: '', submissionDate: '', approvalDate: '',
  marketedCountries: '', notifiedBodyNo: '',
  linkedRegulatoryId: '',

  // ì°ê²°
  linkedQpId: '', linkedDocControlIds: '',
  notes: '',

  // ìì±ë ì¹ì ì²´í¬
  sectionStatus: {}, // { sectionKey: 'complete'|'partial'|'' }
}

// ââ ë©ì¸ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function DeviceFileHub({ embedded = false, productKey: scopeProductKey = null, productLabel = '' } = {}) {
  const user = auth.current()
  const companyId = user?.company_id
  const canEdit = user?.level >= 2
  const [searchParams] = useSearchParams()
  // #283,303: ì íê³µì (ProductsHub)ì ìë² ëë  ëë í´ë¹ ì í(productKey)ì DMRë§ ë¸ì¶íë¤.
  const scopeKey = scopeProductKey || searchParams.get('productId') || null

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
  useEffect(() => { _sbCidDf = companyId }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data')
      .select('payload').eq('company_id', companyId)
      .eq('data_type', 'localStorage_sync').eq('data_key', LS_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.payload) {
          setFiles(data.payload)
          localStorage.setItem(LS_KEY, JSON.stringify(data.payload))
        }
      })
  }, [companyId])

  React.useEffect(() => {
    if (!scopeKey) return
    const mine = files.filter(f => f.productKey === scopeKey)
    if (mine.length === 1) { setSelectedId(mine[0].id); setTab('detail') }
    else if (mine.length === 0) { setTab('list') }
  }, [scopeKey, files])

  function save(list) {
    setFiles(list)
    localStorage.setItem(LS_KEY, JSON.stringify(list))
    if (_sbCidDf) {
      supabase.from('company_data').upsert({
        company_id: _sbCidDf, data_type: 'localStorage_sync',
        data_key: LS_KEY, payload: list
      }, { onConflict: 'company_id,data_type,data_key' })
    }
  }

  function submitFile() {
    if (!form.productName.trim()) return alert('ì íëªì ìë ¥íì¸ì.')
    const isEdit = !!editId
    const obj = isEdit
      ? files.map(f => f.id === editId ? { ...f, ...form } : f)
      : [{ id: genId(), createdAt: today(), ...form }, ...files]
    save(obj)
    setShowForm(false); setForm(EMPTY_FILE); setEditId(null)
  }

  function deleteFile(id) {
    if (!confirm('ìë£ê¸°ê¸° íì¼ì ì­ì íìê² ìµëê¹?')) return
    save(files.filter(f => f.id !== id))
    if (selectedId === id) { setSelectedId(null); setTab('list') }
  }

  const selectedFile = files.find(f => f.id === selectedId)

  // ê° íì¼ì ìì±ë ê³ì°
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

  const filtered = useMemo(() => files.filter(f => (!scopeKey || f.productKey === scopeKey) && (filterStatus === 'all' || f.status === filterStatus)), [files, scopeKey, filterStatus])

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

  const body = (
    <div className={embedded ? '' : 'px-6 lg:px-8 py-6 max-w-[1600px] mx-auto'}>

        {/* í­ */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'list',     label: `íì¼ ëª©ë¡ (${files.length})` },
            { key: 'detail',   label: selectedFile ? `ìì¸: ${selectedFile.productName}` : 'ìì¸ ë³´ê¸°' },
            { key: 'analysis', label: 'íí© ë¶ì' },
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

        {/* ââ ëª©ë¡ í­ ââ */}
        {tab === 'list' && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">ì ì²´ ìí</option>
                {Object.entries(FILE_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setForm({ ...EMPTY_FILE, productKey: scopeKey || '', productName: scopeKey ? productLabel : '' }); setEditId(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> ìë£ê¸°ê¸° íì¼ ë±ë¡
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
                <div className="text-center py-16 text-[13px]" style={{ color: 'var(--ink-faint)' }}>ë±ë¡ë ìë£ê¸°ê¸° íì¼ì´ ììµëë¤.</div>
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
                          {file.singleUse && <span className="text-[10.5px] px-1.5 py-0.5 rounded" style={{ background: '#FEF3C7', color: '#D97706' }}>ì¼íì©</span>}
                          {file.implantable && <span className="text-[10.5px] px-1.5 py-0.5 rounded" style={{ background: '#EDE9FE', color: '#7C3AED' }}>ì´ìí</span>}
                        </div>
                        {file.intendedUse && (
                          <div className="text-[12.5px] line-clamp-1 mb-2" style={{ color: 'var(--ink-soft)' }}>{file.intendedUse}</div>
                        )}
                        {/* ìì±ë ë° */}
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

        {/* ââ ìì¸ í­ ââ */}
        {tab === 'detail' && !selectedFile && (
          <div className="text-center py-16 text-[13px]" style={{ color: 'var(--ink-faint)' }}>
            ëª©ë¡ìì ìë£ê¸°ê¸° íì¼ì ì ííì¸ì.
          </div>
        )}
        {tab === 'detail' && selectedFile && (
          <DetailView file={selectedFile} canEdit={canEdit}
            onEdit={() => { setForm({ ...EMPTY_FILE, ...selectedFile }); setEditId(selectedFile.id); setShowForm(false); setTab('list'); setTimeout(() => setShowForm(true), 50) }}
            activeSection={activeSection} setActiveSection={setActiveSection}
            calcCompleteness={calcCompleteness} />
        )}

        {/* ââ ë¶ì í­ ââ */}
        {tab === 'analysis' && <AnalysisView analysis={analysis} files={files} calcCompleteness={calcCompleteness} />}
    </div>
  )

  if (embedded) return body

  return (
    <AppLayout user={user} title="ìë£ê¸°ê¸° íì¼" subtitle="ISO 13485 Â§4.2.3 â Device Master Record / Technical File">
      {body}
    </AppLayout>
  )
}

// ââ ìì¸ ë·° âââââââââââââââââââââââââââââââââââââââââââââââââ
function DetailView({ file, canEdit, onEdit, activeSection, setActiveSection, calcCompleteness }) {
  const comp = calcCompleteness(file)
  const st = FILE_STATUSES[file.status] || FILE_STATUSES.draft

  return (
    <div className="flex gap-4 h-full">
      {/* ì¹ì ì¬ì´ëë° */}
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
          <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>íì¼ ìì±ë</div>
        </div>
        {canEdit && (
          <button onClick={onEdit} className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-[12px] font-bold mt-2"
            style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Edit2 size={12} /> í¸ì§
          </button>
        )}
      </div>

      {/* ì¹ì ì»¨íì¸  */}
      <div className="flex-1 min-w-0 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        {/* í¤ë */}
        <div className="flex items-center gap-3 mb-4 pb-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <div>
            <div className="font-bold text-[16px]" style={{ color: 'var(--ink)' }}>{file.productName}</div>
            <div className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>
              {file.productCode} Â· {file.deviceClass} Â· {file.revision}
              <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: (FILE_STATUSES[file.status] || FILE_STATUSES.draft).bg, color: (FILE_STATUSES[file.status] || FILE_STATUSES.draft).color }}>
                {(FILE_STATUSES[file.status] || FILE_STATUSES.draft).label}
              </span>
            </div>
          </div>
        </div>

        {/* ê° ì¹ì ë´ì© */}
        {activeSection === 'general' && (
          <SectionContent title="Â§4.2.3(a) ê¸°ê¸° ì¼ë° ì ë³´" items={[
            ['ëª¨ë¸ ë²í¸', file.modelNo], ['ê¸°ê¸° ë±ê¸', file.deviceClass],
            ['ë©¸ê·  ì¬ë¶', file.sterility], ['ì¹ì¸ì', file.approvedBy],
            ['ì í¨ì¼', file.issueDate], ['ê²í  ìì ì¼', file.reviewDate],
            ['ì¼íì©', file.singleUse ? 'ì' : 'ìëì¤'], ['ì´ìí', file.implantable ? 'ì' : 'ìëì¤'],
            ['ë¥ëí ê¸°ê¸°', file.activeDevice ? 'ì' : 'ìëì¤'],
          ]} texts={[
            ['ì¬ì© ëª©ì  (Intended Use)', file.intendedUse],
            ['ì ìì¦', file.indications],
            ['ê¸ê¸°ì¬í­', file.contraindications],
            ['ëì íìêµ°', file.patientPopulation],
          ]} />
        )}
        {activeSection === 'specs' && (
          <SectionContent title="Â§4.2.3(b) ì¬ì ë° ì¤ê³" items={[
            ['ëë©´ ë²í¸', file.drawingNos], ['ìíí¸ì¨ì´ ë²ì ', file.softwareVersion],
            ['ìíí¸ì¨ì´ ë±ê¸', file.softwareClass], ['ì°ê²° DHF', file.linkedDhfId],
          ]} texts={[
            ['ì¬ë£ ì¬ì', file.materialSpec], ['ì±ë¥ ì¬ì', file.performanceSpec],
            ['ìì  ì¬ì', file.safetySpec], ['ìì²´ì í©ì±', file.biocompatibility],
          ]} />
        )}
        {activeSection === 'manufacturing' && (
          <SectionContent title="Â§4.2.3(c) ì ì¡° ì ì°¨" items={[
            ['ì ì¡° ì¬ìì¥', file.mfgSiteAddress], ['ë³´ê´ ìëª', file.shelfLife],
          ]} texts={[
            ['ì ì¡° ì ì°¨', file.mfgProcedures], ['ê³µì  ëª©ë¡', file.processList],
            ['ì¤ë¹ ëª©ë¡', file.equipmentList], ['íê²½ ìêµ¬ì¬í­', file.environmentReqs],
            ['í¬ì¥ ì¬ì', file.packagingSpec], ['ë©¸ê·  ì¬ì', file.sterilizationSpec],
          ]} />
        )}
        {activeSection === 'qms' && (
          <SectionContent title="Â§4.2.3(d) QMS ìêµ¬ì¬í­" items={[
            ['ì°ê²° ë³ê²½ê´ë¦¬', file.linkedChangeId], ['ì°ê²° ë°¸ë¦¬ë°ì´ì', file.linkedValidationId],
          ]} texts={[
            ['ì ì© íì¤Â·ê·ê²©', file.applicableStandards], ['ìí ë°©ë²', file.testMethods],
            ['í©ê²© ê¸°ì¤', file.acceptanceCriteria], ['ê²ì¬ ìêµ¬ì¬í­', file.inspectionReqs],
            ['ì ì§ ê¸°ë¡ ëª©ë¡', file.recordsToMaintain],
          ]} />
        )}
        {activeSection === 'risk' && (
          <SectionContent title="Â§4.2.3(e) ìíê´ë¦¬" items={[
            ['ì°ê²° ìíê´ë¦¬ ID', file.linkedRiskId], ['ìë¥ìí ìì© ê°ë¥', file.residualRiskAcceptable ? 'ì' : 'ìëì¤'],
          ]} texts={[
            ['ìíê´ë¦¬ ìì½', file.riskMgmtSummary], ['ì¬ì©ì í©ì± ì°êµ¬', file.usabilityStudy],
          ]} />
        )}
        {activeSection === 'labeling' && (
          <SectionContent title="Â§4.2.3(f) ë¼ë²¨Â·í¬ì¥" items={[
            ['UDI-DI', file.udiDI], ['UDI íì', file.udiFormatType],
            ['íì ì¸ì´', file.labelLanguages], ['ë¼ë²¨ íì¤', file.labelingStandard],
            ['ì¬ì©ì¤ëªì (IFU)', file.ifu ? 'í¬í¨' : 'í´ë¹ ìì'],
          ]} texts={[
            ['ë¼ë²¨ íì ë´ì©', file.labelContent], ['IFU ë´ì© ìì½', file.ifuContent],
            ['í¬ì¥ ì¬ë£', file.packagingMaterial],
          ]} />
        )}
        {activeSection === 'regulatory' && (
          <SectionContent title="Â§4.2.3(g) ì¸íê°" items={[
            ['ì¸íê° ìí', file.regulatoryStatus], ['ì¸ì¦ ë²í¸', file.certNo],
            ['ì¸ì¦ ê¸°ê´', file.certBody], ['ì¸ì¦ ë§ë£ì¼', file.certExpiry],
            ['ì ì²­ ì í', file.submissionType], ['ì ì²­ì¼', file.submissionDate],
            ['ì¹ì¸ì¼', file.approvalDate], ['ê³µì¸ ê¸°ê´ ë²í¸', file.notifiedBodyNo],
            ['ì°ê²° ì¸íê° ID', file.linkedRegulatoryId],
          ]} texts={[
            ['íë§¤ êµ­ê°Â·ì§ì­', file.marketedCountries],
          ]} />
        )}
        {activeSection === 'links' && (
          <SectionContent title="ì°ê²° ë¬¸ì ì°¸ì¡°" items={[
            ['ì°ê²° íì§ ê³í', file.linkedQpId],
          ]} texts={[
            ['ì°ê²° ë¬¸ì ë²í¸ ëª©ë¡', file.linkedDocControlIds],
            ['ë¹ê³ ', file.notes],
          ]} />
        )}
      </div>
    </div>
  )
}

// ââ ì¹ì ë´ì© ë ëë¬ âââââââââââââââââââââââââââââââââââââââââ
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
          ì´ ì¹ìì ë±ë¡ë ì ë³´ê° ììµëë¤. í¸ì§ ë²í¼ì ëë¬ ë´ì©ì ìë ¥íì¸ì.
        </div>
      )}
    </div>
  )
}

// ââ ë¹ ë¥¸ ë±ë¡ í¼ âââââââââââââââââââââââââââââââââââââââââââââ
function QuickCreateForm({ form, F, onSave, onCancel, isEdit }) {
  const [section, setSection] = useState('general')
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-1" style={{ color: 'var(--ink)' }}>{isEdit ? 'ìë£ê¸°ê¸° íì¼ ìì ' : 'ìë£ê¸°ê¸° íì¼ ë±ë¡ (Â§4.2.3)'}</div>
      <div className="text-[12px] mb-4" style={{ color: 'var(--ink-faint)' }}>ê¸°ë³¸ ì ë³´ë¥¼ ìë ¥íê³  ì ì¥ í ìì¸ í­ìì ê° ì¹ìì ìì±íì¸ì.</div>

      {/* ì¹ì í­ */}
      <div className="flex flex-wrap gap-1 mb-4 p-1 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
        {[
          { key: 'general', label: 'ê¸°ê¸° ì ë³´' },
          { key: 'specs', label: 'ì¬ì' },
          { key: 'manufacturing', label: 'ì ì¡°' },
          { key: 'qms', label: 'QMS' },
          { key: 'risk', label: 'ìíê´ë¦¬' },
          { key: 'labeling', label: 'ë¼ë²¨' },
          { key: 'regulatory', label: 'ì¸íê°' },
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
          <Field label="ì íëª *" value={form.productName} onChange={v => F('productName', v)} />
          <Field label="ì í ì½ë" value={form.productCode} onChange={v => F('productCode', v)} />
          <Field label="ëª¨ë¸ ë²í¸" value={form.modelNo} onChange={v => F('modelNo', v)} />
          <Field label="ê°ì  ë²í¸" value={form.revision} onChange={v => F('revision', v)} placeholder="Rev.0" />
          <FieldSelect label="ê¸°ê¸° ë±ê¸" value={form.deviceClass} onChange={v => F('deviceClass', v)} options={DEVICE_CLASSES.map(c => ({ value: c, label: c }))} />
          <FieldSelect label="ìí" value={form.status} onChange={v => F('status', v)} options={Object.entries(FILE_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
          <FieldSelect label="ë©¸ê·  ì¬ë¶" value={form.sterility} onChange={v => F('sterility', v)} options={STERILITY_OPTIONS.map(s => ({ value: s, label: s }))} />
          <Field label="ì¹ì¸ì" value={form.approvedBy} onChange={v => F('approvedBy', v)} />
          <Field label="ì í¨ì¼" type="date" value={form.issueDate} onChange={v => F('issueDate', v)} />
          <div className="col-span-3">
            <FieldArea label="ì¬ì© ëª©ì  (Intended Use) *" value={form.intendedUse} onChange={v => F('intendedUse', v)} rows={2}
              placeholder="ë³¸ ê¸°ê¸°ë [íìêµ°]ìì [ëª©ì ]ì ìí´ ì¬ì©ë©ëë¤..." />
          </div>
          <div className="flex gap-4 col-span-3">
            {[['singleUse','ì¼íì©'],['implantable','ì´ìí'],['activeDevice','ë¥ëí ê¸°ê¸°']].map(([key, label]) => (
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
          <Field label="ëë©´ ë²í¸" value={form.drawingNos} onChange={v => F('drawingNos', v)} />
          <Field label="ìíí¸ì¨ì´ ë²ì " value={form.softwareVersion} onChange={v => F('softwareVersion', v)} />
          <Field label="ìíí¸ì¨ì´ ë±ê¸ (IEC 62304)" value={form.softwareClass} onChange={v => F('softwareClass', v)} placeholder="Class A/B/C" />
          <Field label="ì°ê²° DHF ID" value={form.linkedDhfId} onChange={v => F('linkedDhfId', v)} placeholder="DHF-xxxx" />
          <FieldArea label="ì¬ë£ ì¬ì" value={form.materialSpec} onChange={v => F('materialSpec', v)} rows={3} />
          <FieldArea label="ì±ë¥ ì¬ì" value={form.performanceSpec} onChange={v => F('performanceSpec', v)} rows={3} />
          <FieldArea label="ìì  ì¬ì" value={form.safetySpec} onChange={v => F('safetySpec', v)} rows={2} />
          <FieldArea label="ìì²´ì í©ì± (ISO 10993)" value={form.biocompatibility} onChange={v => F('biocompatibility', v)} rows={2} />
        </div>
      )}
      {section === 'manufacturing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="ì ì¡° ì¬ìì¥ ì£¼ì" value={form.mfgSiteAddress} onChange={v => F('mfgSiteAddress', v)} />
          <Field label="ë³´ê´ ìëª" value={form.shelfLife} onChange={v => F('shelfLife', v)} placeholder="2ë, 24ê°ì..." />
          <FieldArea label="ì ì¡° ì ì°¨ ëª©ë¡" value={form.mfgProcedures} onChange={v => F('mfgProcedures', v)} rows={3} />
          <FieldArea label="ê³µì  ëª©ë¡" value={form.processList} onChange={v => F('processList', v)} rows={3} />
          <FieldArea label="ì¤ë¹ ëª©ë¡" value={form.equipmentList} onChange={v => F('equipmentList', v)} rows={2} />
          <FieldArea label="íê²½ ìêµ¬ì¬í­" value={form.environmentReqs} onChange={v => F('environmentReqs', v)} rows={2} />
          <FieldArea label="í¬ì¥ ì¬ì" value={form.packagingSpec} onChange={v => F('packagingSpec', v)} rows={2} />
          <FieldArea label="ë©¸ê·  ì¬ì" value={form.sterilizationSpec} onChange={v => F('sterilizationSpec', v)} rows={2} />
        </div>
      )}
      {section === 'qms' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="ì°ê²° ë³ê²½ê´ë¦¬ ID" value={form.linkedChangeId} onChange={v => F('linkedChangeId', v)} placeholder="CHG-xxxx" />
          <Field label="ì°ê²° ë°¸ë¦¬ë°ì´ì ID" value={form.linkedValidationId} onChange={v => F('linkedValidationId', v)} placeholder="VAL-xxxx" />
          <FieldArea label="ì ì© íì¤Â·ê·ê²©" value={form.applicableStandards} onChange={v => F('applicableStandards', v)} rows={3} placeholder="ISO 13485, IEC 60601-1, ..." />
          <FieldArea label="ìí ë°©ë²" value={form.testMethods} onChange={v => F('testMethods', v)} rows={3} />
          <FieldArea label="í©ê²© ê¸°ì¤" value={form.acceptanceCriteria} onChange={v => F('acceptanceCriteria', v)} rows={2} />
          <FieldArea label="ì ì§ ê¸°ë¡ ëª©ë¡" value={form.recordsToMaintain} onChange={v => F('recordsToMaintain', v)} rows={2} />
        </div>
      )}
      {section === 'risk' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="ì°ê²° ìíê´ë¦¬ ID" value={form.linkedRiskId} onChange={v => F('linkedRiskId', v)} placeholder="RISK-xxxx" />
          <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink-soft)' }}>
            <input type="checkbox" checked={!!form.residualRiskAcceptable} onChange={e => F('residualRiskAcceptable', e.target.checked)} className="accent-green-500 w-4 h-4" />
            ìë¥ìí ìì© ê°ë¥ (ISO 14971)
          </label>
          <FieldArea label="ìíê´ë¦¬ ìì½" value={form.riskMgmtSummary} onChange={v => F('riskMgmtSummary', v)} rows={4} />
          <FieldArea label="ì¬ì©ì í©ì± ì°êµ¬ (IEC 62366)" value={form.usabilityStudy} onChange={v => F('usabilityStudy', v)} rows={4} />
        </div>
      )}
      {section === 'labeling' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="UDI-DI" value={form.udiDI} onChange={v => F('udiDI', v)} />
          <FieldSelect label="UDI íì" value={form.udiFormatType} onChange={v => F('udiFormatType', v)}
            options={['GS1-128','GS1 DataMatrix','HIBC','ê¸°í'].map(o => ({ value: o, label: o }))} />
          <Field label="íì ì¸ì´" value={form.labelLanguages} onChange={v => F('labelLanguages', v)} placeholder="íêµ­ì´, ìì´..." />
          <Field label="ë¼ë²¨ íì¤" value={form.labelingStandard} onChange={v => F('labelingStandard', v)} placeholder="ISO 15223-1..." />
          <FieldArea label="ë¼ë²¨ íì ë´ì©" value={form.labelContent} onChange={v => F('labelContent', v)} rows={4} />
          <FieldArea label="í¬ì¥ ì¬ë£" value={form.packagingMaterial} onChange={v => F('packagingMaterial', v)} rows={2} />
          <label className="flex items-center gap-2 col-span-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink-soft)' }}>
            <input type="checkbox" checked={!!form.ifu} onChange={e => F('ifu', e.target.checked)} className="accent-green-500 w-4 h-4" />
            ì¬ì©ì¤ëªì (IFU) í¬í¨
          </label>
          {form.ifu && <FieldArea label="IFU ë´ì© ìì½" value={form.ifuContent} onChange={v => F('ifuContent', v)} rows={3} />}
        </div>
      )}
      {section === 'regulatory' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="ì¸íê° ìí" value={form.regulatoryStatus} onChange={v => F('regulatoryStatus', v)} placeholder="íê°ìë£, ì ì²­ì¤..." />
          <Field label="ì¸ì¦ ë²í¸" value={form.certNo} onChange={v => F('certNo', v)} />
          <Field label="ì¸ì¦ ê¸°ê´" value={form.certBody} onChange={v => F('certBody', v)} placeholder="ìì½ì², CE, FDA..." />
          <Field label="ì¸ì¦ ë§ë£ì¼" type="date" value={form.certExpiry} onChange={v => F('certExpiry', v)} />
          <Field label="ì ì²­ì¼" type="date" value={form.submissionDate} onChange={v => F('submissionDate', v)} />
          <Field label="ì¹ì¸ì¼" type="date" value={form.approvalDate} onChange={v => F('approvalDate', v)} />
          <Field label="ì°ê²° ì¸íê° ID" value={form.linkedRegulatoryId} onChange={v => F('linkedRegulatoryId', v)} placeholder="REG-xxxx" />
          <Field label="ê³µì¸ê¸°ê´ ë²í¸" value={form.notifiedBodyNo} onChange={v => F('notifiedBodyNo', v)} />
          <div className="col-span-3">
            <FieldArea label="íë§¤ êµ­ê°Â·ì§ì­" value={form.marketedCountries} onChange={v => F('marketedCountries', v)} rows={2} placeholder="ëíë¯¼êµ­, EU, ë¯¸êµ­..." />
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Save size={13} /> ì ì¥
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>ì·¨ì</button>
      </div>
    </div>
  )
}

// ââ ë¶ì ë·° ââââââââââââââââââââââââââââââââââââââââââââââââââ
function AnalysisView({ analysis, files, calcCompleteness }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'ì´ ìë£ê¸°ê¸° íì¼', value: files.length, color: '#2563EB', bg: '#DBEAFE' },
          { label: 'íê·  ìì±ë', value: `${analysis.avgPct}%`, color: analysis.avgPct >= 80 ? '#059669' : '#D97706', bg: analysis.avgPct >= 80 ? '#D1FAE5' : '#FEF3C7' },
          { label: 'ì¹ì¸ ìë£', value: analysis.byStatus.approved || 0, color: '#059669', bg: '#D1FAE5' },
          { label: 'ë¯¸ìì± íì¼', value: analysis.incomplete.length, color: analysis.incomplete.length > 0 ? '#DC2626' : '#059669', bg: analysis.incomplete.length > 0 ? '#FEE2E2' : '#D1FAE5' },
        ].map(c => (
          <div key={c.label} className="p-4 rounded-2xl text-center" style={{ background: c.bg, border: `1px solid ${c.color}30` }}>
            <div className="text-[26px] font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {analysis.incomplete.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: '#92400E' }}>â  ìì±ë ë¯¸í¡ íì¼</div>
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
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>ìíë³ ë¶í¬</div>
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
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>ê¸°ê¸° ë±ê¸ë³ ë¶í¬</div>
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

// ââ ê³µíµ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
      <HubBanner title="ìë£ê¸°ê¸° íì¼ ê´ë¦¬" subtitle="ISO 13485 Â§4.2.3 â ìë£ê¸°ê¸°ë³ ì¤ê³Â·ì ì¡°Â·íì§ íµí© íì¼" icon={FolderOpen} color="#4F46E5" workflow={['íì¼ ìì±', 'ì ë³´ ë±ë¡', 'ê²í Â·ì¹ì¸', 'ì ì¡° ì°ë', 'ì ì§ê´ë¦¬']} />
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
