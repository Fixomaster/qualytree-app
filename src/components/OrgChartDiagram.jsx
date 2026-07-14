import React from 'react'
import { Trash2 } from 'lucide-react'

// 레벨(깊이)별 박스 색상 — 최상위(진한 남색) → 부서(중간 파랑) → 하위 직책(회색)
const LEVEL_STYLES = [
  { bg: '#24507c', color: '#ffffff', fontWeight: 700 },
  { bg: '#4f86bd', color: '#ffffff', fontWeight: 600 },
  { bg: '#c7ccd3', color: '#3a4552', fontWeight: 500 },
  { bg: '#dde1e6', color: '#3a4552', fontWeight: 500 },
]
const levelStyle = (depth) => LEVEL_STYLES[Math.min(depth, LEVEL_STYLES.length - 1)]

// 조직도 박스·커넥터 다이어그램 (부서/직책을 진한색→연한색 계층으로 시각화).
// departments: [{id, name, parentId}] 형태의 평면 목록. onDelete 를 넘기면 박스에 삭제 버튼이 붙는다(편집용).
export default function OrgChartDiagram({ departments, onDelete }) {
  const nodes = departments || []
  const roots = nodes.filter((d) => !d.parentId)
  const childrenOf = (pid) => nodes.filter((d) => d.parentId === pid)

  const renderNode = (d, depth) => {
    const st = levelStyle(depth)
    const kids = childrenOf(d.id)
    return (
      <div key={d.id} className="orgchart-node">
        <div className="orgchart-box" style={{ background: st.bg, color: st.color, fontWeight: st.fontWeight }}>
          <span>{d.name}</span>
          {onDelete && (
            <button onClick={() => onDelete(d.id)} className="orgchart-del" title="삭제" type="button">
              <Trash2 size={12} />
            </button>
          )}
        </div>
        {kids.length > 0 && <ul>{kids.map((cc) => renderNode(cc, depth + 1))}</ul>}
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
.orgchart-box{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:10px;font-size:13px;white-space:nowrap;box-shadow:0 1px 2px rgba(15,26,20,0.14);min-width:96px;justify-content:center;text-align:center}
.orgchart-del{opacity:.55;display:inline-flex}
.orgchart-del:hover{opacity:1;color:#fca5a5}
`
