import React, { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { Trash2, GitBranch, Minus, Plus, Maximize2 } from 'lucide-react'
import { loadHtml2Canvas } from '../lib/orgChartImage'

// 레벨(깊이)별 박스 색상 — 최상위(진한 남색) → 부서(중간 파랑) → 하위 직책(회색)
const LEVEL_STYLES = [
  { bg: '#24507c', color: '#ffffff', fontWeight: 700 },
  { bg: '#4f86bd', color: '#ffffff', fontWeight: 600 },
  { bg: '#c7ccd3', color: '#3a4552', fontWeight: 500 },
  { bg: '#dde1e6', color: '#3a4552', fontWeight: 500 },
]
const levelStyle = (depth) => LEVEL_STYLES[Math.min(depth, LEVEL_STYLES.length - 1)]
const MIN_SCALE = 0.28
const MAX_SCALE = 1.5

// 조직도 박스·커넥터 다이어그램.
// departments: [{id, name, parentId, independent}] 형태의 평면 목록.
//   - independent: true 인 노드는 일반 하위조직(보고라인)이 아니라 "곁다리"(내부심사팀처럼
//     독립성을 갖는 직속 보고)로 취급되어, 형제들과 같은 줄에 놓이지 않고 부모 박스 옆에
//     점선으로 따로 붙어 표시된다 (실선=일반 보고라인, 점선=독립/기능 보고).
// onDelete: 넘기면 박스에 삭제 버튼이 붙는다(편집용).
// onToggleIndependent: 넘기면 박스에 "곁다리로/라인으로" 전환 버튼이 붙는다(편집용, 루트 제외).
//
// 계속 추가하다 보면 트리가 화면 너비를 넘어서기 쉬우므로, 컨테이너 너비에 맞춰 자동으로
// 축소(auto-fit)해 전체 조직도가 항상 한눈에 들어오게 하고, +/-/전체맞춤 버튼으로 수동 확대·축소도
// 지원한다.
const OrgChartDiagram = forwardRef(function OrgChartDiagram({ departments, onDelete, onToggleIndependent }, ref) {
  const nodes = departments || []
  const roots = nodes.filter((d) => !d.parentId)
  const childrenOf = (pid) => nodes.filter((d) => d.parentId === pid)
  const hasIndependent = nodes.some((d) => d.independent && d.parentId)

  const wrapRef = useRef(null)
  const treeRef = useRef(null)
  useImperativeHandle(ref, () => ({
    // 화면에 보이는 확대/축소 상태와 무관하게, 원본 해상도의 조직도를 PNG data URL로 캡처한다.
    async captureDataUrl() {
      if (!treeRef.current) return null
      const html2canvas = await loadHtml2Canvas()
      const canvas = await html2canvas(treeRef.current, { backgroundColor: '#ffffff', scale: 2 })
      return canvas.toDataURL('image/png')
    },
  }))
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [autoFit, setAutoFit] = useState(1)
  const [manualZoom, setManualZoom] = useState(null) // null = 자동 맞춤 사용
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, manualZoom != null ? manualZoom : autoFit))

  useLayoutEffect(() => {
    const recompute = () => {
      if (!wrapRef.current || !treeRef.current) return
      const containerW = wrapRef.current.clientWidth
      const w = treeRef.current.scrollWidth
      const h = treeRef.current.scrollHeight
      setNatural({ w, h })
      // '전체 맞춤'이 좁은(트리가 큰) 경우에만 축소하고, 작은 조직도(신규 회사 등)는 항상 100%에
      // 머물러 컨테이너의 남는 공간을 활용하지 못하던 문제 — 폭에 맞춰 확대도 하도록 양방향 스케일링.
      setAutoFit(containerW > 0 && w > 0 ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, containerW / w)) : 1)
    }
    recompute()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(recompute) : null
    if (ro && wrapRef.current) ro.observe(wrapRef.current)
    window.addEventListener('resize', recompute)
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', recompute) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments])

  const zoomOut = () => setManualZoom(Math.max(MIN_SCALE, Number((scale - 0.1).toFixed(2))))
  const zoomIn = () => setManualZoom(Math.min(MAX_SCALE, Number((scale + 0.1).toFixed(2))))
  const fitToScreen = () => setManualZoom(null)

  const box = (d, depth, variant) => {
    const st = levelStyle(depth)
    return (
      <div className={variant === 'staff' ? 'orgchart-box orgchart-box-staff' : 'orgchart-box'} style={{ background: st.bg, color: st.color, fontWeight: st.fontWeight }}>
        <span>{d.name}</span>
        {onToggleIndependent && d.parentId && (
          <button onClick={() => onToggleIndependent(d.id)} className="orgchart-toggle" type="button"
            title={d.independent ? '일반 보고라인으로 전환' : '곁다리(독립 보고)로 전환'}>
            <GitBranch size={12} />
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(d.id)} className="orgchart-del" title="삭제" type="button">
            <Trash2 size={12} />
          </button>
        )}
      </div>
    )
  }

  const renderNode = (d, depth) => {
    const kids = childrenOf(d.id)
    const staffKids = kids.filter((k) => k.independent)
    const lineKids = kids.filter((k) => !k.independent)
    return (
      <div key={d.id} className="orgchart-node" style={staffKids.length ? { marginLeft: 116 } : undefined}>
        <div className="orgchart-box-wrap">
          {box(d, depth)}
          {staffKids.length > 0 && (
            <div className="orgchart-staff">
              <div className="orgchart-staff-list">
                {staffKids.map((sk) => (
                  <div key={sk.id} className="orgchart-staff-item">
                    {box(sk, depth + 1, 'staff')}
                  </div>
                ))}
              </div>
              <div className="orgchart-staff-line" />
            </div>
          )}
        </div>
        {lineKids.length > 0 && <ul>{lineKids.map((cc) => renderNode(cc, depth + 1))}</ul>}
      </div>
    )
  }

  return (
    <div className="orgchart-wrap" ref={wrapRef}>
      <style>{ORGCHART_CSS}</style>
      {roots.length > 0 && (
        <div className="orgchart-zoombar">
          <button type="button" onClick={zoomOut} title="축소"><Minus size={13} /></button>
          <span className="orgchart-zoom-pct">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={zoomIn} title="확대"><Plus size={13} /></button>
          <button type="button" onClick={fitToScreen} title="전체 화면에 맞추기" className="orgchart-fit"><Maximize2 size={12} /> 전체 맞춤</button>
        </div>
      )}
      {roots.length === 0 ? (
        <div className="orgchart-empty">등록된 조직이 없습니다.</div>
      ) : (
        <div className="orgchart-scale-outer" style={{ width: natural.w ? natural.w * scale : undefined, height: natural.h ? natural.h * scale : undefined }}>
          <div className="orgchart-scale-inner" style={{ transform: `scale(${scale})`, width: natural.w || undefined }}>
            <ul className="orgchart-tree" ref={treeRef}>{roots.map((r) => renderNode(r, 0))}</ul>
          </div>
        </div>
      )}
      {hasIndependent && (
        <div className="orgchart-legend">
          <span className="orgchart-legend-item"><i className="orgchart-legend-line orgchart-legend-line-solid" />일반 보고라인</span>
          <span className="orgchart-legend-item"><i className="orgchart-legend-line orgchart-legend-line-dashed" />독립/곁다리 보고 (예: 내부심사팀 — 하위 조직의 지휘를 받지 않고 상위에 직접 보고)</span>
        </div>
      )}
    </div>
  )
})

export default OrgChartDiagram

const ORGCHART_CSS = `
.orgchart-wrap{padding:10px 6px;overflow-x:auto}
.orgchart-empty{font-size:12px;color:#94a3b8;text-align:center;padding:20px 0}
.orgchart-zoombar{display:flex;align-items:center;gap:6px;justify-content:flex-end;margin-bottom:6px}
.orgchart-zoombar button{display:inline-flex;align-items:center;gap:4px;justify-content:center;width:26px;height:26px;border-radius:7px;border:1px solid #e2e6ea;background:#fff;color:#5a6672;cursor:pointer}
.orgchart-zoombar button:hover{background:#f4f6f8}
.orgchart-zoombar .orgchart-fit{width:auto;padding:0 9px;font-size:11px}
.orgchart-zoom-pct{font-size:11px;color:#8a94a3;width:34px;text-align:center;font-variant-numeric:tabular-nums}
.orgchart-scale-outer{overflow:hidden;margin:0 auto}
.orgchart-scale-inner{transform-origin:top left}
.orgchart-tree,.orgchart-tree ul{display:flex;list-style:none;margin:0;padding:0}
.orgchart-tree ul{padding-top:28px}
.orgchart-tree .orgchart-node{display:flex;flex-direction:column;align-items:center;padding:28px 14px 0 14px;position:relative}
.orgchart-tree .orgchart-node::before,.orgchart-tree .orgchart-node::after{content:'';position:absolute;top:0;right:50%;border-top:2px solid #c7cdd4;width:50%;height:28px}
.orgchart-tree .orgchart-node::after{right:auto;left:50%;border-left:2px solid #c7cdd4}
.orgchart-tree .orgchart-node:only-child::before,.orgchart-tree .orgchart-node:only-child::after{display:none}
.orgchart-tree .orgchart-node:only-child{padding-top:0}
.orgchart-tree .orgchart-node:first-child::before{border:none}
.orgchart-tree .orgchart-node:last-child::after{border:none}
.orgchart-tree .orgchart-node:last-child::before{border-right:2px solid #c7cdd4;border-radius:0 8px 0 0}
.orgchart-tree .orgchart-node:first-child::after{border-radius:8px 0 0 0}
.orgchart-tree>.orgchart-node{padding-top:0}
.orgchart-tree>.orgchart-node::before,.orgchart-tree>.orgchart-node::after{display:none}
.orgchart-tree ul::before{content:'';position:absolute;top:0;left:50%;border-left:2px solid #c7cdd4;width:0;height:28px}
.orgchart-box-wrap{position:relative;display:inline-flex;align-items:center}
.orgchart-box{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:10px;font-size:13px;white-space:nowrap;box-shadow:0 1px 2px rgba(15,26,20,0.14);min-width:96px;justify-content:center;text-align:center}
.orgchart-box-staff{padding:7px 12px;font-size:12px;min-width:0;border:2px dashed rgba(255,255,255,.6)}
.orgchart-del{opacity:.55;display:inline-flex}
.orgchart-del:hover{opacity:1;color:#fca5a5}
.orgchart-toggle{opacity:.55;display:inline-flex}
.orgchart-toggle:hover{opacity:1}
.orgchart-staff{position:absolute;top:50%;right:100%;transform:translateY(-50%);display:flex;align-items:center;white-space:nowrap}
.orgchart-staff-list{display:flex;flex-direction:column;gap:6px;margin-right:8px}
.orgchart-staff-line{width:16px;height:0;border-top:2px dashed #8a94a3;flex-shrink:0}
.orgchart-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:14px;padding-top:10px;border-top:1px solid #eef1f4;font-size:11px;color:#6b7684}
.orgchart-legend-item{display:inline-flex;align-items:center;gap:6px}
.orgchart-legend-line{display:inline-block;width:18px;height:0;border-top:2px solid #94a3b8}
.orgchart-legend-line-dashed{border-top-style:dashed}
`
