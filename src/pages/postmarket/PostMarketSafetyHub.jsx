import React, { useState, useMemo } from 'react'
import { AlertTriangle, RotateCcw, Shield, Plus, Search, Edit3, Trash2, X ,
  ShieldAlert,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'

// âââ Tabs âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const TABS = [
  { key: 'adverse', label: 'ì´ìì¬ë¡ ë³´ê³ ', icon: AlertTriangle },
  { key: 'recall',  label: 'ë¦¬ì½/íì',   icon: RotateCcw },
  { key: 'safety',  label: 'ìì ì± ì¡°ì¹',   icon: Shield },
]

// âââ Adverse Events constants ââââââââââââââââââââââââââââââââââââââââââââââââ
const ADV_KEY      = 'qualytree.adverse_events'
const ADV_EMPTY    = { id: '', reportDate: '', productName: '', lotNo: '', eventType: '', severity: '', description: '', reportTo: '', status: 'ì ì' }
const ADV_TYPES    = ['ë¶ìì©', 'ì¤ìë', 'ì±ë¥ì í', 'ë¼ç²ªëì¤ë¥', 'ê¸°í'
]
const ADV_SEVS     = ['ê²½ë¯¸', 'ì¤ë±ë', 'ì¤ì¦', 'ì¬ë§']
const ADV_STATUSES = ['ì ì', 'ì¡°ì¬ì¤', 'ìë£', 'ë³´ê³ ìë£']
const ADV_REPORTS  = ['ìíìì½íìì ì²', 'ê±´ê°ë³´íì¬ì¬íê°ì', 'í´ì¸ê·ì ê¸°ê´', 'ê¸°í']

// âââ Recall constants âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const REC_KEY      = 'qualytree.recall_records'
const REC_EMPTY    = { id: '', noticeDate: '', productName: '', lotNo: '', quantity: '', recallReason: '', recallClass: 'Class II (ì¤ì)', action: '', status: 'ì§íì¤' }
const REC_CLASSES  = ['Class I (ê¸´ê¸)', 'Class II (ì¤ì)', 'Class III (ì¼ë°)']
const REC_STATUSES = ['ê³íìë¦½', 'ì§íì¤', 'ìë£', 'ì·¨ì']

// âââ Safety Action constants ââââââââââââââââââââââââââââââââââââââââââââââââââ
const SAF_KEY      = 'qualytree.safety_actions'
const SAF_EMPTY    = { id: '', issueDate: '', productName: '', lotNo: '', actionType: '', reason: '', measure: '', status: 'ê³í' }
const SAF_TYPES    = ['ì¬ì©ì£¼ìíµë³´', 'ë¼ë²¨ë³ê²½', 'ì¬ì©ì í', 'ìë¦¬/ê°ì ', 'ì ê²ê¶ê³ ', 'íìë³í', 'ê¸°í']
const SAF_STATUSES = ['ê³í', 'ì§íì¤', 'ìë£']

// âââ Helpers ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const newId   = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
const lsRead  = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]') } catch { return [] } }
const lsSave  = (k, d) => localStorage.setItem(k, JSON.stringify(d))

const STATUS_COLOR = {
  'ì ì':    'bg-blue-100 text-blue-700',
  'ì¡°ì¬ì¤':  'bg-yellow-100 text-yellow-700',
  'ìë£':    'bg-green-100 text-green-700',
  'ë³´ê³ ìë£':'bg-purple-100 text-purple-700',
  'ê³íìë¦½':'bg-gray-100 text-gray-600',
  'ì§íì¤':  'bg-orange-100 text-orange-700',
  'ì·¨ì':    'bg-red-100 text-red-600',
  'ê³í':    'bg-gray-100 text-gray-600',
}
const SEV_COLOR = {
  'ê²½ë¯¸': 'bg-green-100 text-green-700',
  'ì¤ë±ë':'bg-yellow-100 text-yellow-700',
  'ì¤ì¦': 'bg-orange-100 text-orange-700',
  'ì¬ë§': 'bg-red-100 text-red-700',
}
const CLASS_COLOR = {
  'Class I (ê¸´ê¸)':    'bg-red-100 text-red-700',
  'Class II (ì¤ì)':   'bg-orange-100 text-orange-700',
  'Class III (ì¼ë°)':  'bg-yellow-100 text-yellow-700',
}

// âââ Shared micro-components ââââââââââââââââââââââââââââââââââââââââââââââââââ
function Badge({ text, map }) {
  const cls = (map && map[text]) || 'bg-gray-100 text-gray-600'
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{text}</span>
}

function FRow({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200'

function FInput({ ...p }) { return <input {...p} className={inputCls} /> }
function FSel({ opts, ...p }) {
  return (
    <select {...p} className={inputCls}>
      {opts.map(o => <option key={o}>{o}</option>)}
    </select>
  )
}
function FTA({ ...p }) { return <textarea {...p} rows={3} className={inputCls} /> }

// âââ Stats row ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Stats({ rows }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${rows.length}, 1fr)` }}>
      {rows.map(([label, val, cls]) => (
        <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
          <div className={`text-2xl font-bold ${cls}`}>{val}</div>
          <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  )
}

// âââ Search + Add toolbar âââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Toolbar({ search, onSearch, placeholder, onAdd, label }) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
        />
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
      >
        <Plus size={14} /> {label}
      </button>
    </div>
  )
}

// âââ Empty state ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Empty({ searching, msg }) {
  return (
    <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">
      {searching ? 'ê²ì ê²°ê³¼ê° ììµëë¤.' : msg}
    </div>
  )
}

// âââ Form shell âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function FormShell({ title, onClose, onSave, children }) {
  return (
    <div className="bg-white rounded-xl border border-red-100 p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
        <button onClick={onClose}><X size={16} className="text-gray-400 hover:text-gray-600" /></button>
      </div>
      {children}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">ì·¨ì</button>
        <button onClick={onSave} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">ì ì¥</button>
      </div>
    </div>
  )
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// TAB 1 â ì´ìì¬ë¡ ë³´ê³ 
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function AdverseTab() {
  const [items, setItems] = useState(() => lsRead(ADV_KEY))
  const [form, setForm] = useState({ ...ADV_EMPTY })
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [expandId, setExpandId] = useState(null)

  const persist = d => { setItems(d); lsSave(ADV_KEY, d) }

  const filtered = useMemo(() =>
    items.filter(i => !search || i.productName?.includes(search) || i.eventType?.includes(search) || i.status?.includes(search)),
    [items, search]
  )

  const openNew  = () => { setForm({ ...ADV_EMPTY }); setEditId(null); setShowForm(true) }
  const openEdit = item => { setForm({ ...item }); setEditId(item.id); setShowForm(true) }
  const close    = () => { setShowForm(false); setEditId(null) }

  const submit = () => {
    if (!form.productName || !form.reportDate) return
    const next = editId
      ? items.map(i => i.id === editId ? { ...form, id: editId } : i)
      : [{ ...form, id: newId() }, ...items]
    persist(next); close()
  }

  const del = id => { if (window.confirm('ì­ì íìê² ìµëê¹?')) persist(items.filter(i => i.id !== id)) }

  const f = v => e => setForm({ ...form, [v]: e.target.value })

  return (
    <div className="space-y-4">
      <Stats rows={[
        ['ì ì²´', items.length, 'text-gray-700'],
        ['ì²ë¦¬ì¤', items.filter(i => ['ì ì','ì¡°ì¬ì¤'].includes(i.status)).length, 'text-orange-600'],
        ['ë³´ê³ ìë£', items.filter(i => i.status === 'ë³´ê³ ìë£').length, 'text-green-600'],
      ]} />
      <Toolbar search={search} onSearch={setSearch} placeholder="ì íëª, ì¬ë¡ì í, ì²ë¦¬ìí..." onAdd={openNew} label="ì ê· ë±ë¡" />

      {showForm && (
        <FormShell title={editId ? 'ì´ìì¬ë¡ ìì ' : 'ì´ìì¬ë¡ ì ê· ë±ë¡'} onClose={close} onSave={submit}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <FRow label="ë³´ê³ ì¼ì *"><FInput type="date" value={form.reportDate} onChange={f('reportDate')} /></FRow>
            <FRow label="ì íëª *"><FInput value={form.productName} onChange={f('productName')} placeholder="ì íëª" /></FRow>
            <FRow label="LOT/ì¼ë ¨ë²í¸"><FInput value={form.lotNo} onChange={f('lotNo')} placeholder="LOT No." /></FRow>
            <FRow label="ì¬ë¡ ì í"><FSel opts={ADV_TYPES} value={form.eventType} onChange={f('eventType')} /></FRow>
            <FRow label="ì¤ì¦ë"><FSel opts={ADV_SEVS} value={form.severity} onChange={f('severity')} /></FRow>
            <FRow label="ë³´ê³  ê¸°ê´"><FSel opts={ADV_REPORTS} value={form.reportTo} onChange={f('reportTo')} /></FRow>
            <FRow label="ì²ë¦¬ ìí"><FSel opts={ADV_STATUSES} value={form.status} onChange={f('status')} /></FRow>
          </div>
          <FRow label="ì¬ë¡ ë´ì©">
            <FTA value={form.description} onChange={f('description')} placeholder="ì´ìì¬ë¡ ìì¸ ë´ì©" />
          </FRow>
        </FormShell>
      )}

      <div className="space-y-2">
        {filtered.length === 0
          ? <Empty searching={!!search} msg="ë±ë¡ë ì´ìì¬ë¡ê° ììµëë¤." />
          : filtered.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpandId(expandId === item.id ? null : item.id)}>
                <AlertTriangle size={15} className="text-red-500 shrink-0" />
                <span className="flex-1 text-sm font-medium text-gray-800">{item.productName}</span>
                <span className="text-xs text-gray-400">{item.reportDate}</span>
                {item.severity && <Badge text={item.severity} map={SEV_COLOR} />}
                <Badge text={item.status} map={STATUS_COLOR} />
                <button onClick={e => { e.stopPropagation(); openEdit(item) }} className="p-1 rounded hover:bg-gray-100"><Edit3 size={13} className="text-gray-400" /></button>
                <button onClick={e => { e.stopPropagation(); del(item.id) }} className="p-1 rounded hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button>
              </div>
              {expandId === item.id && (
                <div className="border-t border-gray-50 px-4 pb-3 pt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div><span className="text-gray-400">LOT No.: </span>{item.lotNo || '-'}</div>
                  <div><span className="text-gray-400">ì¬ë¡ì í: </span>{item.eventType || '-'}</div>
                  <div><span className="text-gray-400">ë³´ê³ ê¸°ê´: </span>{item.reportTo || '-'}</div>
                  <div><span className="text-gray-400">ì¤ì¦ë: </span>{item.severity || '-'}</div>
                  {item.description && <div className="col-span-2"><span className="text-gray-400">ë´ì©: </span>{item.description}</div>}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// TAB 2 â ë¦¬ì½/íì
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function RecallTab() {
  const [items, setItems] = useState(() => lsRead(REC_KEY))
  const [form, setForm] = useState({ ...REC_EMPTY })
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [expandId, setExpandId] = useState(null)

  const persist = d => { setItems(d); lsSave(REC_KEY, d) }

  const filtered = useMemo(() =>
    items.filter(i => !search || i.productName?.includes(search) || i.recallReason?.includes(search) || i.status?.includes(search)),
    [items, search]
  )

  const openNew  = () => { setForm({ ...REC_EMPTY }); setEditId(null); setShowForm(true) }
  const openEdit = item => { setForm({ ...item }); setEditId(item.id); setShowForm(true) }
  const close    = () => { setShowForm(false); setEditId(null) }

  const submit = () => {
    if (!form.productName || !form.noticeDate) return
    const next = editId
      ? items.map(i => i.id === editId ? { ...form, id: editId } : i)
      : [{ ...form, id: newId() }, ...items]
    persist(next); close()
  }

  const del = id => { if (window.confirm('ì­ì íìê² ìµëê¹?')) persist(items.filter(i => i.id !== id)) }

  const f = v => e => setForm({ ...form, [v]: e.target.value })

  return (
    <div className="space-y-4">
      <Stats rows={[
        ['ì ì²´', items.length, 'text-gray-700'],
        ['ì§íì¤', items.filter(i => ['ê³íìë¦½','ì§íì¤'].includes(i.status)).length, 'text-orange-600'],
        ['ìë£', items.filter(i => i.status === 'ìë£').length, 'text-green-600'],
      ]} />
      <Toolbar search={search} onSearch={setSearch} placeholder="ì íëª, íìì¬ì , ì²ë¦¬ìí..." onAdd={openNew} label="ì ê· ë±ë¡" />

      {showForm && (
        <FormShell title={editId ? 'ë¦¬ì½/íì ìì ' : 'ë¦¬ì½/íì ì ê· ë±ë¡'} onClose={close} onSave={submit}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <FRow label="íµë³´/ê³µì§ì¼ *"><FInput type="date" value={form.noticeDate} onChange={f('noticeDate')} /></FRow>
            <FRow label="ì íëª *"><FInput value={form.productName} onChange={f('productName')} placeholder="ì íëª" /></FRow>
            <FRow label="LOT/ì¼ë ¨ë²í¸"><FInput value={form.lotNo} onChange={f('lotNo')} placeholder="LOT No." /></FRow>
            <FRow label="íì ìë"><FInput value={form.quantity} onChange={f('quantity')} placeholder="ìë ë° ë¨ì" /></FRow>
            <FRow label="íì ë±ê¸"><FSel opts={REC_CLASSES} value={form.recallClass} onChange={f('recallClass')} /></FRow>
            <FRow label="ì²ë¦¬ ìí"><FSel opts={REC_STATUSES} value={form.status} onChange={f('status')} /></FRow>
          </div>
          <FRow label="íì ì¬ì ">
            <FTA value={form.recallReason} onChange={f('recallReason')} placeholder="íì ì¬ì " />
          </FRow>
          <div className="mt-3">
            <FRow label="ì¡°ì¹ ë´ì©">
              <FTA value={form.action} onChange={f('action')} placeholder="ì·¨í´ì§ ëë ì·¨í  ì¡°ì¹ ë´ì©" />
            </FRow>
          </div>
        </FormShell>
      )}

      <div className="space-y-2">
        {filtered.length === 0
          ? <Empty searching={!!search} msg="ë±ë¡ë ë¦¬ì½/íì ì´ë ¥ì´ ììµëë¤." />
          : filtered.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpandId(expandId === item.id ? null : item.id)}>
                <RotateCcw size={15} className="text-red-500 shrink-0" />
                <span className="flex-1 text-sm font-medium text-gray-800">{item.productName}</span>
                <span className="text-xs text-gray-400">{item.noticeDate}</span>
                {item.recallClass && <Badge text={item.recallClass} map={CLASS_COLOR} />}
                <Badge text={item.status} map={STATUS_COLOR} />
                <button onClick={e => { e.stopPropagation(); openEdit(item) }} className="p-1 rounded hover:bg-gray-100"><Edit3 size={13} className="text-gray-400" /></button>
                <button onClick={e => { e.stopPropagation(); del(item.id) }} className="p-1 rounded hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button>
              </div>
              {expandId === item.id && (
                <div className="border-t border-gray-50 px-4 pb-3 pt-2 space-y-1.5 text-xs text-gray-600">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-gray-400">LOT No.: </span>{item.lotNo || '-'}</div>
                    <div><span className="text-gray-400">íììë: </span>{item.quantity || '-'}</div>
                  </div>
                  {item.recallReason && <div><span className="text-gray-400">íìì¬ì : </span>{item.recallReason}</div>}
                  {item.action && <div><span className="text-gray-400">ì¡°ì¹ë´ì©: </span>{item.action}</div>}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// TAB 3 â ìì ì± ì¡°ì¹
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function SafetyTab() {
  const [items, setItems] = useState(() => lsRead(SAF_KEY))
  const [form, setForm] = useState({ ...SAF_EMPTY })
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [expandId, setExpandId] = useState(null)

  const persist = d => { setItems(d); lsSave(SAF_KEY, d) }

  const filtered = useMemo(() =>
    items.filter(i => !search || i.productName?.includes(search) || i.actionType?.includes(search) || i.status?.includes(search)),
    [items, search]
  )

  const openNew  = () => { setForm({ ...SAF_EMPTY }); setEditId(null); setShowForm(true) }
  const openEdit = item => { setForm({ ...item }); setEditId(item.id); setShowForm(true) }
  const close    = () => { setShowForm(false); setEditId(null) }

  const submit = () => {
    if (!form.productName || !form.issueDate) return
    const next = editId
      ? items.map(i => i.id === editId ? { ...form, id: editId } : i)
      : [{ ...form, id: newId() }, ...items]
    persist(next); close()
  }

  const del = id => { if (window.confirm('ì­ì íìê² ìµëê¹?')) persist(items.filter(i => i.id !== id)) }

  const f = v => e => setForm({ ...form, [v]: e.target.value })

  return (
    <div className="space-y-4">
      <Stats rows={[
        ['ì ì²´', items.length, 'text-gray-700'],
        ['ì§íì¤', items.filter(i => ['ê³í','ì§íì¤'].includes(i.status)).length, 'text-orange-600'],
        ['ìë£', items.filter(i => i.status === 'ìë£').length, 'text-green-600'],
      ]} />
      <Toolbar search={search} onSearch={setSearch} placeholder="ì íëª, ì¡°ì¹ì í, ì²ë¦¬ìí..." onAdd={openNew} label="ì ê· ë±ë¡" />

      {showForm && (
        <FormShell title={editId ? 'ìì ì± ì¡°ì¹ ìì ' : 'ìì ì± ì¡°ì¹ ì ê· ë±ë¡'} onClose={close} onSave={submit}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <FRow label="ì¡°ì¹ ë°ë ¹ì¼ *"><FInput type="date" value={form.issueDate} onChange={f('issueDate')} /></FRow>
            <FRow label="ì íëª *"><FInput value={form.productName} onChange={f('productName')} placeholder="ì íëª" /></FRow>
            <FRow label="LOT/ì¼ë ¨ë²í¸"><FInput value={form.lotNo} onChange={f('lotNo')} placeholder="LOT No." /></FRow>
            <FRow label="ì¡°ì¹ ì í"><FSel opts={SAF_TYPES} value={form.actionType} onChange={f('actionType')} /></FRow>
            <FRow label="ì´í ìí"><FSel opts={SAF_STATUSES} value={form.status} onChange={f('status')} /></FRow>
          </div>
          <FRow label="ë°ë ì¬ì ">
            <FTA value={form.reason} onChange={f('reason')} placeholder="ìì ì± ì¡°ì¹ ë°ë ì¬ì " />
          </FRow>
          <div className="mt-3">
            <FRow label="ì¸ë¶ ì¡°ì¹ ë´ì©">
              <FTA value={form.measure} onChange={f('measure')} placeholder="êµ¬ì²´ì ì¸ ì¡°ì¹ ë´ì©" />
            </FRow>
          </div>
        </FormShell>
      )}

      <div className="space-y-2">
        {filtered.length === 0
          ? <Empty searching={!!search} msg="ë±ë¡ë ìì ì± ì¡°ì¹ ì´ë ¥ì´ ììµëë¤." />
          : filtered.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpandId(expandId === item.id ? null : item.id)}>
                <Shield size={15} className="text-red-500 shrink-0" />
                <span className="flex-1 text-sm font-medium text-gray-800">{item.productName}</span>
                <span className="text-xs text-gray-400">{item.issueDate}</span>
                {item.actionType && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{item.actionType}</span>
                )}
                <Badge text={item.status} map={STATUS_COLOR} />
                <button onClick={e => { e.stopPropagation(); openEdit(item) }} className="p-1 rounded hover:bg-gray-100"><Edit3 size={13} className="text-gray-400" /></button>
                <button onClick={e => { e.stopPropagation(); del(item.id) }} className="p-1 rounded hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button>
              </div>
              {expandId === item.id && (
                <div className="border-t border-gray-50 px-4 pb-3 pt-2 space-y-1.5 text-xs text-gray-600">
                  <div><span className="text-gray-400">LOT No.: </span>{item.lotNo || '-'}</div>
                  {item.reason && <div><span className="text-gray-400">ë°ëì¬ì : </span>{item.reason}</div>}
                  {item.measure && <div><span className="text-gray-400">ì¡°ì¹ë´ì©: </span>{item.measure}</div>}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// MAIN COMPONENT
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function PostMarketSafetyHub() {
  const [activeTab, setActiveTab] = useState('adverse')

  return (
    <AppLayout>
      <HubBanner title="ìí í ìì ê´ë¦¬" subtitle="ISO 13485 Â§8.2 â ìí í ìë£ê¸°ê¸° ì´ìì¬ë¡Â·FSCAÂ·ë¦¬ì½ ê´ë¦¬" icon={ShieldAlert} color="#DC2626" />
      <div className="max-w-4xl mx-auto px-4 pb-10">

        {/* Tab navigation */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === t.key
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'adverse' && <AdverseTab />}
        {activeTab === 'recall'  && <RecallTab />}
        {activeTab === 'safety'  && <SafetyTab />}
      </div>
    </AppLayout>
  )
}
