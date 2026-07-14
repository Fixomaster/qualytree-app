import React from 'react'
import { Trash2, GitBranch } from 'lucide-react'

// 레벨(깊이)별 박스 색상 — 최상위(진한 남색) → 부서(중간 파랑) → 하위 직책(회색)
const LEVEL_STYLES = [
  { bg: '#24507c', color: '#ffffff', fontWeight: 700 },
  { bg: '#4f86bd', color: '#ffffff', fontWeight: 600 },
  { bg: '#c7ccd3', color: '#3a4552', fontWeight: 500 },
  { bg: '#dde1e6', color: '#3a4552', fontWeight: 500 },
]
const levelStyle = (depth) => LEVEL_STYLES[Math.min(depth, LEVEL_STYLES.length - 1)]

// 조직도 박스·커넥터 다이어그램.
// departments: [{id, name, parentId, independent}] 형태의 평면 목록.
//   - independent: true 인 노드는 일반 하위조직(보고라인)이 아니라 "곁다리"(내부심사팀처럼
//     독립성을 갖는 직속 보고)로 취급되어, 형제들과 같은 줄에 놓이지 않고 부모 박스 옆에
//     점선으로 따로 붙어 표시된다 (실선=일반 보고라인, 점선=독립/기능 보고).
// onDelete: 넘기면 박스에 삭제 버튼이 붙는다(편집용).
// onToggleIndependent: 넘기면 박스에 "곁다리로/라인으로" 전환 버튼이 붙는다(편집용, 루트 제외).
export default function OrgChartDiagram({ departments, onDelete, onToggleIndependent }) {
  const nodes = departments || []
  const roots = nodes.filter((d) => !d.parentId)
  const childrenOf = (pid) => nodes.filter((d) => d.parentId === pid)
  const hasIndependent = nodes.some((d) => d.independent && d.parentId)

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
      <div key={d.id} className="orgchart-node" style={staffKids.length ? { marginLeft: 8 + staffKids.length * 0 + 108 } : undefined}>
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
    <div className="orgchart-wrap">
      <style>{ORGCHART_CSS}</style>
      {roots.length === 0 ? (
        <div className="orgchart-empty">등록된 조직이 없습니다.</div>
      ) : (
        <ul className="orgchart-tree">{roots.map((r) => renderNode(r, 0))}</ul>
      )}
      {hasIndependent && (
        <div className="orgchart-legend">
          <span className="orgchart-legend-item"><i className="orgchart-legend-line orgchart-legend-line-solid" />일반 보고라인</span>
          <span className="orgchart-legend-item"><i className="orgchart-legend-line orgchart-legend-line-dashed" />독립/곁다리 보고 (예: 내부심사팀 — 하위 조직의 지휘를 받지 않고 상위에 직접 보고)</span>
        </div>
      )}
    </div>
  )
}

const ORGCHART_CSS = `
.orgchart-wrap{overflow-x:auto;padding:10px 6px}
.orgchart-empty{font-size:12px;color:#94a3b8;text-align:center;padding:20px 0}
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
