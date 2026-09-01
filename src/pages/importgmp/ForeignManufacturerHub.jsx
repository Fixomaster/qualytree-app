import React, { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Factory,
  ShieldCheck,
  FileSearch,
  Plus,
  Trash2,
  Paperclip,
  Download,
  X,
  AlertTriangle,
  Save, Globe ,
  Building2,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { permissions, requirePermission } from '../../lib/permissions'
import { fileStore } from '../../lib/fileStore'
import { onboarding } from '../../lib/onboardingState'
import { mfds } from '../../lib/mfds'
import { resolveCategoryByNo } from '../../lib/mfdsCategory'
import {
  foreignSites,
  gmpCertificates,
  otherAuditReports,
  inspectionSchedules,
  ENTRUSTED_RELATION,
  certStatusOf,
} from '../../lib/foreignManufacturerState'
import CertGate from '../../components/CertGate'

// #4 â ì ì²­ì(ìë£ê¸°ê¸° ì í©ì±ì¸ì ë± ì¬ì¬ ì ì²­ì, ì 7ì¡°ì 1í­ì 2í¸ êµ¬ë¹ìë¥) ììê³¼ ëì¼íê²
// "ê¸°í ìë¥" ë¨ì¼ ë¤ì¤ì²¨ë¶ ëì  í­ëª©ë³ ê°ë³ ìë¥ ì¬ë¡¯ì¼ë¡ êµ¬ì±íë¤.
// (ì ì¡°ì ê°ì/íëª©ëª©ë¡ì ììì ë³ë íëë¡ ì´ë¯¸ ê´ë¦¬íê³ , GMP ì í©ì¸ì ìÂ·ì¤ì¬ê²°ê³¼ ìë£ë
//  ìë GMP ì í©ì¸ì ì/í ì¸ì¦ê¸°ê´ ì¤ì¬ìë£ ì¹ììì ë³ëë¡ ê´ë¦¬íë¯ë¡ ì¬ê¸°ìë ì ì¸íë¤.)
export const FOREIGN_DOC_SLOTS = [
  { key: 'bizLicense', label: '2. ì ì¡°(ìì)ì íê°ì¦ ì¬ë³¸' },
  { key: 'orgChart', label: '2-ê°-2. ì¡°ì§ë' },
  { key: 'employeeCert', label: '2-ê°-3. ì¢ìì ì íì¸ìë£' },
  { key: 'productListDoc', label: '2-ê°-4. ì ì¡°ëë ìë£ê¸°ê¸° ëª©ë¡' },
  { key: 'cleanroomProcedure', label: '2-ë¤-2. ì²­ì ì¤ ê´ë ¨ ì ì°¨ì' },
  { key: 'monitoringProcedure', label: '2-ë¤-3. ëª¨ëí°ë§ ë° ì¸¡ì ì¥ë¹ ê´ë ¨ ì ì°¨ì' },
  { key: 'qualityManual', label: '2-ë¼. íì§ë§¤ë´ì¼(íì§ë°©ì¹¨ í¬í¨)' },
  { key: 'fgTestProcedure', label: '2-ë§-1. ìì íìí ê´ë ¨ ì ì°¨ì' },
  { key: 'fgTestReport', label: '2-ë§-2. ìíì±ì ì' },
  { key: 'purchaseProcedure', label: '2-ë°-1. êµ¬ë§¤Â·ìí ì ì°¨ì' },
  { key: 'supplierList', label: '2-ë°-2. ì£¼ì ê³µê¸ìì²´ëª ë° ìë¬´ë²ì' },
  { key: 'productSpec', label: '2-ì¬-1. ì ííì¤ì' },
  { key: 'sterilizationValidation', label: '2-ì¬-2. ë©¸ê·  ì í¨ì± íì¸ ì ì°¨ì (í´ë¹ ì)' },
  { key: 'standardChecklist', label: '2-ì. ë³í2 ê¸°ì¤ ì ê²í' },
  { key: 'conformityDeclaration', label: '2-ì. ë³í2 ê¸°ì¤ ì í©ì ì¸ë¬¸' },
  { key: 'siteOverviewTable', label: '3. ì ì¡°ì ì´ê´í' },
  { key: 'etc', label: '3. ê¸°í ìë£ (íµì­ ëìì, KGMP ì í©ì¸ì ì ì¬ë³¸, ì¬ììë±ë¡ì¦ ë±)' },
]

export default function ForeignManufacturerHub() {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((x) => x + 1)
  const [toast, setToast] = useState(null)
  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 2400) }

  const sites = foreignSites.getAll()

  // ê°ì ê³¼ì  #13 â ììGMP ì§íìí© ìì½(ì¸êµ­ì ì¡°ìÂ·GMP ì í©ì¸ì ìÂ·íµê´Â·ì´ìì¬ë¡Â·ê´ë¦¬ê¸°ì¤ìë¥¼
  // íëì ë³´ë ìì½). ê° íë©´ì localStorageë¥¼ ê·¸ëë¡ ì½ì´ ê°ë³ê² ì§ê³ë§ íë¤ â ë³ë
  // ìí ì ì¥ìë¥¼ ìë¡ ë§ë¤ì§ ìê³  ê¸°ì¡´ 4ê° íë©´ì ë°ì´í°ë¥¼ ê·¸ëë¡ ë°ìíë¤.
  const importSummary = (() => {
    const certAll = sites.flatMap((s) => gmpCertificates.getForSite(s.id))
    const certExpiring = certAll.filter((c) => certStatusOf(c.expiryDate) === 'ë§ë£ìë°').length
    const certExpired = certAll.filter((c) => certStatusOf(c.expiryDate) === 'ë§ë£').length
    let clearanceCount = 0
    try { clearanceCount = (JSON.parse(localStorage.getItem('qualytree.import_clearance') || '[]')).length } catch { /* ignore */ }
    let adverseOpen = 0
    try {
      const adv = JSON.parse(localStorage.getItem('qualytree.import_adverse') || '[]')
      adverseOpen = adv.filter((i) => !['closed', 'rejected'].includes(i.status)).length
    } catch { /* ignore */ }
    let imsStatus = null
    try {
      const ims = JSON.parse(localStorage.getItem('qualytree.import_management_standard') || 'null')
      imsStatus = ims?.docStatus || null
    } catch { /* ignore */ }
    return { sitesCount: sites.length, certExpiring, certExpired, clearanceCount, adverseOpen, imsStatus }
  })()
  const IMS_STATUS_LABEL = { draft: 'ìì±ì¤', review: 'ê²í ì¤', approval: 'ì¹ì¸ëê¸°', approved: 'ì¹ì¸ìë£' }
  const [selId, setSelId] = useState(() => searchParams.get('siteId') || sites[0]?.id || null)
  const sel = sites.find((s) => s.id === selId) || sites[0] || null
  const canEdit = permissions.can('importgmp.site.edit')

  const dueCerts = gmpCertificates.dueOrExpired()
  // ê³µíµ ì ì¶ ë¬¸ìÂ·ê¸°ì ë¬¸ìÂ·íì§ìì¤íÂ·ì ì°¨ìÂ·ê¸°ë¡ ì²´í¬ë¦¬ì¤í¸ â KGMPíµí©íí©(ì ì¡°ì¬ì©)ê³¼ ê°ì
  // ë¡ì§ì ììì¬ ê´ì (profile:'importer')ì¼ë¡ ê³ì°í´ ì´ íë©´ì í¨ê» ë³´ì¬ì¤ë¤. ì ì¡°ìë³ GMP
  // ì í©ì¸ì ì ìì¸ë ì ë§ì¤í°-ëíì¼ UIìì ì§ì  ê´ë¦¬íë¯ë¡ ì²´í¬ë¦¬ì¤í¸ìë ì¤ë³µ ëì´íì§ ìëë¤.

  const addSite = () => {
    if (!requirePermission('importgmp.site.edit')) return
    const rec = foreignSites.add({ name: 'ì ì¸êµ­ì ì¡°ì' })
    setSelId(rec.id)
    refresh()
    showToast('ì¸êµ­ì ì¡°ìê° ë±ë¡ëììµëë¤.')
  }

  const delSite = (id) => {
    if (!requirePermission('importgmp.site.edit')) return
    if (!window.confirm('ì´ ì¸êµ­ì ì¡°ìì ê´ë ¨ GMP ì¸ì ìÂ·ì¤ì¬ìë£ë¥¼ ëª¨ë ì­ì í ê¹ì?')) return
    foreignSites.delete(id)
    const next = foreignSites.getAll()
    setSelId(next[0]?.id || null)
    refresh()
    showToast('ì­ì ëììµëë¤.')
  }

  return (
    <AppLayout user={user} title="ì¸êµ­ì ì¡°ì Â· ìì GMP" subtitle="ìììì GMP ì¬ì¬ ëì â ì¸êµ­ì ì¡°ì ë±ë¡ / GMP ì í©ì¸ì ì / í ì¸ì¦ê¸°ê´ ì¤ì¬ìë£">
      <HubBanner title="ì¸êµ­ì ì¡°ì GMP ê´ë¦¬" subtitle="ISO 13485 Â§7.4.1 â ìììì GMP ì¤ì¬ ëìÂ·ì¸êµ­ì ì¡°ì ë±ë¡Â·ì¸ì ì ê´ë¦¬" icon={Building2} color="#0D9488" />
      <CertGate certId="kgmp_importer" label="ì¸êµ­ì ì¡°ì(ììGMP)">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {toast && (
          <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg text-[13px] flex items-center gap-2 fade-in" style={{ background: 'var(--moss)', color: 'var(--bg)', boxShadow: '0 6px 20px rgba(15,26,20,0.18)', fontWeight: 500 }}>
            â {toast}
          </div>
        )}

        <div className="mb-5">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
            IMPORT-GMP Â· FOREIGN MANUFACTURER REGISTRY
          </span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            ì¸êµ­ì ì¡°ì Â· ìì GMP
          </div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            ììììë ìê¸° ì¬ìì¥ì´ ìëë¼ ì íì ë§ëë ì¸êµ­ì ì¡°ìê° GMP ì¬ì¬ ëììëë¤. ì ì¡°ìë³ë¡ ê°ìÂ·GMP ì í©ì¸ì ìÂ·í ì¸ì¦ê¸°ê´ ì¤ì¬ìë£ë¥¼ ë±ë¡Â·ê´ë¦¬í©ëë¤.
          </div>
        </div>

        {/* ê°ì ê³¼ì  #13 â ììGMP ì§íìí© ìì½ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <a href="#sites" className="p-3 rounded-xl text-center no-underline" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{importSummary.sitesCount}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>ë±ë¡ ì¸êµ­ì ì¡°ì</div>
          </a>
          <div className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[20px] font-bold" style={{ color: importSummary.certExpired > 0 ? '#DC2626' : importSummary.certExpiring > 0 ? '#D97706' : 'var(--ink)' }}>
              {importSummary.certExpired + importSummary.certExpiring}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>GMP ì¸ì ì ë§ë£/ìë°</div>
          </div>
          <a href="/import-clearance" className="p-3 rounded-xl text-center no-underline" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{importSummary.clearanceCount}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>ììíµê´ê¸°ë¡</div>
          </a>
          <a href="/import-adverse" className="p-3 rounded-xl text-center no-underline" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[20px] font-bold" style={{ color: importSummary.adverseOpen > 0 ? '#D97706' : 'var(--ink)' }}>{importSummary.adverseOpen}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>ì´ìì¬ë¡ ì§íì¤</div>
          </a>
          <a href="/import-management-standard" className="p-3 rounded-xl text-center no-underline" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{importSummary.imsStatus ? (IMS_STATUS_LABEL[importSummary.imsStatus] || importSummary.imsStatus) : 'ë¯¸ìì±'}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>ììê´ë¦¬ê¸°ì¤ì</div>
          </a>
        </div>

        {dueCerts.length > 0 && (
          <div className="card-base p-3.5 mb-5 flex items-start gap-2.5" style={{ background: 'var(--amber-soft)' }}>
            <AlertTriangle size={16} style={{ color: 'var(--amber)' }} className="shrink-0 mt-0.5" />
        <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:8,padding:'10px 16px',marginBottom:16,display:'flex',gap:10,alignItems:'flex-start'}}>
          <div style={{width:20,height:20,borderRadius:'50%',background:'#16A34A',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0,marginTop:1}}>i</div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'#166534',marginBottom:3}}>í´ì¸ ìì í ì ì¡°ì ì ì©</div>
            <div style={{fontSize:12,color:'#14532D',lineHeight:1.6}}>ìì ìë£ê¸°ê¸°ì í´ì¸ ì ì¡°ì(ì íë³ GMP ì í©ì¸ì Â·ì¤íì¡°ì¬Â·ì¸ì¦ ê´ë¦¬)ë¥¼ ë´ë¹í©ëë¤. ìë¶ìì¬Â·ë¶í ë± êµ­ë´ ê³µê¸ìì²´ë <b>ê³µê¸ìì²´ ê´ë¦¬</b> ë©ë´ìì ê´ë¦¬íì¸ì.</div>
          </div>
        </div>
            <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
              <b>GMP ì í©ì¸ì ì {dueCerts.length}ê±´</b>ì´ ë§ë£ëìê±°ë 90ì¼ ì´ë´ ë§ë£ ìì ìëë¤. ì ê¸°ê°±ì ì¬ì¬ë ì í¨ê¸°í ë§ë£ì¼ 90ì¼ ì ê¹ì§ ì ì²­í´ì¼ í©ëë¤.
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-5 gap-3">
          <div className="md:col-span-2 space-y-2">
            {canEdit && (
              <button onClick={addSite} className="btn-ghost text-[12px] w-full justify-center">
                <Plus size={12} /> ì¸êµ­ì ì¡°ì ì¶ê°
              </button>
            )}
            {sites.length === 0 && <EmptyState icon={Factory} text="ë±ë¡ë ì¸êµ­ì ì¡°ìê° ììµëë¤." />}
            {sites.map((s) => {
              const certs = gmpCertificates.getForSite(s.id)
              const latestStatus = certs[0] ? certStatusOf(certs[0].expiryDate) : null
              const tone = latestStatus === 'ë§ë£' ? 'rose' : latestStatus === 'ë§ë£ìë°' ? 'amber' : latestStatus === 'ì í¨' ? 'emerald' : 'slate'
              const active = s.id === (sel?.id)
              return (
                <button
                  key={s.id}
                  onClick={() => setSelId(s.id)}
                  className="card-base p-3.5 w-full text-left block"
                  style={active ? { borderColor: 'var(--moss)', background: 'var(--leaf-soft)' } : undefined}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{s.name || '(ì´ë¦ìì)'}</span>
                    {latestStatus && <Badge text={'GMP ' + latestStatus} tone={tone} />}
                    {certs.length === 0 && <Badge text="GMP ì¸ì ì ìì" tone="rose" />}
                  </div>
                  <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-mute)' }}>{s.address || 'ì£¼ì ë¯¸ìë ¥'}</div>
                </button>
              )
            })}
          </div>

          <div className="md:col-span-3">
            {sel ? (
              <SiteDetail key={sel.id} site={sel} canEdit={canEdit} onAction={showToast} onChanged={refresh} onDelete={() => delSite(sel.id)} allSites={sites} />
            ) : (
              <EmptyState icon={Factory} text="ì¼ìª½ìì ì¸êµ­ì ì¡°ìë¥¼ ì ííê±°ë ì¶ê°íì¸ì." />
            )}
          </div>
        </div>

      </div>
      <SiteProductMatrix sites={sites} />
      </CertGate>
    </AppLayout>
  )
}

/* ================================================================
   ì ì¡°ì ìì¸ â ê¸°ë³¸ì ë³´ + GMP ì í©ì¸ì ì + í ì¸ì¦ê¸°ê´ ì¤ì¬ìë£
   ================================================================ */

function SiteProductMatrix({ sites }) {
  const [open, setOpen] = useState(false)
  const rows = sites.flatMap(site =>
    (site.products || []).map(p => ({ siteName: site.name || '(ì´ë¦ ìì)', group: p.group || '', productName: p.name || '', grade: p.grade || '' }))
  )
  return (
    <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)' }}
      >
        <span className="text-[13.5px] font-bold">ì ì¡°ì-íëª© ì°ê²° íí©</span>
        <span className="flex items-center gap-2">
          <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}>{rows.length}ê±´</span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {open && (
        rows.length === 0 ? (
          <p className="text-[12px] py-6 text-center" style={{ color: 'var(--ink-faint)' }}>ë±ë¡ë ì ì¡°ì ëë íëª©ì´ ììµëë¤.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--border)' }}>
                  {['ì¸êµ­ì ì¡°ì', 'íëª©êµ°', 'íëª©ëª', 'ë±ê¸'].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-semibold" style={{ color: 'var(--ink-mute)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-4 py-2 font-medium" style={{ color: 'var(--ink)', maxWidth: 180 }}>{r.siteName}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--ink-soft)' }}>{r.group}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--ink)' }}>{r.productName}</td>
                    <td className="px-4 py-2 text-center">
                      {r.grade && <span className="inline-block text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}>{r.grade}ë±ê¸</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}


function SiteDetail({ site, canEdit, onAction, onChanged, onDelete, allSites }) {
  const [form, setForm] = useState(site)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const dirty = JSON.stringify(form) !== JSON.stringify(site)
  const [pnOpenId, setPnOpenId] = useState(null) // #3 íëª©ëª ê²ì ëë¡­ë¤ì´ (ì´ë ¤ìë í id)

  // #17 â íëª©êµ°ì ì¬ì©ìê° ì§ì  íì´ííì§ ììë, MFDS íëª©ë¶ë¥ ë°ì´í°ë¡ íëª©ëªì ì°¾ì
  // ë¶ë¥ë²í¸ ê¸°ì¤ íëª©êµ°ì ìë ìì±í´ì¤ë¤(RegulatoryHub Step1ê³¼ ëì¼í ë°©ì).
  React.useEffect(() => { mfds.load() }, [])
  const autoFillGroup = (id, name) => {
    if (!name || !name.trim()) return
    const hit = mfds.search(name, 1).find((it) => it.name === name.trim()) || mfds.search(name, 1)[0]
    if (!hit) return
    const cat = resolveCategoryByNo(hit.no)
    if (!cat) return
    setForm((f) => ({
      ...f,
      products: (f.products || []).map((row) => (row.id === id && !row.group ? { ...row, group: cat.name } : row)),
    }))
  }

  // ì´ë¯¸ ë±ë¡ë íëª©ëª â ë¤ë¥¸ ì¸êµ­ì ì¡°ìì ë±ë¡ë íëª© + íì¬ ì íÂ·ê³µì (ProductsHub)ì ë±ë¡ë íëª©ì í¨ê» ê²ì íë³´ë¡ ì¬ì© (#3, #25 ì¬ìì )
  // ì ì¡°ìë¥¼ ì²ì ë±ë¡í  ëë ë¤ë¥¸ ì ì¡°ì íëª©ì´ ìì§ ìì´ ê²ìì´ ë¹ì´ ë³´ì¼ ì ìì¼ë¯ë¡, ì´ë¯¸ ì¨ë³´ë©ìì ë±ë¡í ìì¬ íëª©ë í¨ê» ì°¾ëë¤.
  const knownProducts = React.useMemo(() => {
    const map = new Map()
    ;(allSites || []).forEach((s) => (s.products || []).forEach((p) => {
      if (p.name && !map.has(p.name)) map.set(p.name, p)
    }))
    const obProducts = (onboarding.load()?.products || [])
    obProducts.forEach((p) => {
      const name = p.itemName || p.name
      if (name && !map.has(name)) map.set(name, { name, group: p.cat1 || '', grade: p.grade ? p.grade + 'ë±ê¸' : '' })
    })
    return Array.from(map.values())
  }, [allSites])

  const save = () => {
    if (!requirePermission('importgmp.site.edit')) return
    foreignSites.update(site.id, form)
    onChanged()
    onAction('ì ì¡°ì ì ë³´ê° ì ì¥ëììµëë¤.')
  }

  const attachFacilityFile = async (file) => {
    if (!requirePermission('importgmp.site.edit')) return
    const fileId = await fileStore.saveFile(file)
    foreignSites.update(site.id, { facilityFileId: fileId, facilityFileName: file.name })
    onChanged()
  }
  const removeFacilityFile = () => {
    if (!requirePermission('importgmp.site.edit')) return
    foreignSites.update(site.id, { facilityFileId: null, facilityFileName: '' })
    onChanged()
  }

  // íëª©ëª©ë¡: íëª©êµ°/íëª©ëª/íëª©ë±ê¸ êµ¬ì¡°í (#295) â ì¼ë° íëì ëì¼íê² 'ë³ê²½ì¬í­ ì ì¥'ì¼ë¡ ë°ì
  const addProductRow = () => {
    if (!canEdit) return
    setForm((f) => ({ ...f, products: [...(f.products || []), { id: Math.random().toString(36).slice(2, 9), group: '', name: '', grade: '1ë±ê¸' }] }))
  }
  const setProductField = (id, key, val) => {
    setForm((f) => ({ ...f, products: (f.products || []).map((p) => (p.id === id ? { ...p, [key]: val } : p)) }))
  }
  const removeProductRow = (id) => {
    setForm((f) => ({ ...f, products: (f.products || []).filter((p) => p.id !== id) }))
  }

  // #4 â ì ì²­ì êµ¬ë¹ìë¥ë³ ê°ë³ ì¬ë¡¯ ë¤ì¤ ì²¨ë¶ (ê¸°ì¡´ "ê¸°í ìë¥" ë¨ì¼ ë²í· ëì²´)
  const attachSlotFile = async (slotKey, file) => {
    if (!requirePermission('importgmp.site.edit')) return
    const fileId = await fileStore.saveFile(file)
    const cur = { ...(site.docSlotFiles || {}) }
    cur[slotKey] = [...(cur[slotKey] || []), { id: Math.random().toString(36).slice(2, 9), fileId, fileName: file.name }]
    foreignSites.update(site.id, { docSlotFiles: cur })
    setF('docSlotFiles', cur)
    onChanged()
  }
  const removeSlotFile = (slotKey, fid) => {
    if (!requirePermission('importgmp.site.edit')) return
    const cur = { ...(site.docSlotFiles || {}) }
    cur[slotKey] = (cur[slotKey] || []).filter((x) => x.id !== fid)
    foreignSites.update(site.id, { docSlotFiles: cur })
    setF('docSlotFiles', cur)
    onChanged()
  }

  const openFile = async (fileId) => {
    const url = await fileStore.getObjectURL(fileId)
    if (!url) { window.alert('íì¼ì ì°¾ì ì ììµëë¤.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  const missing = []
  if (!site.products || site.products.length === 0) missing.push('íëª©ëª©ë¡')
  if (!site.facilityFileId) missing.push('ìì¤ê°ì(íë©´ëÂ·ì¥ë¹ëª©ë¡)')

  return (
    <div className="space-y-4">
      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>ì ì¡°ì ê°ì</div>
          {canEdit && <button onClick={onDelete} className="text-[12px] inline-flex items-center gap-1" style={{ color: 'var(--rust, #c0392b)' }}><Trash2 size={13} /> ì­ì </button>}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="ì ì¡°ì ëªì¹­" value={form.name} onChange={(v) => setF('name', v)} className="sm:col-span-2" />
          <Field label="ì£¼ì" value={form.address} onChange={(v) => setF('address', v)} className="sm:col-span-2" />
          <Field label="ì¢ìì ì" value={form.employeeCount} onChange={(v) => setF('employeeCount', v)} placeholder="ì ì¡°Â·íì§ ê´ë ¨ ì´ ì¸ì" />
          <SelectField label="ìíì ì¡° ê´ê³" value={form.entrustedRelation} onChange={(v) => setF('entrustedRelation', v)} options={Object.values(ENTRUSTED_RELATION)} />
          {form.entrustedRelation !== ENTRUSTED_RELATION.NONE && (
            <Field label="ìë ì ì¡°ìëª (ì ì¡°ìë¢°ì/ì ì¡°ì)" value={form.relatedSiteName} onChange={(v) => setF('relatedSiteName', v)} className="sm:col-span-2" />
          )}
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="block text-[11.5px] font-medium" style={{ color: 'var(--ink-mute)' }}>íëª©ëª©ë¡ (íëª©êµ° Â· íëª©ëª Â· íëª©ë±ê¸)</span>
            {canEdit && <button type="button" onClick={addProductRow} className="inline-flex items-center gap-1 text-[11.5px] font-medium" style={{ color: 'var(--moss)' }}><Plus size={12} /> íëª© ì¶ê°</button>}
          </div>
          {(form.products || []).length === 0 ? (
            <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>ë±ë¡ë íëª©ì´ ììµëë¤.</div>
          ) : (
            <div className="space-y-2">
              {form.products.map((p, idx) => (
                <div key={p.id} className="grid grid-cols-[1.4fr_1.1fr_0.9fr_auto] gap-2 items-end">
                  <div className="relative">
                    {idx === 0 && <span className="block text-[10.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>íëª©ëª (ê²ì)</span>}
                    <input className="input-base" style={{ padding: '0.4rem 0.6rem', fontSize: 12.5 }}
                      value={p.name}
                      onChange={(v) => { setProductField(p.id, 'name', v.target.value); setPnOpenId(p.id) }}
                      onFocus={() => setPnOpenId(p.id)}
                      onBlur={() => { autoFillGroup(p.id, p.name); setTimeout(() => setPnOpenId((cur) => (cur === p.id ? null : cur)), 150) }}
                      placeholder="ì: ê¸ìì ì¸ê³µê³ ê´ì  â ìë ¥ ëë ê¸°ì¡´ íëª© ê²ì (íëª©êµ° ìë ìì±)"
                      disabled={!canEdit} />
                    {pnOpenId === p.id && p.name && (() => {
                      const q = p.name.toLowerCase()
                      const hits = knownProducts.filter((kp) => kp.name.toLowerCase().includes(q) && kp.name !== p.name).slice(0, 8)
                      if (hits.length === 0) return null
                      return (
                        <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100">
                          {hits.map((kp) => (
                            <button key={kp.name} type="button"
                              onMouseDown={() => {
                                setForm((f) => ({ ...f, products: (f.products || []).map((row) => (row.id === p.id ? { ...row, name: kp.name, group: kp.group || row.group, grade: kp.grade || row.grade } : row)) }))
                                setPnOpenId(null)
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-[12px] text-slate-800">
                              {kp.name} <span className="text-slate-400">Â· {kp.group || 'íëª©êµ° ë¯¸ì§ì '} Â· {kp.grade || 'ë±ê¸ ë¯¸ì§ì '}</span>
                            </button>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                  <Field label={idx === 0 ? 'íëª©êµ°' : ''} value={p.group} onChange={(v) => setProductField(p.id, 'group', v)} placeholder="ì: ì íì© ìíëí¸" />
                  <SelectField label={idx === 0 ? 'íëª©ë±ê¸' : ''} value={p.grade} onChange={(v) => setProductField(p.id, 'grade', v)} options={['1ë±ê¸', '2ë±ê¸', '3ë±ê¸', '4ë±ê¸']} />
                  {canEdit ? (
                    <button type="button" onClick={() => removeProductRow(p.id)} className="mb-1.5" style={{ color: 'var(--rust, #c0392b)' }}><Trash2 size={14} /></button>
                  ) : <span />}
                </div>
              ))}
            </div>
          )}
        </div>
        <TextAreaField label="ë¹ê³ " value={form.notes} onChange={(v) => setF('notes', v)} className="mt-3" />

        <div className="mt-3">
          <div className="text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>ìì¤ê°ì (íë©´ëÂ·ì¥ë¹ëª©ë¡)</div>
          {form.facilityFileId ? (
            <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
              <button type="button" onClick={() => openFile(form.facilityFileId)} className="inline-flex items-center gap-1 hover:underline"><Download size={11} /> {form.facilityFileName || 'ì²¨ë¶íì¼'}</button>
              {canEdit && <button type="button" onClick={removeFacilityFile} className="opacity-50 hover:opacity-100"><X size={11} /></button>}
            </span>
          ) : canEdit ? (
            <FileAttachButton onPick={attachFacilityFile} label="ìì¤ê°ì íì¼ ì²¨ë¶ (5MB ì´í)" />
          ) : (
            <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>ì²¨ë¶ íì¼ ìì</span>
          )}
        </div>

        <div className="mt-3">
          <div className="text-[11.5px] font-medium mb-2" style={{ color: 'var(--ink-mute)' }}>
            êµ¬ë¹ ìë¥ (ìë£ê¸°ê¸° ì í©ì±ì¸ì ë± ì¬ì¬ ì ì²­ì Â· ì 7ì¡°ì 1í­ì 2í¸ ìì ê¸°ì¤)
          </div>
          <div className="space-y-2">
            {FOREIGN_DOC_SLOTS.map((slot) => {
              const files = (form.docSlotFiles || {})[slot.key] || []
              return (
                <div key={slot.key} className="rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-soft)' }}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11.5px]" style={{ color: files.length ? 'var(--ink)' : 'var(--ink-mute)' }}>
                      {files.length > 0 && <span style={{ color: 'var(--moss)' }}>â </span>}
                      {slot.label}
                    </span>
                    {canEdit && <FileAttachButton onPick={(f) => attachSlotFile(slot.key, f)} label="ì²¨ë¶" />}
                  </div>
                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {files.map((f) => (
                        <span key={f.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px]" style={{ background: 'var(--bg-card)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}>
                          <button type="button" onClick={() => openFile(f.fileId)} className="inline-flex items-center gap-1 hover:underline"><Download size={10} /> {f.fileName}</button>
                          {canEdit && <button type="button" onClick={() => removeSlotFile(slot.key, f.id)} className="opacity-50 hover:opacity-100"><X size={10} /></button>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end mt-3">
            <button onClick={save} disabled={!dirty} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: 12.5 }}><Save size={13} /> ë³ê²½ì¬í­ ì ì¥</button>
          </div>
        )}
      </div>

      {missing.length > 0 && (
        <div className="card-base p-3.5" style={{ background: 'var(--amber-soft)' }}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} style={{ color: 'var(--amber)' }} className="shrink-0 mt-0.5" />
            <div className="text-[12px]" style={{ color: 'var(--ink)' }}>
              ìì§ ë±ë¡ëì§ ìì íì í­ëª©: <b>{missing.join(', ')}</b>
            </div>
          </div>
        </div>
      )}

      <GmpCertificatesCard siteId={site.id} canEdit={canEdit} onAction={onAction} />
      <OtherAuditReportsCard siteId={site.id} canEdit={canEdit} onAction={onAction} />
      <InspectionScheduleCard siteId={site.id} canEdit={canEdit} />
    </div>
  )
}

/* ================================================================
   GMP ì í©ì¸ì ì (ì ì¡°ìë¹ Nê±´)
   ================================================================ */
const EMPTY_CERT = { certNo: '', issuedDate: '', expiryDate: '', notes: '' }

function GmpCertificatesCard({ siteId, canEdit, onAction }) {
  const [list, setList] = useState(() => gmpCertificates.getForSite(siteId))
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_CERT)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const [busyId, setBusyId] = useState(null)

  const add = () => {
    if (!requirePermission('importgmp.cert.edit')) return
    if (!form.expiryDate) { alert('ì í¨ê¸°íì ìë ¥íì¸ì.'); return }
    gmpCertificates.add(siteId, form)
    setList(gmpCertificates.getForSite(siteId))
    setForm(EMPTY_CERT)
    setAdding(false)
    onAction('GMP ì í©ì¸ì ìê° ë±ë¡ëììµëë¤.')
  }

  const del = (id) => {
    if (!requirePermission('importgmp.cert.edit')) return
    if (!window.confirm('ì´ GMP ì í©ì¸ì ìë¥¼ ì­ì í ê¹ì?')) return
    gmpCertificates.delete(id)
    setList(gmpCertificates.getForSite(siteId))
  }

  const attach = async (id, file) => {
    if (!requirePermission('importgmp.cert.edit')) return
    setBusyId(id)
    try {
      const fileId = await fileStore.saveFile(file)
      gmpCertificates.update(id, { fileId, fileName: file.name })
      setList(gmpCertificates.getForSite(siteId))
    } finally {
      setBusyId(null)
    }
  }
  const openFile = async (fileId) => {
    const url = await fileStore.getObjectURL(fileId)
    if (!url) { window.alert('íì¼ì ì°¾ì ì ììµëë¤.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  return (
    <div className="card-base p-4">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={14} style={{ color: 'var(--moss)' }} />
        <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>GMP ì í©ì¸ì ì ({list.length}ê±´)</div>
      </div>
      <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-mute)' }}>ì í¨ê¸°ê° 3ë â ë§ë£ì¼ 90ì¼ ì ê¹ì§ ì ê¸°ê°±ì ì¬ì¬ë¥¼ ì ì²­í´ì¼ í©ëë¤.</div>

      {canEdit && !adding && (
        <button onClick={() => setAdding(true)} className="btn-ghost text-[12px] mb-2"><Plus size={12} /> ì í©ì¸ì ì ë±ë¡</button>
      )}
      {adding && (
        <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--bg-soft)' }}>
          <div className="grid sm:grid-cols-3 gap-2">
            <Field label="ì¸ì ì ë²í¸" value={form.certNo} onChange={(v) => setF('certNo', v)} />
            <Field label="ë°ê¸ì¼" type="date" value={form.issuedDate} onChange={(v) => setF('issuedDate', v)} />
            <Field label="ì í¨ê¸°í" type="date" value={form.expiryDate} onChange={(v) => setF('expiryDate', v)} />
          </div>
          <TextAreaField label="ë¹ê³ " value={form.notes} onChange={(v) => setF('notes', v)} className="mt-2" />
          <div className="flex gap-2 mt-2">
            <button onClick={add} className="btn-primary text-[12.5px]" style={{ padding: '0.45rem 0.9rem' }}>ì ì¥</button>
            <button onClick={() => { setAdding(false); setForm(EMPTY_CERT) }} className="btn-ghost text-[12.5px]">ì·¨ì</button>
          </div>
        </div>
      )}

      {list.length === 0 && !adding && <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>ë±ë¡ë GMP ì í©ì¸ì ìê° ììµëë¤.</div>}

      <div className="space-y-2">
        {list.map((c) => {
          const st = certStatusOf(c.expiryDate)
          const tone = st === 'ë§ë£' ? 'rose' : st === 'ë§ë£ìë°' ? 'amber' : st === 'ì í¨' ? 'emerald' : 'slate'
          return (
            <div key={c.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
              <div className="flex items-center justify-between">
                <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                  <b>{c.certNo || '(ë²í¸ ë¯¸ìë ¥)'}</b> Â· ë°ê¸ {c.issuedDate || 'â'} Â· ë§ë£ {c.expiryDate || 'â'} {st && <Badge text={st} tone={tone} />}
                </div>
                {canEdit && <button onClick={() => del(c.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>}
              </div>
              {c.notes && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{c.notes}</div>}
              <div className="mt-1.5">
                {c.fileId ? (
                  <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                    <button type="button" onClick={() => openFile(c.fileId)} className="inline-flex items-center gap-1 hover:underline"><Download size={11} /> {c.fileName || 'ì²¨ë¶íì¼'}</button>
                  </span>
                ) : canEdit ? (
                  <FileAttachButton busy={busyId === c.id} onPick={(f) => attach(c.id, f)} label="ì¸ì ì íì¼ ì²¨ë¶" />
                ) : (
                  <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>ì²¨ë¶ íì¼ ìì</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================
   í ì¸ì¦ê¸°ê´ ì¤ì¬ìë£ (ì ì¡°ìë¹ Nê±´)
   ================================================================ */
const EMPTY_INSP = { scheduledDate: '', conductedDate: '', inspector: '', result: '', findings: '', action: '', notes: '' }

function InspectionScheduleCard({ siteId, canEdit }) {
  const [list, setList] = useState(() => inspectionSchedules.getForSite(siteId))
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_INSP)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const reload = () => setList(inspectionSchedules.getForSite(siteId))

  const save = () => {
    if (!form.scheduledDate) return
    if (editId) { inspectionSchedules.update(editId, form) }
    else { inspectionSchedules.add(siteId, form) }
    reload(); setAdding(false); setEditId(null); setForm(EMPTY_INSP)
  }

  const del = (id) => { inspectionSchedules.delete(id); reload() }

  const openEdit = (rec) => { setForm({ ...rec }); setEditId(rec.id); setAdding(true) }

  const RESULT_OPTS = ['', 'ì í©', 'ë¶ì í©', 'ì¡°ê±´ë¶ì í©', 'ìì ']

  return (
    <div className="mt-6 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13.5px] font-bold" style={{ color: 'var(--ink)' }}>ì¤íì¡°ì¬ ì¼ì </h3>
        {canEdit && !adding && (
          <button onClick={() => { setAdding(true); setEditId(null); setForm(EMPTY_INSP) }}
            className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg font-semibold"
            style={{ background: 'var(--brand)', color: 'white', border: 'none', cursor: 'pointer' }}>
            <Plus size={12} />ì¼ì  ì¶ê°
          </button>
        )}
      </div>

      {adding && (
        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="ìì ì¼ *" value={form.scheduledDate} onChange={(v) => setF('scheduledDate', v)} type="date" />
            <Field label="ì¤ìì¼" value={form.conductedDate} onChange={(v) => setF('conductedDate', v)} type="date" />
            <Field label="ì¤íì¡°ì¬ì" value={form.inspector} onChange={(v) => setF('inspector', v)} placeholder="ë´ë¹ì ì´ë¦" />
            <div>
              <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-mute)' }}>ê²°ê³¼</label>
              <select value={form.result} onChange={(e) => setF('result', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-[12.5px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--ink)' }}>
                {RESULT_OPTS.map(o => <option key={o} value={o}>{o || 'ì í'}</option>)}
              </select>
            </div>
          </div>
          <TextAreaField label="ì§ì ì¬í­" value={form.findings} onChange={(v) => setF('findings', v)} rows={2} />
          <TextAreaField label="ìì ì¡°ì¹" value={form.action} onChange={(v) => setF('action', v)} rows={2} />
          <TextAreaField label="ë¹ê³ " value={form.notes} onChange={(v) => setF('notes', v)} rows={1} />
          <div className="flex gap-2 mt-3">
            <button onClick={() => { setAdding(false); setEditId(null); setForm(EMPTY_INSP) }}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style={{ background: 'var(--bg-card)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>ì·¨ì</button>
            <button onClick={save}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style={{ background: 'var(--brand)', color: 'white', border: 'none', cursor: 'pointer' }}>{editId ? 'ìì ' : 'ì ì¥'}</button>
          </div>
        </div>
      )}

      {list.length === 0 && !adding ? (
        <p className="text-[12px] py-4 text-center" style={{ color: 'var(--ink-faint)' }}>ë±ë¡ë ì¤íì¡°ì¬ ì¼ì ì´ ììµëë¤.</p>
      ) : (
        <div className="space-y-2">
          {list.map(rec => {
            const resultColor = rec.result === 'ì í©' ? '#065f46' : rec.result === 'ë¶ì í©' ? '#991b1b' : '#92400e'
            const resultBg = rec.result === 'ì í©' ? '#d1fae5' : rec.result === 'ë¶ì í©' ? '#fee2e2' : '#fef3c7'
            return (
              <div key={rec.id} className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{rec.scheduledDate || 'ì¼ì  ë¯¸ì '}</span>
                    {rec.conductedDate && <span className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>ì¤ì: {rec.conductedDate}</span>}
                    {rec.result && <span className="text-[10.5px] px-2 py-0.5 rounded-full font-medium" style={{ background: resultBg, color: resultColor }}>{rec.result}</span>}
                  </div>
                  {rec.inspector && <p className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>ì¡°ì¬ì: {rec.inspector}</p>}
                  {rec.findings && <p className="text-[11.5px] mt-1" style={{ color: 'var(--ink-soft)' }}>ì§ì : {rec.findings}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(rec)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', padding: '4px' }}><Edit3 size={13} /></button>
                    <button onClick={() => del(rec.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: '4px' }}><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const EMPTY_REPORT = { issuer: '', certType: 'CE', auditDate: '', expiryDate: '', notes: '' }

function OtherAuditReportsCard({ siteId, canEdit, onAction }) {
  const [list, setList] = useState(() => otherAuditReports.getForSite(siteId))
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_REPORT)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const [busyId, setBusyId] = useState(null)

  const add = () => {
    if (!requirePermission('importgmp.cert.edit')) return
    if (!form.issuer.trim()) { alert('ì¸ì¦ê¸°ê´ëªì ìë ¥íì¸ì.'); return }
    otherAuditReports.add(siteId, form)
    setList(otherAuditReports.getForSite(siteId))
    setForm(EMPTY_REPORT)
    setAdding(false)
    onAction('ì¤ì¬ìë£ê° ë±ë¡ëììµëë¤.')
  }

  const del = (id) => {
    if (!requirePermission('importgmp.cert.edit')) return
    if (!window.confirm('ì´ ì¤ì¬ìë£ë¥¼ ì­ì í ê¹ì?')) return
    otherAuditReports.delete(id)
    setList(otherAuditReports.getForSite(siteId))
  }

  const attach = async (id, file) => {
    if (!requirePermission('importgmp.cert.edit')) return
    setBusyId(id)
    try {
      const fileId = await fileStore.saveFile(file)
      otherAuditReports.update(id, { resultFileId: fileId, resultFileName: file.name })
      setList(otherAuditReports.getForSite(siteId))
    } finally {
      setBusyId(null)
    }
  }
  const openFile = async (fileId) => {
    const url = await fileStore.getObjectURL(fileId)
    if (!url) { window.alert('íì¼ì ì°¾ì ì ììµëë¤.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  return (
    <div className="card-base p-4">
      <div className="flex items-center gap-2 mb-1">
        <FileSearch size={14} style={{ color: 'var(--moss)' }} />
        <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>í ì¸ì¦ê¸°ê´ ì¤ì¬ìë£ ({list.length}ê±´)</div>
      </div>
      <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-mute)' }}>ìµê·¼ 3ë ì´ë´ ë¤ë¥¸ íì§ìì¤í ì¸ì¦ê¸°ê´ì¼ë¡ë¶í° ë°ì ì¤ì¬ ê²°ê³¼ê° ìë ê²½ì° ë±ë¡í©ëë¤. (ì í)</div>

      {canEdit && !adding && (
        <button onClick={() => setAdding(true)} className="btn-ghost text-[12px] mb-2"><Plus size={12} /> ì¤ì¬ìë£ ë±ë¡</button>
      )}
      {adding && (
        <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--bg-soft)' }}>
          <div className="grid sm:grid-cols-2 gap-2">
            <Field label="ì¸ì¦ê¸°ê´" value={form.issuer} onChange={(v) => setF('issuer', v)} placeholder="ì: TÃV SÃD" />
            <SelectField label="ì¸ì¦ ì¢ë¥" value={form.certType} onChange={(v) => setF('certType', v)}
              options={[{v:'CE',l:'CE ì¸ì¦'}, {v:'FDA',l:'FDA 510(k)/PMA'}, {v:'ISO',l:'ISO 13485'}, {v:'ê¸°í',l:'ê¸°í'}]} />
          </div>
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
            <Field label="ì¬ì¬ì¼" type="date" value={form.auditDate} onChange={(v) => setF('auditDate', v)} />
            <Field label="ë§ë£ì¼" type="date" value={form.expiryDate} onChange={(v) => setF('expiryDate', v)} />
          </div>
          <TextAreaField label="ë¹ê³ " value={form.notes} onChange={(v) => setF('notes', v)} className="mt-2" />
          <div className="flex gap-2 mt-2">
            <button onClick={add} className="btn-primary text-[12.5px]" style={{ padding: '0.45rem 0.9rem' }}>ì ì¥</button>
            <button onClick={() => { setAdding(false); setForm(EMPTY_REPORT) }} className="btn-ghost text-[12.5px]">ì·¨ì</button>
          </div>
        </div>
      )}

      {list.length === 0 && !adding && <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>ë±ë¡ë ì¤ì¬ìë£ê° ììµëë¤.</div>}

      <div className="space-y-2">
        {list.map((r) => (
          <div key={r.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
            <div className="flex items-center justify-between">
              <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                <b>{r.issuer}</b> Â· {r.auditType || 'ì í ë¯¸ìë ¥'} Â· {r.auditDate || 'ë ì§ ë¯¸ìë ¥'}
              </div>
              {canEdit && <button onClick={() => del(r.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>}
            </div>
            {r.notes && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{r.notes}</div>}
            <div className="mt-1.5">
              {r.resultFileId ? (
                <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                  <button type="button" onClick={() => openFile(r.resultFileId)} className="inline-flex items-center gap-1 hover:underline"><Download size={11} /> {r.resultFileName || 'ì²¨ë¶íì¼'}</button>
                </span>
              ) : canEdit ? (
                <FileAttachButton busy={busyId === r.id} onPick={(f) => attach(r.id, f)} label="ì¤ì¬ë³´ê³ ì íì¼ ì²¨ë¶" />
              ) : (
                <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>ì²¨ë¶ íì¼ ìì</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ================================================================
   ê³µíµ UI
   ================================================================ */
function FileAttachButton({ busy, onPick, label }) {
  const ref = useRef(null)
  return (
    <>
      <input ref={ref} type="file" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) onPick(f) }} />
      <button type="button" onClick={() => ref.current && ref.current.click()} disabled={busy} className="inline-flex items-center gap-1 text-[11.5px] font-medium" style={{ color: 'var(--moss)' }}>
        <Paperclip size={12} /> {busy ? 'ìë¡ë ì¤â¦' : (label || 'íì¼ ì²¨ë¶ (5MB ì´í)')}
      </button>
    </>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <input type={type} className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function SelectField({ label, value, onChange, options, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <select className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const v = typeof o === 'object' ? o.v : o
          const l = typeof o === 'object' ? o.l : o
          return <option key={v} value={v}>{l}</option>
        })}
      </select>
    </label>
  )
}

function TextAreaField({ label, value, onChange, placeholder, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <textarea className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13, minHeight: 60 }} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}


function EmptyState({ icon: Icon, text }) {
  return (
    <div className="card-base p-8 text-center" style={{ borderStyle: 'dashed' }}>
      <Icon size={28} style={{ color: 'var(--ink-faint)', margin: '0 auto' }} strokeWidth={1.4} />
      <div className="mt-2 text-[13px]" style={{ color: 'var(--ink-mute)' }}>{text}</div>
    </div>
  )
}

function Badge({ text, tone = 'slate' }) {
  const map = {
    emerald: { bg: 'var(--leaf-soft)', fg: 'var(--moss)' },
    amber: { bg: 'var(--amber-soft)', fg: 'var(--amber)' },
    rose: { bg: '#fdecec', fg: '#c0392b' },
    slate: { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)' },
  }
  const c = map[tone] || map.slate
  return <span className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold ml-1.5" style={{ background: c.bg, color: c.fg }}>{text}</span>
}
