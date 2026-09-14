import React, { useState } from 'react'
import { Tag, Package, Link2, Plus, Trash2, Printer } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'

const LS_LABELS = 'qualytree.labels'
const LS_PKG = 'qualytree.packaging_materials'

const load = k => { try { return JSON.parse(localStorage.getItem(k)||'[]') } catch { return [] } }
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v))

const LABEL_TABS = [
  { key:'label', label:'라벨 관리', icon: Tag },
  { key:'packaging', label:'포장재 관리', icon: Package },
  { key:'dmr', label:'DMR 연동', icon: Link2 },
]

const EMPTY_LABEL = { partNo:'', name:'', version:'', category:'', status:'draft', material:'', size:'', approvedBy:'', notes:'' }
const EMPTY_PKG = { code:'', name:'', type:'', supplier:'', unit:'', status:'active', notes:'' }

export default function LabelPackagingHub() {
  const [activeTab, setActiveTab] = useState('label')
  const [labels, setLabels] = useState(() => load(LS_LABELS))
  const [pkgs, setPkgs] = useState(() => load(LS_PKG))
  const [labelForm, setLabelForm] = useState(EMPTY_LABEL)
  const [pkgForm, setPkgForm] = useState(EMPTY_PKG)
  const [showLabelForm, setShowLabelForm] = useState(false)
  const [showPkgForm, setShowPkgForm] = useState(false)

  const saveLabels = arr => { save(LS_LABELS, arr); setLabels(arr) }
  const savePkgs = arr => { save(LS_PKG, arr); setPkgs(arr) }
  const LF = (k,v) => setLabelForm(p=>({...p,[k]:v}))
  const PF = (k,v) => setPkgForm(p=>({...p,[k]:v}))

  const addLabel = () => {
    if (!labelForm.partNo || !labelForm.name) return alert('부품번호와 라벨명은 필수입니다')
    saveLabels([{id:Date.now(), ...labelForm, createdAt:new Date().toISOString()}, ...labels])
    setLabelForm(EMPTY_LABEL); setShowLabelForm(false)
  }
  const addPkg = () => {
    if (!pkgForm.code || !pkgForm.name) return alert('코드와 포장재명은 필수입니다')
    savePkgs([{id:Date.now(), ...pkgForm, createdAt:new Date().toISOString()}, ...pkgs])
    setPkgForm(EMPTY_PKG); setShowPkgForm(false)
  }

  const statusBadge = s => {
    const m = {draft:'bg-gray-100 text-gray-600', approved:'bg-green-100 text-green-700', obsolete:'bg-red-100 text-red-600', active:'bg-blue-100 text-blue-700', inactive:'bg-gray-100 text-gray-500'}
    return m[s] || 'bg-gray-100 text-gray-600'
  }

  const handlePrintLabel = rec => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>라벨 규격서</title><style>body{font-family:sans-serif;margin:40px}h2{text-align:center}table{width:100%;border-collapse:collapse}td,th{border:1px solid #333;padding:8px}th{background:#f0f0f0;width:140px}</style></head><body><h2>라벨 규격서</h2><table><tr><th>부품번호</th><td>${rec.partNo}</td><th>라벨명</th><td>${rec.name}</td></tr><tr><th>버전</th><td>${rec.version||'-'}</td><th>상태</th><td>${rec.status}</td></tr><tr><th>재질</th><td>${rec.material||'-'}</td><th>크기</th><td>${rec.size||'-'}</td></tr><tr><th>승인자</th><td>${rec.approvedBy||'-'}</td><th>분류</th><td>${rec.category||'-'}</td></tr><tr><th>비고</th><td colspan="3">${rec.notes||'-'}</td></tr></table><script>window.print();</script></body></html>`
    const w = window.open('','_blank','width=800,height=600')
    if (!w) { alert('팝업이 차단되었습니다'); return }
    w.document.write(html); w.document.close()
  }

  return (
    <AppLayout>
      <HubBanner
        title="라벨·포장재 관리"
        subtitle="ISO 13485 §7.5.1 / §4.2.4"
        description="의료기기 라벨 설계·승인 및 포장재 관리. DMR 연동을 통해 최신 규격을 유지합니다."
        icon={Tag}
        color="purple"
      />
      <div className="flex gap-1 px-4 border-b bg-white">
        {LABEL_TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab===tab.key ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Icon size={15}/>{tab.label}
            </button>
          )
        })}
      </div>

      <div className="p-4">

        {activeTab === 'label' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-700">라벨 목록 ({labels.length})</h2>
              <button onClick={()=>setShowLabelForm(p=>!p)} className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">+ 라벨 등록</button>
            </div>
            {showLabelForm && (
              <div className="bg-white border rounded-lg p-4 space-y-3 shadow-sm">
                <h3 className="font-semibold text-gray-700">신규 라벨 등록</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">부품번호 *</label><input className="w-full border rounded px-2 py-1 text-sm" value={labelForm.partNo} onChange={e=>LF('partNo',e.target.value)} placeholder="P-LBL-001"/></div>
                  <div><label className="block text-xs text-gray-500 mb-1">라벨명 *</label><input className="w-full border rounded px-2 py-1 text-sm" value={labelForm.name} onChange={e=>LF('name',e.target.value)} placeholder="제품 라벨 v1"/></div>
                  <div><label className="block text-xs text-gray-500 mb-1">버전</label><input className="w-full border rounded px-2 py-1 text-sm" value={labelForm.version} onChange={e=>LF('version',e.target.value)} placeholder="1.0"/></div>
                  <div><label className="block text-xs text-gray-500 mb-1">분류</label><input className="w-full border rounded px-2 py-1 text-sm" value={labelForm.category} onChange={e=>LF('category',e.target.value)} placeholder="제품라벨/포장라벨/UDI라벨"/></div>
                  <div><label className="block text-xs text-gray-500 mb-1">재질</label><input className="w-full border rounded px-2 py-1 text-sm" value={labelForm.material} onChange={e=>LF('material',e.target.value)} placeholder="폴리에스터"/></div>
                  <div><label className="block text-xs text-gray-500 mb-1">크기</label><input className="w-full border rounded px-2 py-1 text-sm" value={labelForm.size} onChange={e=>LF('size',e.target.value)} placeholder="50x30mm"/></div>
                  <div><label className="block text-xs text-gray-500 mb-1">상태</label>
                    <select className="w-full border rounded px-2 py-1 text-sm" value={labelForm.status} onChange={e=>LF('status',e.target.value)}>
                      <option value="draft">초안</option><option value="approved">승인</option><option value="obsolete">폐기</option>
                    </select></div>
                  <div><label className="block text-xs text-gray-500 mb-1">승인자</label><input className="w-full border rounded px-2 py-1 text-sm" value={labelForm.approvedBy} onChange={e=>LF('approvedBy',e.target.value)}/></div>
                  <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">비고</label><textarea className="w-full border rounded px-2 py-1 text-sm" rows={2} value={labelForm.notes} onChange={e=>LF('notes',e.target.value)}/></div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={()=>setShowLabelForm(false)} className="px-3 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-50">취소</button>
                  <button onClick={addLabel} className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">저장</button>
                </div>
              </div>
            )}
            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr><th className="px-3 py-2 text-left">부품번호</th><th className="px-3 py-2 text-left">라벨명</th><th className="px-3 py-2 text-left">버전</th><th className="px-3 py-2 text-left">분류</th><th className="px-3 py-2 text-center">상태</th><th className="px-3 py-2 text-left">승인자</th><th className="px-3 py-2 text-center">작업</th></tr>
                </thead>
                <tbody>
                  {labels.length===0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">등록된 라벨이 없습니다</td></tr>}
                  {labels.map(r=>(
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs">{r.partNo}</td>
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2">{r.version||'-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{r.category||'-'}</td>
                      <td className="px-3 py-2 text-center"><span className={`px-2 py-0.5 rounded text-xs ${statusBadge(r.status)}`}>{r.status}</span></td>
                      <td className="px-3 py-2 text-xs">{r.approvedBy||'-'}</td>
                      <td className="px-3 py-2 text-center space-x-2">
                        <button onClick={()=>handlePrintLabel(r)} className="text-purple-500 hover:text-purple-700 text-xs">출력</button>
                        <button onClick={()=>saveLabels(labels.filter(x=>x.id!==r.id))} className="text-red-400 hover:text-red-600 text-xs">삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'packaging' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-700">포장재 목록 ({pkgs.length})</h2>
              <button onClick={()=>setShowPkgForm(p=>!p)} className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">+ 포장재 등록</button>
            </div>
            {showPkgForm && (
              <div className="bg-white border rounded-lg p-4 space-y-3 shadow-sm">
                <h3 className="font-semibold text-gray-700">신규 포장재 등록</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">코드 *</label><input className="w-full border rounded px-2 py-1 text-sm" value={pkgForm.code} onChange={e=>PF('code',e.target.value)} placeholder="PKG-001"/></div>
                  <div><label className="block text-xs text-gray-500 mb-1">포장재명 *</label><input className="w-full border rounded px-2 py-1 text-sm" value={pkgForm.name} onChange={e=>PF('name',e.target.value)} placeholder="외포장 박스"/></div>
                  <div><label className="block text-xs text-gray-500 mb-1">유형</label>
                    <select className="w-full border rounded px-2 py-1 text-sm" value={pkgForm.type} onChange={e=>PF('type',e.target.value)}>
                      <option value="">선택</option><option value="box">박스</option><option value="blister">블리스터</option><option value="pouch">파우치</option><option value="tray">트레이</option><option value="other">기타</option>
                    </select></div>
                  <div><label className="block text-xs text-gray-500 mb-1">공급업체</label><input className="w-full border rounded px-2 py-1 text-sm" value={pkgForm.supplier} onChange={e=>PF('supplier',e.target.value)}/></div>
                  <div><label className="block text-xs text-gray-500 mb-1">단위</label><input className="w-full border rounded px-2 py-1 text-sm" value={pkgForm.unit} onChange={e=>PF('unit',e.target.value)} placeholder="개"/></div>
                  <div><label className="block text-xs text-gray-500 mb-1">상태</label>
                    <select className="w-full border rounded px-2 py-1 text-sm" value={pkgForm.status} onChange={e=>PF('status',e.target.value)}>
                      <option value="active">사용중</option><option value="inactive">미사용</option>
                    </select></div>
                  <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">비고</label><textarea className="w-full border rounded px-2 py-1 text-sm" rows={2} value={pkgForm.notes} onChange={e=>PF('notes',e.target.value)}/></div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={()=>setShowPkgForm(false)} className="px-3 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-50">취소</button>
                  <button onClick={addPkg} className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">저장</button>
                </div>
              </div>
            )}
            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr><th className="px-3 py-2 text-left">코드</th><th className="px-3 py-2 text-left">포장재명</th><th className="px-3 py-2 text-left">유형</th><th className="px-3 py-2 text-left">공급업체</th><th className="px-3 py-2 text-center">상태</th><th className="px-3 py-2 text-center">작업</th></tr>
                </thead>
                <tbody>
                  {pkgs.length===0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">등록된 포장재가 없습니다</td></tr>}
                  {pkgs.map(r=>(
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{r.type||'-'}</td>
                      <td className="px-3 py-2 text-xs">{r.supplier||'-'}</td>
                      <td className="px-3 py-2 text-center"><span className={`px-2 py-0.5 rounded text-xs ${statusBadge(r.status)}`}>{r.status}</span></td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={()=>savePkgs(pkgs.filter(x=>x.id!==r.id))} className="text-red-400 hover:text-red-600 text-xs">삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'dmr' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">DMR 연동 현황</h3>
              <p className="text-sm text-blue-700">라벨·포장재 정보는 의료기기 파일(DMR)의 포장 사양과 연동됩니다. 아래에서 현재 등록된 라벨·포장재를 확인하고, DMR에 반영할 항목을 관리하세요.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-3">승인된 라벨</h4>
                {labels.filter(l=>l.status==='approved').length===0
                  ? <p className="text-sm text-gray-400">승인된 라벨 없음</p>
                  : labels.filter(l=>l.status==='approved').map(l=>(
                    <div key={l.id} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                      <div><span className="font-mono text-xs text-gray-500">{l.partNo}</span> <span className="font-medium">{l.name}</span></div>
                      <span className="text-xs text-gray-400">v{l.version||'?'}</span>
                    </div>
                  ))}
              </div>
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-3">사용중인 포장재</h4>
                {pkgs.filter(p=>p.status==='active').length===0
                  ? <p className="text-sm text-gray-400">사용중인 포장재 없음</p>
                  : pkgs.filter(p=>p.status==='active').map(p=>(
                    <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                      <div><span className="font-mono text-xs text-gray-500">{p.code}</span> <span className="font-medium">{p.name}</span></div>
                      <span className="text-xs text-gray-400">{p.type||'-'}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-2">DMR 등록 안내</h4>
              <p className="text-sm text-gray-600">승인된 라벨과 포장재를 <a href="/device-master-record" className="text-blue-600 underline">의료기기 파일(DMR)</a>에서 포장 사양 탭에 직접 등록하여 DMR 문서를 완성하세요.</p>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  )
}
