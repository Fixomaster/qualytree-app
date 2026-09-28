import React, { useState, useEffect } from 'react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
let _sbCidPd = null

const LS_KEY = 'qualytree.qms_scope'
function loadScope() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') } catch { return null }
}
const DEFAULT_SCOPE = {
  org: '',
  products: '',
  sites: '',
  exclusions: 'Â§7.3 ì¤ê³Â·ê°ë° (í´ë¹ìì ì ì ì¸ ê°ë¥)',
  standard: 'ISO 13485:2016, ìë£ê¸°ê¸° ì ì¡° ë° íì§ê´ë¦¬ ê¸°ì¤(KGMP)',
  certBody: '',
  version: '1.0',
  revised: ''
}

const PROCESSES = [
  { id: 'mgmt', label: 'ê²½ì ì±ì', color: '#1e40af', items: ['íì§ë°©ì¹¨Â·ëª©í', 'ê²½ìê²í ', 'ìì ë°°ë¶', 'ìì¬ìíµ'] },
  { id: 'resource', label: 'ìì ê´ë¦¬', color: '#0369a1', items: ['ì¸ìÂ·ì­ë', 'ì¸íë¼', 'ììíê²½', 'ê³µê¸ìì²´'] },
  { id: 'realization', label: 'ì í ì¤í', color: '#065f46', items: ['ì¤ê³Â·ê°ë°', 'êµ¬ë§¤Â·ììê²ì¬', 'ìì°Â·ìë¹ì¤', 'ê²ì¬Â·ì¶í'] },
  { id: 'measurement', label: 'ì¸¡ì Â·ë¶ìÂ·ê°ì ', color: '#7c2d12', items: ['ë´ë¶ì¬ì¬', 'CAPA', 'ê³ ê°ë§ì¡±', 'ë°ì´í° ë¶ì'] },
]

export default function ProcessDiagramHub() {
  const user = auth.current()
  const companyId = user?.company_id
  const [tab, setTab] = useState('diagram')
  const [scope, setScope] = useState(() => loadScope() || DEFAULT_SCOPE)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(scope)
  useEffect(() => { _sbCidPd = companyId || null }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data').select('payload')
      .eq('company_id', companyId).eq('data_type', 'localStorage_sync')
      .eq('data_key', LS_KEY).maybeSingle()
      .then(({ data: sbData }) => { if (sbData?.payload) setScope(sbData.payload) })
  }, [companyId])

  function saveScope() {
    localStorage.setItem(LS_KEY, JSON.stringify(draft))
    if (_sbCidPd) {
      supabase.from('company_data').upsert(
        {company_id: _sbCidPd, data_type: 'localStorage_sync', data_key: LS_KEY, payload: draft},
        {onConflict: 'company_id,data_type,data_key'}
      )
    }
    setScope(draft)
    setEditing(false)
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">QMS ë²ì ë° íë¡ì¸ì¤ ìí¸ìì©</h1>
          <p className="text-sm text-gray-500 mt-1">ISO 13485 Â§4.1 â íì§ê²½ììì¤í ì ì© ë²ì ì ì ë° íë¡ì¸ì¤ ìí¸ìì© ë¤ì´ì´ê·¸ë¨</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {[{ k:'diagram', label:'íë¡ì¸ì¤ ìí¸ìì© ë¤ì´ì´ê·¸ë¨' }, { k:'scope', label:'QMS ì ì© ë²ì' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={'px-4 py-2 text-sm font-medium border-b-2 -mb-px ' + (tab === t.k ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ë¤ì´ì´ê·¸ë¨ í­ */}
        {tab === 'diagram' && (
          <div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <svg viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg" className="w-full">
                {/* Background */}
                <rect x="0" y="0" width="800" height="520" fill="#f8fafc" rx="12"/>

                {/* Title */}
                <text x="400" y="34" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#1e293b">ISO 13485 QMS íë¡ì¸ì¤ ìí¸ìì© ëª¨ë¸</text>

                {/* Customer left */}
                <rect x="20" y="190" width="80" height="120" fill="#dbeafe" rx="8" stroke="#3b82f6" strokeWidth="1.5"/>
                <text x="60" y="244" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1e40af">ê³ ê°</text>
                <text x="60" y="260" textAnchor="middle" fontSize="10" fill="#1e40af">ìêµ¬ì¬í­</text>
                <text x="60" y="278" textAnchor="middle" fontSize="10" fill="#1e40af">ë° ê¸°ë</text>
                <path d="M100 250 L130 250" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow)"/>

                {/* Customer right */}
                <rect x="700" y="190" width="80" height="120" fill="#dcfce7" rx="8" stroke="#16a34a" strokeWidth="1.5"/>
                <text x="740" y="244" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#15803d">ê³ ê°</text>
                <text x="740" y="260" textAnchor="middle" fontSize="10" fill="#15803d">ë§ì¡±ë</text>
                <path d="M670 250 L700 250" stroke="#16a34a" strokeWidth="2" markerEnd="url(#arrowGreen)"/>

                {/* Arrow defs */}
                <defs>
                  <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#3b82f6"/>
                  </marker>
                  <marker id="arrowGreen" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#16a34a"/>
                  </marker>
                  <marker id="arrowGray" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#64748b"/>
                  </marker>
                </defs>

                {/* Management box (top) */}
                <rect x="130" y="55" width="540" height="80" fill="#eff6ff" rx="8" stroke="#1e40af" strokeWidth="1.5" strokeDasharray="6,3"/>
                <text x="400" y="84" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1e40af">ê²½ì ì±ì (Management Responsibility)</text>
                <text x="400" y="102" textAnchor="middle" fontSize="10" fill="#3b82f6">íì§ë°©ì¹¨Â·ëª©í ìë¦½  |  ê²½ìê²í   |  ìì¬ìíµ  |  ìì ë°°ë¶</text>
                <text x="400" y="120" textAnchor="middle" fontSize="10" fill="#3b82f6">ê³ ê°ì¤ì¬  |  ë²ì  ìê±´ ì¤ì  |  ë¦¬ì¤í¬ ê¸°ë° ì¬ê³ </text>

                {/* Resource box (left inner) */}
                <rect x="130" y="175" width="150" height="170" fill="#f0f9ff" rx="8" stroke="#0369a1" strokeWidth="1.5"/>
                <text x="205" y="205" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0369a1">ìì ê´ë¦¬</text>
                <text x="205" y="222" textAnchor="middle" fontSize="9.5" fill="#0369a1">(Resource Management)</text>
                <line x1="145" y1="232" x2="265" y2="232" stroke="#bae6fd" strokeWidth="1"/>
                {['ì¸ì ë° ì­ë ê´ë¦¬', 'ì¸íë¼ ê´ë¦¬', 'ììíê²½ ê´ë¦¬', 'ê³µê¸ìì²´ ê´ë¦¬', 'êµì¡Â·íë ¨'].map((t,i) => (
                  <text key={i} x="205" y={250 + i*22} textAnchor="middle" fontSize="9" fill="#0c4a6e">â¢ {t}</text>
                ))}

                {/* Product realization (center) */}
                <rect x="300" y="175" width="210" height="170" fill="#f0fdf4" rx="8" stroke="#16a34a" strokeWidth="2"/>
                <text x="405" y="205" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#15803d">ì í ì¤í íë¡ì¸ì¤</text>
                <text x="405" y="220" textAnchor="middle" fontSize="9.5" fill="#16a34a">(Product Realization)</text>
                <line x1="315" y1="230" x2="495" y2="230" stroke="#bbf7d0" strokeWidth="1"/>
                {['ì¤ê³Â·ê°ë° ê´ë¦¬', 'êµ¬ë§¤Â·ìì ê²ì¬', 'ìì° ë° ìë¹ì¤ ì ê³µ', 'ê³µì Â·ìµì¢ ê²ì¬', 'ìë³ ë° ì¶ì ì±', 'ì¶í ì¹ì¸'].map((t,i) => (
                  <text key={i} x="405" y={246 + i*19} textAnchor="middle" fontSize="9" fill="#14532d">â¢ {t}</text>
                ))}

                {/* Measurement box (right inner) */}
                <rect x="530" y="175" width="140" height="170" fill="#fff7ed" rx="8" stroke="#c2410c" strokeWidth="1.5"/>
                <text x="600" y="205" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#9a3412">ì¸¡ì Â·ë¶ìÂ·ê°ì </text>
                <text x="600" y="220" textAnchor="middle" fontSize="9.5" fill="#c2410c">(Measurement)</text>
                <line x1="545" y1="230" x2="655" y2="230" stroke="#fed7aa" strokeWidth="1"/>
                {['ë´ë¶ì¬ì¬', 'CAPAÂ·ê°ì ', 'ê³ ê°ë§ì¡± ëª¨ëí°ë§', 'ë°ì´í° ë¶ì', 'ë¶ì í© ê´ë¦¬'].map((t,i) => (
                  <text key={i} x="600" y={248 + i*22} textAnchor="middle" fontSize="9" fill="#7c2d12">â¢ {t}</text>
                ))}

                {/* Horizontal arrows between boxes */}
                <path d="M280 250 L300 250" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrowGray)"/>
                <path d="M510 250 L530 250" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrowGray)"/>

                {/* Vertical arrows: management <-> others */}
                <path d="M205 175 L205 135" stroke="#64748b" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowGray)"/>
                <path d="M405 175 L405 135" stroke="#64748b" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowGray)"/>
                <path d="M600 175 L600 135" stroke="#64748b" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowGray)"/>

                {/* Support/Doc box (bottom) */}
                <rect x="130" y="375" width="540" height="75" fill="#faf5ff" rx="8" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="6,3"/>
                <text x="400" y="400" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#6d28d9">ë¬¸ìí ìê±´ ë° ì§ì ìì¤í</text>
                <text x="400" y="418" textAnchor="middle" fontSize="10" fill="#7c3aed">íì§ë§¤ë´ì¼  |  ì ì°¨ì(SOP)  |  ììíì¤  |  ê¸°ë¡  |  ìë£ê¸°ê¸° íì¼(DMR)  |  ì¤ê³ì´ë ¥íì¼(DHF)</text>
                <text x="400" y="436" textAnchor="middle" fontSize="10" fill="#7c3aed">ë¬¸ì ê´ë¦¬  |  ê¸°ë¡ ê´ë¦¬  |  ë³ê²½ ê´ë¦¬  |  ì ììëª</text>

                {/* Arrows: bottom to main */}
                <path d="M205 375 L205 345" stroke="#7c3aed" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowGray)"/>
                <path d="M405 375 L405 345" stroke="#7c3aed" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowGray)"/>
                <path d="M600 375 L600 345" stroke="#7c3aed" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowGray)"/>

                {/* Continuous improvement arc label */}
                <text x="400" y="480" textAnchor="middle" fontSize="10" fill="#64748b" fontStyle="italic">â» ì§ìì  ê°ì  (Continual Improvement)</text>
                <path d="M180 470 Q400 500 620 470" stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeDasharray="5,4"/>

                {/* ISO Ref */}
                <text x="400" y="510" textAnchor="middle" fontSize="9" fill="#94a3b8">ISO 13485:2016 Â§4.1 â íì§ê²½ììì¤í ì¼ë° ìêµ¬ì¬í­</text>
              </svg>
            </div>

            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { color: '#eff6ff', border: '#1e40af', label: 'ê²½ì ì±ì', desc: 'ìµê³ ê²½ìì ì£¼ë, íì§ë°©ì¹¨ ìë¦½' },
                { color: '#f0f9ff', border: '#0369a1', label: 'ìì ê´ë¦¬', desc: 'ì¸ìÂ·ì¸íë¼Â·íê²½ ì ê³µ' },
                { color: '#f0fdf4', border: '#16a34a', label: 'ì í ì¤í', desc: 'ì¤ê³ë¶í° ì¶íê¹ì§ íµì¬ íë¡ì¸ì¤' },
                { color: '#fff7ed', border: '#c2410c', label: 'ì¸¡ì Â·ë¶ì', desc: 'ì±ê³¼ ëª¨ëí°ë§ ë° ì§ì ê°ì ' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2 p-2 rounded-lg border" style={{ backgroundColor: item.color, borderColor: item.border }}>
                  <div className="w-3 h-3 rounded mt-0.5 flex-shrink-0" style={{ backgroundColor: item.border }}></div>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: item.border }}>{item.label}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QMS ì ì© ë²ì í­ */}
        {tab === 'scope' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-800">QMS ì ì© ë²ì ì ì</h2>
              {!editing ? (
                <button onClick={() => { setDraft(scope); setEditing(true) }}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">í¸ì§</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">ì·¨ì</button>
                  <button onClick={saveScope} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">ì ì¥</button>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
              {[
                { key: 'org', label: 'ì¡°ì§ëª', placeholder: 'íì¬ëª ë° ì¬ìì¥ ì ë³´' },
                { key: 'products', label: 'ì ì© ì íÂ·ìë¹ì¤ ë²ì', placeholder: 'ì: ìë£ê¸°ê¸° (í´ëì¤ IÂ·II) ì ì¡° ë° íë§¤' },
                { key: 'sites', label: 'ì ì© ì¬ìì¥', placeholder: 'ì: ë³¸ì¬(ìì¸ì ââêµ¬ ââë¡), ê³µì¥(ê²½ê¸°ë ââì)' },
                { key: 'standard', label: 'ì ì© íì¤', placeholder: 'ISO 13485:2016, KGMP' },
                { key: 'certBody', label: 'ì¸ì¦ê¸°ê´', placeholder: 'ì: SGS Korea, KR (íêµ­ì ê¸)' },
                { key: 'exclusions', label: 'ì ì© ì ì¸ ì¡°í­ (Â§7.3 ë±)', placeholder: 'Â§7.3 ì¤ê³Â·ê°ë° â í´ë¹ ê³µì  ìì ì ì ì¸ ê¸°ì¬' },
                { key: 'version', label: 'ë¬¸ì ë²ì ', placeholder: '1.0' },
                { key: 'revised', label: 'ê°ì ì¼', placeholder: '2026-01-01' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                  {editing ? (
                    f.key === 'products' || f.key === 'exclusions' || f.key === 'sites' ? (
                      <textarea value={draft[f.key]} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                        rows={3} placeholder={f.placeholder}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                    ) : (
                      <input value={draft[f.key]} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                    )
                  ) : (
                    <div className="text-sm text-gray-800 bg-gray-50 rounded-md px-3 py-2 min-h-8 whitespace-pre-wrap">
                      {scope[f.key] || <span className="text-gray-400">{f.placeholder}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
