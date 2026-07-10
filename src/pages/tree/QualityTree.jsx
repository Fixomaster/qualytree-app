import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GitBranch,
  Package,
  Layers,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  FlaskConical,
  Workflow,
  ChevronRight,
  Search,
  ArrowLeftRight,
  ArrowDown,
  ArrowUp,
  Activity,
  Lock,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import {
  ENTITY_TYPES,
  eid,
  parseEid,
  findEntity,
  getEntityDisplayName,
  findAllByType,
} from '../../lib/entityRegistry'
import {
  getForwardLinks,
  getBackwardLinks,
  getKindLabel,
  dumpAll,
} from '../../lib/linkage'
import { onboarding, getProductProcesses, productKeyOf } from '../../lib/onboardingState'
import { operations, PROCESS_STATUS } from '../../lib/operationsState'
import { ncr, NCR_STATUS } from '../../lib/ncrState'
import { capa } from '../../lib/capaState'
import { quarantine, QUARANTINE_STATUS } from '../../lib/quarantine'
import { getAllRecords as getCcrRecords } from '../../lib/changeControl'

/**
 * Quality Tree — 인터랙티브 양방향 연결망 시각화
 *
 * 구조:
 *   회사
 *    └─ 제품
 *        └─ 공정 블록
 *            └─ 검사 항목
 *        └─ 작업 지시
 *            └─ 단계
 *                └─ NCR ─ CAPA ─ 격리
 */
export default function QualityTree() {
  const nav = useNavigate()
  const user = auth.current()

  const [selectedEid, setSelectedEid] = useState(null)
  const [expanded, setExpanded] = useState(new Set(['company:root']))
  const [search, setSearch] = useState('')

  // 트리 데이터 빌드
  const tree = useMemo(() => buildTree(), [])

  const ccrCount = getCcrRecords().length
  const ncrOpen = ncr.getOpenCount()
  const quarantineActive = quarantine.getActiveCount()

  const toggleExpand = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const expandAll = () => {
    const all = collectAllKeys(tree)
    setExpanded(new Set(all))
  }

  const collapseAll = () => {
    setExpanded(new Set(['company:root']))
  }

  return (
    <AppLayout
      user={user}
      title="Quality Tree"
      subtitle="회사 품질 시스템 양방향 연결망"
    >
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <span
              className="font-mono text-[10px] tracking-[0.18em] uppercase"
              style={{ color: 'var(--moss)' }}
            >
              TREE-001 · QUALITY TREE
            </span>
            <div
              className="font-display text-[26px] mt-1 leading-tight"
              style={{ color: 'var(--ink)', fontWeight: 500 }}
            >
              품질은 나무처럼 자랍니다
            </div>
            <div
              className="text-[12.5px] mt-0.5"
              style={{ color: 'var(--ink-mute)' }}
            >
              제품 · 공정 · 검사 항목 · 작업 지시 · NCR · CAPA · 격리 — 양방향
              연결망 (Phase A SSoT)
            </div>
          </div>
        </div>

        {/* 시스템 메타 */}
        <div className="grid md:grid-cols-4 gap-3 mb-5">
          <MetaCard
            icon={GitBranch}
            label="누적 변경 (CCR)"
            value={ccrCount}
            tone="moss"
          />
          <MetaCard
            icon={AlertTriangle}
            label="진행 중 NCR"
            value={ncrOpen}
            tone="rust"
          />
          <MetaCard
            icon={Lock}
            label="격리 중 항목"
            value={quarantineActive}
            tone="amber"
          />
          <MetaCard
            icon={Activity}
            label="총 노드 수"
            value={tree.totalNodes}
            tone="sky"
          />
        </div>

        {/* 메인 — 트리 + 상세 */}
        <div className="grid lg:grid-cols-12 gap-4">
          {/* 좌: 트리 */}
          <div className="lg:col-span-7">
            <div className="card-base p-4">
              {/* 검색·도구 */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md"
                  style={{ background: 'var(--bg-soft)' }}
                >
                  <Search size={13} style={{ color: 'var(--ink-faint)' }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="노드 검색…"
                    className="bg-transparent outline-none text-[12.5px] flex-1"
                  />
                </div>
                <button
                  onClick={expandAll}
                  className="text-[11.5px] px-2 py-1 rounded-md transition"
                  style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}
                >
                  모두 펼침
                </button>
                <button
                  onClick={collapseAll}
                  className="text-[11.5px] px-2 py-1 rounded-md transition"
                  style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}
                >
                  접기
                </button>
              </div>

              {/* 트리 본체 */}
              <div className="overflow-y-auto" style={{ maxHeight: 700 }}>
                {tree.totalNodes === 0 ? (
                  <EmptyTree />
                ) : (
                  <TreeNode
                    node={tree.root}
                    depth={0}
                    expanded={expanded}
                    onToggle={toggleExpand}
                    selectedEid={selectedEid}
                    onSelect={setSelectedEid}
                    search={search.trim().toLowerCase()}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 우: 상세 */}
          <div className="lg:col-span-5">
            {selectedEid ? (
              <NodeDetail
                key={selectedEid}
                eidStr={selectedEid}
                onJump={(nextEid) => setSelectedEid(nextEid)}
                onNavigate={(path) => nav(path)}
              />
            ) : (
              <div
                className="card-base p-10 text-center text-[13px]"
                style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}
              >
                <GitBranch
                  size={32}
                  style={{ color: 'var(--ink-faint)', margin: '0 auto' }}
                  strokeWidth={1.4}
                />
                <div className="mt-3">노드를 선택하세요</div>
                <div
                  className="text-[11.5px] mt-1"
                  style={{ color: 'var(--ink-faint)' }}
                >
                  좌측 트리에서 클릭하면 영향 분석·연결망이 표시됩니다.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

/* ================================================================
   Tree 빌더 — entityRegistry로부터 계층 구조 생성
   ================================================================ */
function buildTree() {
  // 회사 (싱글톤 — 온보딩 데이터에서)
  const ob = onboarding.load() || {}
  const companyName = ob.company?.name || '회사 (온보딩 미완)'

  let totalNodes = 1 // 루트

  // 제품 — 다중 제품(products) 우선, 레거시 단일 product 폴백
  const products =
    Array.isArray(ob.products) && ob.products.length
      ? ob.products
      : ob.product && ob.product.name
      ? [ob.product]
      : []

  // 공정 블록 — 제품별 공정 정의 + 검사 항목 자식을 노드로 빌드
  const buildProcessNodes = (processList) =>
    (processList || []).map((proc, idx) => {
      totalNodes++
      const blockEid = eid(ENTITY_TYPES.PROCESS_BLOCK, proc.blockId)
      const block = findEntity(blockEid)

      // 이 공정 블록의 검사 항목들
      const templates = (() => {
        try {
          const all = findAllByType(ENTITY_TYPES.INSPECTION_TEMPLATE)
          return all.filter((t) => t._blockId === proc.blockId)
        } catch {
          return []
        }
      })()

      const templateNodes = templates.map((t) => {
        totalNodes++
        return {
          key: `tpl:${t.id}`,
          eid: eid(ENTITY_TYPES.INSPECTION_TEMPLATE, t.id),
          label: t.label,
          sub: `${t.specMin || '—'}~${t.specMax || '—'}${t.unit ? ' ' + t.unit : ''}`,
          icon: FlaskConical,
          tone:
            t.criticality === 'Critical'
              ? 'rust'
              : t.criticality === 'Major'
              ? 'amber'
              : 'ink-mute',
          children: [],
        }
      })

      return {
        key: `proc:${proc.id || proc.blockId + ':' + idx}`,
        eid: blockEid,
        label: proc.customName || block?.name || proc.blockId,
        sub: '공정 블록',
        icon: Workflow,
        tone: 'sky',
        children: templateNodes,
      }
    })

  const productNodes = products.map((p, i) => {
    totalNodes++
    const productKey = productKeyOf(p)
    const productProcesses = getProductProcesses(ob, productKey)
    const processNodes = buildProcessNodes(productProcesses)
    return {
      key: `product:${p.id || p.modelNumber || p.name || i}`,
      eid: eid(ENTITY_TYPES.PRODUCT, p.id || p.modelNumber || 'main'),
      label: p.name || '제품',
      sub: p.modelNumber || p.intendedUse || '',
      icon: Package,
      tone: 'moss',
      children:
        processNodes.length > 0
          ? [
              {
                key: `group:processes:${productKey}`,
                eid: null,
                label: `공정 / 검사 항목 (${processNodes.length})`,
                sub: 'Processes & Inspection',
                icon: Workflow,
                tone: 'sky',
                children: processNodes,
              },
            ]
          : [],
    }
  })

  // 작업 지시 → 단계 → NCR/격리
  const wos = operations.load().workOrders || []
  const woNodes = wos.map((wo) => {
    totalNodes++
    const woEid = eid(ENTITY_TYPES.WORK_ORDER, wo.id)

    const stageNodes = (wo.stages || []).map((stage) => {
      totalNodes++

      // 이 단계와 연결된 NCR 찾기 (linkage 사용)
      const stageEid = eid(ENTITY_TYPES.STAGE, `${wo.id}:${stage.stageId}`)
      const backLinks = getBackwardLinks(stageEid)
      const ncrEids = backLinks
        .filter((l) => l.kind === 'raisedFromStage')
        .map((l) => l.from)

      const ncrNodes = ncrEids
        .map((nEid) => {
          const parsed = parseEid(nEid)
          const n = parsed ? ncr.findById(parsed.id) : null
          if (!n) return null
          totalNodes++

          // NCR 연결 — CAPA, 격리
          const linked = []
          if (n.capaId) {
            const c = capa.findById(n.capaId)
            if (c) {
              totalNodes++
              linked.push({
                key: `capa:${c.id}`,
                eid: eid(ENTITY_TYPES.CAPA, c.id),
                label: c.id,
                sub: c.title,
                icon: ShieldCheck,
                tone: 'moss',
                children: [],
              })
            }
          }
          const qItems = quarantine.forNcr(n.id)
          qItems.forEach((q) => {
            totalNodes++
            linked.push({
              key: `q:${q.id}`,
              eid: eid('quarantineItem', q.id),
              label: q.id,
              sub: `${q.productName} · ${q.quantity}개`,
              icon: Lock,
              tone:
                q.status === QUARANTINE_STATUS.RELEASED
                  ? 'leaf'
                  : 'amber',
              children: [],
            })
          })

          return {
            key: `ncr:${n.id}`,
            eid: nEid,
            label: n.id,
            sub: `${n.severity} · ${n.title}`,
            icon: AlertTriangle,
            tone:
              n.severity === 'Critical'
                ? 'rust'
                : n.severity === 'Major'
                ? 'amber'
                : 'ink-mute',
            children: linked,
          }
        })
        .filter(Boolean)

      return {
        key: `stage:${stage.stageId}`,
        eid: stageEid,
        label: stage.customName || stage.blockId,
        sub: `Stage ${stage.order} · ${PROCESS_STATUS_KO[stage.status] || stage.status}`,
        icon: Layers,
        tone:
          stage.status === PROCESS_STATUS.COMPLETED
            ? 'leaf'
            : stage.status === PROCESS_STATUS.IN_PROGRESS
            ? 'rust'
            : 'ink-mute',
        children: ncrNodes,
      }
    })

    return {
      key: `wo:${wo.id}`,
      eid: woEid,
      label: wo.id,
      sub: `${wo.productName} · 로트 ${wo.lotNumber}`,
      icon: FileCheck2,
      tone: wo.status === 'completed' ? 'leaf' : 'rust',
      children: stageNodes,
    }
  })

  return {
    totalNodes,
    root: {
      key: 'company:root',
      eid: null,
      label: companyName,
      sub: '회사 / Company',
      icon: GitBranch,
      tone: 'moss',
      children: [
        ...(productNodes.length > 0
          ? [
              {
                key: 'group:products',
                eid: null,
                label: `제품 (${productNodes.length})`,
                sub: 'Products',
                icon: Package,
                tone: 'moss',
                children: productNodes,
              },
            ]
          : []),
        ...(woNodes.length > 0
          ? [
              {
                key: 'group:wos',
                eid: null,
                label: `작업 지시 / 단계 / NCR (${woNodes.length})`,
                sub: 'Operations & Quality',
                icon: FileCheck2,
                tone: 'rust',
                children: woNodes,
              },
            ]
          : []),
      ],
    },
  }
}

const PROCESS_STATUS_KO = {
  locked: '잠김',
  pending: '진입 가능',
  in_progress: '진행 중',
  completed: '완료',
}

function collectAllKeys(tree) {
  const out = []
  const walk = (node) => {
    out.push(node.key)
    ;(node.children || []).forEach(walk)
  }
  walk(tree.root)
  return out
}

/* ================================================================
   TreeNode — 재귀 렌더
   ================================================================ */
function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  selectedEid,
  onSelect,
  search,
}) {
  const hasChildren = (node.children || []).length > 0
  const isExpanded = expanded.has(node.key)
  const isSelected = node.eid && node.eid === selectedEid
  const isMatch = search && node.label.toLowerCase().includes(search)

  const tone = TONE_COLORS[node.tone] || TONE_COLORS.ink

  // 검색어가 있으면 자식에 매치되는 게 있는지 검사 (있으면 자동 펼침)
  const childHasMatch = useMemo(() => {
    if (!search) return false
    const walk = (n) => {
      if (n.label.toLowerCase().includes(search)) return true
      return (n.children || []).some(walk)
    }
    return (node.children || []).some(walk)
  }, [node, search])

  const shouldExpand = isExpanded || (search && childHasMatch)

  // 검색어가 있는데 이 노드/하위에 매치 없으면 숨김
  if (search && !isMatch && !childHasMatch) return null

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 pl-2 pr-3 rounded-md transition cursor-pointer"
        style={{
          background: isSelected ? 'var(--leaf-soft)' : 'transparent',
          marginLeft: depth * 18,
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.background = 'var(--bg-soft)'
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.background = 'transparent'
        }}
        onClick={() => {
          if (hasChildren) onToggle(node.key)
          if (node.eid) onSelect(node.eid)
        }}
      >
        {/* 펼침 화살표 */}
        <span
          className="w-4 h-4 flex items-center justify-center shrink-0"
          style={{ color: 'var(--ink-faint)' }}
        >
          {hasChildren ? (
            shouldExpand ? (
              <ArrowDown size={11} strokeWidth={2} />
            ) : (
              <ChevronRight size={11} strokeWidth={2} />
            )
          ) : null}
        </span>

        {/* 아이콘 */}
        <span
          className="w-5 h-5 rounded flex items-center justify-center shrink-0"
          style={{ background: tone.bg, color: tone.fg }}
        >
          <node.icon size={11} strokeWidth={1.8} />
        </span>

        {/* 라벨 */}
        <span
          className="text-[12.5px] truncate"
          style={{
            color: isMatch ? tone.fg : 'var(--ink)',
            fontWeight: isSelected || isMatch ? 500 : 400,
          }}
        >
          {node.label}
        </span>
        {node.sub && (
          <span
            className="text-[10.5px] truncate"
            style={{ color: 'var(--ink-faint)' }}
          >
            {node.sub}
          </span>
        )}
      </div>

      {/* 자식 */}
      {hasChildren && shouldExpand && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.key}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedEid={selectedEid}
              onSelect={onSelect}
              search={search}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const TONE_COLORS = {
  moss: { bg: 'var(--leaf-soft)', fg: 'var(--moss)' },
  rust: { bg: 'var(--rust-soft)', fg: 'var(--rust)' },
  amber: { bg: 'var(--amber-soft)', fg: 'var(--amber)' },
  sky: { bg: 'var(--sky-soft)', fg: 'var(--sky)' },
  leaf: { bg: 'var(--leaf-soft)', fg: 'var(--moss)' },
  ink: { bg: 'var(--bg-soft)', fg: 'var(--ink)' },
  'ink-mute': { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)' },
}

/* ================================================================
   NodeDetail — 우측 상세 패널 (Forward / Backward 양방향 연결)
   ================================================================ */
function NodeDetail({ eidStr, onJump, onNavigate }) {
  const parsed = parseEid(eidStr)
  const entity = findEntity(eidStr)
  const displayName = getEntityDisplayName(eidStr)

  const forward = getForwardLinks(eidStr)
  const backward = getBackwardLinks(eidStr)

  // 이 엔티티에 영향을 준 CCR 이력
  const ccrs = useMemo(() => {
    return getCcrRecords()
      .filter((r) => r.targetEid === eidStr)
      .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
  }, [eidStr])

  if (!parsed) return null

  const typeKo = TYPE_KO[parsed.type] || parsed.type

  // 화면 점프 액션 (어떤 화면으로 갈지 결정)
  const jumpToScreen = () => {
    if (parsed.type === ENTITY_TYPES.WORK_ORDER) {
      onNavigate(`/operations/${parsed.id}/ebr`)
    } else if (parsed.type === ENTITY_TYPES.STAGE) {
      const woId = parsed.id.split(':')[0]
      onNavigate(`/operations/${woId}/ebr`)
    } else if (parsed.type === ENTITY_TYPES.NCR) {
      onNavigate('/quality')
    } else if (parsed.type === ENTITY_TYPES.CAPA) {
      onNavigate('/quality')
    } else if (parsed.type === 'quarantineItem') {
      onNavigate('/quality')
    }
  }

  const canJump = [
    ENTITY_TYPES.WORK_ORDER,
    ENTITY_TYPES.STAGE,
    ENTITY_TYPES.NCR,
    ENTITY_TYPES.CAPA,
    'quarantineItem',
  ].includes(parsed.type)

  return (
    <div className="card-base p-5 lg:sticky lg:top-4 fade-in" style={{ maxHeight: 800, overflowY: 'auto' }}>
      <div
        className="font-mono text-[10px] tracking-[0.16em] uppercase"
        style={{ color: 'var(--ink-mute)' }}
      >
        {typeKo} · {parsed.id}
      </div>
      <div
        className="font-display text-[20px] mt-1 leading-tight"
        style={{ color: 'var(--ink)', fontWeight: 500 }}
      >
        {displayName}
      </div>

      {!entity && (
        <div
          className="mt-3 rounded-lg p-2.5 text-[12px]"
          style={{
            background: 'var(--rust-soft)',
            color: 'var(--rust)',
          }}
        >
          ⚠ 엔티티가 삭제되었거나 찾을 수 없습니다 (Dangling Reference). 연결망 정리 필요.
        </div>
      )}

      {canJump && entity && (
        <button
          onClick={jumpToScreen}
          className="mt-3 btn-ghost text-[12px]"
        >
          이 엔티티의 화면으로 이동 →
        </button>
      )}

      {/* Backward — 이 노드를 인용하는 곳 */}
      <Section
        icon={ArrowUp}
        title="Backward · 이 항목을 인용하는 곳"
        count={backward.length}
        tone="moss"
      >
        {backward.length === 0 ? (
          <Empty msg="인용처 없음" />
        ) : (
          <ul className="space-y-1">
            {backward.map((l, i) => (
              <LinkRow
                key={i}
                eidStr={l.from}
                kind={l.kind}
                since={l.since}
                onJump={onJump}
              />
            ))}
          </ul>
        )}
      </Section>

      {/* Forward — 이 노드가 영향을 주는 대상 */}
      <Section
        icon={ArrowDown}
        title="Forward · 이 항목이 영향을 주는 대상"
        count={forward.length}
        tone="sky"
      >
        {forward.length === 0 ? (
          <Empty msg="대상 없음" />
        ) : (
          <ul className="space-y-1">
            {forward.map((l, i) => (
              <LinkRow
                key={i}
                eidStr={l.to}
                kind={l.kind}
                since={l.since}
                onJump={onJump}
              />
            ))}
          </ul>
        )}
      </Section>

      {/* CCR 이력 */}
      <Section
        icon={ArrowLeftRight}
        title="변경 이력 (CCR)"
        count={ccrs.length}
        tone="amber"
      >
        {ccrs.length === 0 ? (
          <Empty msg="변경 이력 없음" />
        ) : (
          <ul className="space-y-1.5">
            {ccrs.slice(0, 8).map((r) => (
              <li
                key={r.id}
                className="rounded-md p-2 text-[11.5px]"
                style={{ background: 'var(--bg-soft)' }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background:
                        r.action === 'CREATE'
                          ? 'var(--leaf-soft)'
                          : r.action === 'DELETE'
                          ? 'var(--rust-soft)'
                          : 'var(--amber-soft)',
                      color:
                        r.action === 'CREATE'
                          ? 'var(--moss)'
                          : r.action === 'DELETE'
                          ? 'var(--rust)'
                          : 'var(--amber)',
                    }}
                  >
                    {r.action}
                  </span>
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: 'var(--ink-faint)' }}
                  >
                    {r.id}
                  </span>
                </div>
                <div className="mt-0.5" style={{ color: 'var(--ink)' }}>
                  {r.reason}
                </div>
                <div
                  className="font-mono text-[10px] mt-0.5"
                  style={{ color: 'var(--ink-faint)' }}
                >
                  {new Date(r.performedAt).toLocaleString('ko-KR')} ·{' '}
                  {r.performedBy.name} ({r.performedBy.levelLabel})
                </div>
              </li>
            ))}
            {ccrs.length > 8 && (
              <li
                className="text-[11px] text-center pt-1"
                style={{ color: 'var(--ink-faint)' }}
              >
                … 외 {ccrs.length - 8}건
              </li>
            )}
          </ul>
        )}
      </Section>

      {/* 적용 규제 */}
      <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
        <div
          className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1.5"
          style={{ color: 'var(--ink-faint)' }}
        >
          REGULATORY MAPPING
        </div>
        <RegulationsForType type={parsed.type} />
      </div>
    </div>
  )
}

const TYPE_KO = {
  inspectionTemplate: '검사 항목',
  processBlock: '공정 블록',
  product: '제품',
  workOrder: '작업 지시',
  stage: 'eBR 단계',
  ncr: 'NCR',
  capa: 'CAPA',
  quarantineItem: '격리 항목',
}

function Section({ icon: Icon, title, count, tone, children }) {
  const t = TONE_COLORS[tone] || TONE_COLORS.moss
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={11} style={{ color: t.fg }} />
        <span
          className="font-mono text-[10px] tracking-[0.16em] uppercase"
          style={{ color: 'var(--ink-mute)' }}
        >
          {title}
        </span>
        <span
          className="font-mono text-[10px] px-1.5 py-0.5 rounded ml-auto"
          style={{ background: t.bg, color: t.fg, fontWeight: 500 }}
        >
          {count}
        </span>
      </div>
      {children}
    </div>
  )
}

function Empty({ msg }) {
  return (
    <div
      className="text-[11.5px] text-center py-2 rounded-md"
      style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}
    >
      {msg}
    </div>
  )
}

function LinkRow({ eidStr, kind, since, onJump }) {
  const display = getEntityDisplayName(eidStr)
  const parsed = parseEid(eidStr)
  const typeKo = parsed ? TYPE_KO[parsed.type] || parsed.type : ''
  return (
    <li>
      <button
        onClick={() => onJump(eidStr)}
        className="w-full text-left rounded-md p-2 transition flex items-start gap-2"
        style={{ background: 'var(--bg-soft)' }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = 'var(--leaf-soft)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = 'var(--bg-soft)')
        }
      >
        <ChevronRight size={12} style={{ color: 'var(--ink-faint)', marginTop: 2 }} />
        <div className="flex-1 min-w-0">
          <div className="text-[12px]" style={{ color: 'var(--ink)' }}>
            {display}
          </div>
          <div
            className="font-mono text-[10px] mt-0.5"
            style={{ color: 'var(--ink-faint)' }}
          >
            {typeKo} · {getKindLabel(kind)}
            {since && ` · ${new Date(since).toLocaleDateString('ko-KR')}`}
          </div>
        </div>
      </button>
    </li>
  )
}

function RegulationsForType({ type }) {
  const map = {
    inspectionTemplate: [
      'ISO 13485 §7.5.6',
      '21 CFR 820.72',
      'ISO 14971 §5.4',
      'Part 11 §11.10(e)',
    ],
    processBlock: [
      'ISO 13485 §7.5.1',
      '21 CFR 820.70',
      'ISO 14971 §5.4',
    ],
    workOrder: [
      'ISO 13485 §7.5.1',
      '21 CFR 820.65',
      'MDR Article 27',
    ],
    stage: [
      'ISO 13485 §8.2.4',
      '21 CFR 820.80',
      'Part 11 §11.50/§11.70',
      'EU Annex 11 §14',
    ],
    ncr: [
      'ISO 13485 §8.3',
      '21 CFR 820.90',
    ],
    capa: [
      'ISO 13485 §8.5.2',
      '21 CFR 820.100',
    ],
    quarantineItem: [
      'ISO 13485 §8.3',
      '21 CFR 820.90(a)',
    ],
    product: [
      'ISO 13485 §7.3',
      '21 CFR 820.30',
      'MDR Annex II',
    ],
  }
  const regs = map[type] || []
  if (regs.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {regs.map((r, i) => (
        <span
          key={i}
          className="font-mono text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}
        >
          {r}
        </span>
      ))}
    </div>
  )
}

/* ================================================================
   메타 카드 / 빈 상태
   ================================================================ */
function MetaCard({ icon: Icon, label, value, tone }) {
  const t = TONE_COLORS[tone] || TONE_COLORS.moss
  return (
    <div className="card-base p-3.5">
      <div className="flex items-center justify-between">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: t.bg }}
        >
          <Icon size={15} style={{ color: t.fg }} strokeWidth={1.7} />
        </div>
        <div
          className="font-display text-[22px]"
          style={{ color: t.fg, fontWeight: 500 }}
        >
          {value}
        </div>
      </div>
      <div className="mt-1.5 text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>
        {label}
      </div>
    </div>
  )
}

function EmptyTree() {
  return (
    <div
      className="text-center py-12 px-4 rounded-lg"
      style={{ background: 'var(--bg-soft)', borderStyle: 'dashed' }}
    >
      <GitBranch
        size={28}
        style={{ color: 'var(--ink-faint)', margin: '0 auto' }}
        strokeWidth={1.4}
      />
      <div className="mt-3 text-[14px]" style={{ color: 'var(--ink)' }}>
        품질 트리가 비어 있습니다
      </div>
      <div
        className="mt-1 text-[12px]"
        style={{ color: 'var(--ink-mute)' }}
      >
        온보딩 → 작업 지시 발급 → eBR 측정 흐름을 진행하면 노드가 자동
        구축됩니다.
      </div>
    </div>
  )
}
