import React, { useState, useMemo } from 'react'
import {
  ArrowLeft,
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  Search,
  Sparkles,
  GripVertical,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldAlert,
  Cog,
  Droplets,
  Puzzle,
  Package,
  PenLine,
} from 'lucide-react'
import WhyPanel from '../../components/WhyPanel'
import {
  PROCESS_CATEGORIES,
  PROCESS_BLOCKS,
} from '../../lib/processBlocks'

const CATEGORY_ICONS = {
  Cog: Cog,
  Droplets: Droplets,
  Puzzle: Puzzle,
  Search: Search,
  Sparkles: Sparkles,
  Package: Package,
}

// 사용자 정의 블록은 localStorage에 별도 보관 (회사 단위 자산)
const CUSTOM_KEY = 'qualytree.customBlocks'

function loadCustomBlocks() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCustomBlocks(arr) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(arr))
}

export default function StepProcess({ data, update, onNext, onBack }) {
  const [activeCategory, setActiveCategory] = useState(PROCESS_CATEGORIES[0].id)
  const [search, setSearch] = useState('')
  // 캔버스 내 재정렬용 드래그
  const [draggedFrom, setDraggedFrom] = useState(null)
  // 라이브러리→캔버스 드래그
  const [draggingBlockId, setDraggingBlockId] = useState(null)
  const [canvasDragOver, setCanvasDragOver] = useState(false)
  // 사용자 공정 추가 모달
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customBlocks, setCustomBlocks] = useState(loadCustomBlocks)

  // 빌트인 + 사용자 정의 통합
  const allBlocks = useMemo(
    () => [...PROCESS_BLOCKS, ...customBlocks],
    [customBlocks]
  )

  const blockMap = useMemo(() => {
    const map = {}
    PROCESS_CATEGORIES.forEach((c) => (map[c.id] = []))
    allBlocks.forEach((b) => {
      if (map[b.category]) map[b.category].push(b)
    })
    return map
  }, [allBlocks])

  const filteredBlocks = useMemo(() => {
    if (!search) return blockMap[activeCategory] || []
    const q = search.toLowerCase()
    return allBlocks.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.en || '').toLowerCase().includes(q) ||
        (b.desc || '').toLowerCase().includes(q)
    )
  }, [search, activeCategory, blockMap, allBlocks])

  const findBlock = (id) => allBlocks.find((b) => b.id === id)

  /* ---------- 공정 추가/제거/이동 ---------- */
  const addBlock = (blockId, atIdx = null) => {
    const newProcess = {
      id: `proc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      blockId,
    }
    const cur = data.processes || []
    const next =
      atIdx === null
        ? [...cur, newProcess]
        : [...cur.slice(0, atIdx), newProcess, ...cur.slice(atIdx)]
    update({ ...data, processes: next })
  }

  const removeProcess = (id) => {
    update({ ...data, processes: data.processes.filter((p) => p.id !== id) })
  }

  const moveProcess = (id, direction) => {
    const arr = [...data.processes]
    const idx = arr.findIndex((p) => p.id === id)
    if (idx < 0) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= arr.length) return
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    update({ ...data, processes: arr })
  }

  /* ---------- 라이브러리 → 캔버스 드래그 ---------- */
  const onLibraryDragStart = (e, blockId) => {
    setDraggingBlockId(blockId)
    e.dataTransfer.effectAllowed = 'copy'
    try {
      e.dataTransfer.setData('text/plain', `block:${blockId}`)
    } catch {}
  }
  const onLibraryDragEnd = () => {
    setDraggingBlockId(null)
    setCanvasDragOver(false)
  }

  const onCanvasDragOver = (e) => {
    if (!draggingBlockId && draggedFrom === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = draggingBlockId ? 'copy' : 'move'
    setCanvasDragOver(true)
  }
  const onCanvasDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return
    setCanvasDragOver(false)
  }
  const onCanvasDrop = (e) => {
    e.preventDefault()
    if (draggingBlockId) {
      addBlock(draggingBlockId)
      setDraggingBlockId(null)
    }
    setCanvasDragOver(false)
  }

  /* ---------- 캔버스 내 재정렬 드래그 ---------- */
  const onReorderDragStart = (idx) => setDraggedFrom(idx)
  const onReorderDrop = (toIdx) => {
    if (draggedFrom === null || draggedFrom === toIdx) {
      setDraggedFrom(null)
      return
    }
    const arr = [...data.processes]
    const [moved] = arr.splice(draggedFrom, 1)
    arr.splice(toIdx, 0, moved)
    update({ ...data, processes: arr })
    setDraggedFrom(null)
  }

  /* ---------- 사용자 공정 생성/삭제 ---------- */
  const onCreateCustomBlock = (block) => {
    const next = [...customBlocks, block]
    setCustomBlocks(next)
    saveCustomBlocks(next)
    addBlock(block.id) // 만든 즉시 캔버스에 추가
    setShowCustomModal(false)
    setActiveCategory(block.category)
    setSearch('')
  }

  const onDeleteCustomBlock = (id) => {
    if (!confirm('이 사용자 공정을 라이브러리에서 영구 삭제할까요?')) return
    const next = customBlocks.filter((b) => b.id !== id)
    setCustomBlocks(next)
    saveCustomBlocks(next)
    if (data.processes?.some((p) => p.blockId === id)) {
      update({
        ...data,
        processes: data.processes.filter((p) => p.blockId !== id),
      })
    }
  }

  /* ---------- 자동 매핑 ---------- */
  const mapping = useMemo(() => {
    const sopSet = new Set()
    const inspectionSet = new Set()
    const standardSet = new Set()
    const riskSet = new Set()
    let specialProcessCount = 0
    ;(data.processes || []).forEach((p) => {
      const block = findBlock(p.blockId)
      if (!block) return
      block.sopAuto?.forEach((s) => sopSet.add(s))
      block.inspections?.forEach((i) => inspectionSet.add(i))
      block.standards?.forEach((s) => standardSet.add(s))
      block.risks?.forEach((r) => riskSet.add(r))
      if (block.isSpecialProcess) specialProcessCount++
    })
    return {
      sops: Array.from(sopSet),
      inspections: Array.from(inspectionSet),
      standards: Array.from(standardSet),
      risks: Array.from(riskSet),
      specialProcessCount,
    }
  }, [data.processes, allBlocks])

  const canProceed = (data.processes || []).length > 0

  return (
    <div className="space-y-4">
      {/* 상단 안내 — 정확한 표현으로 수정 */}
      <div
        className="rounded-xl px-5 py-3.5 flex items-start gap-3"
        style={{ background: 'var(--leaf-soft)', border: '1px solid var(--leaf)' }}
      >
        <Sparkles size={16} className="mt-0.5" style={{ color: 'var(--moss)' }} />
        <div className="flex-1">
          <div className="font-display text-[15px] leading-tight" style={{ fontWeight: 500 }}>
            왼쪽 라이브러리에서 공정을 추가하세요 — 클릭, 끌어다 놓기, 어느 쪽이든 OK.
          </div>
          <div className="text-[12.5px] mt-1" style={{ color: 'var(--ink-soft)' }}>
            우측 패널에서 SOP·검사·인증 매핑이 <strong>실시간으로</strong> 자동 생성됩니다.
            라이브러리에 없는 공정은 <strong>사용자 공정 추가</strong> 버튼으로 직접 만드실 수 있습니다.
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4" style={{ minHeight: 600 }}>
        {/* ============= LEFT: 라이브러리 ============= */}
        <div className="lg:col-span-3">
          <div
            className="rounded-2xl p-4 h-full flex flex-col"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="font-mono text-[10px] tracking-[0.18em] uppercase"
                style={{ color: 'var(--ink-faint)' }}
              >
                공정 블록 라이브러리
              </span>
              <button
                onClick={() => setShowCustomModal(true)}
                className="inline-flex items-center gap-1 text-[10.5px] px-2 py-1 rounded-md transition"
                style={{ background: 'var(--moss)', color: 'var(--bg)' }}
              >
                <Plus size={11} />
                사용자 공정
              </button>
            </div>

            {/* 검색 */}
            <div className="relative mb-3">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--ink-faint)' }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="공정 이름 검색…"
                className="input-base text-[13px]"
                style={{ paddingLeft: 32, paddingTop: 8, paddingBottom: 8 }}
              />
            </div>

            {/* 카테고리 탭 */}
            {!search && (
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {PROCESS_CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICONS[c.icon] || Cog
                  const active = activeCategory === c.id
                  const cnt = (blockMap[c.id] || []).length
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveCategory(c.id)}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg text-[11.5px] transition"
                      style={{
                        background: active ? 'var(--moss)' : 'var(--bg-soft)',
                        color: active ? 'var(--bg)' : 'var(--ink)',
                        fontWeight: active ? 500 : 400,
                      }}
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <Icon size={11} strokeWidth={1.7} />
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span
                        className="font-mono text-[9.5px] ml-1"
                        style={{
                          color: active ? 'rgba(248,244,236,0.7)' : 'var(--ink-faint)',
                        }}
                      >
                        {cnt}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* 블록 목록 */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5" style={{ maxHeight: 520 }}>
              {filteredBlocks.length === 0 && (
                <div className="text-[12px] text-center py-8" style={{ color: 'var(--ink-faint)' }}>
                  {search ? '검색 결과 없음' : '이 카테고리에는 아직 블록이 없습니다'}
                </div>
              )}
              {filteredBlocks.map((b) => (
                <BlockCard
                  key={b.id}
                  block={b}
                  onAdd={() => addBlock(b.id)}
                  onDragStart={(e) => onLibraryDragStart(e, b.id)}
                  onDragEnd={onLibraryDragEnd}
                  onDelete={b.isCustom ? () => onDeleteCustomBlock(b.id) : null}
                  isDragging={draggingBlockId === b.id}
                />
              ))}
            </div>

            {/* 사용자 공정 안내 */}
            <div
              className="mt-3 pt-3 text-[11px] leading-relaxed"
              style={{ borderTop: '1px solid var(--line)', color: 'var(--ink-mute)' }}
            >
              💡 라이브러리에 없는 공정은{' '}
              <button
                onClick={() => setShowCustomModal(true)}
                className="underline"
                style={{ color: 'var(--moss)' }}
              >
                직접 추가
              </button>
              할 수 있습니다.
            </div>
          </div>
        </div>

        {/* ============= MIDDLE: 캔버스 ============= */}
        <div className="lg:col-span-5">
          <div
            className="rounded-2xl p-5 h-full flex flex-col"
            onDragOver={onCanvasDragOver}
            onDragLeave={onCanvasDragLeave}
            onDrop={onCanvasDrop}
            style={{
              background: canvasDragOver ? 'var(--leaf-soft)' : 'var(--bg-card)',
              border: canvasDragOver
                ? '2px dashed var(--leaf)'
                : '1px solid var(--line)',
              minHeight: 600,
              transition: 'border .15s ease, background .15s ease',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div
                  className="font-mono text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: 'var(--ink-faint)' }}
                >
                  공정 순서 — Process Flow
                </div>
                <div className="font-display text-[15px] mt-0.5" style={{ fontWeight: 500 }}>
                  {data.processes?.length
                    ? `${data.processes.length}개 공정 — 위에서 아래로 진행`
                    : '왼쪽에서 클릭 또는 끌어 놓기로 추가'}
                </div>
              </div>
              {data.processes?.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('지정한 공정 순서를 모두 지울까요?')) {
                      update({ ...data, processes: [] })
                    }
                  }}
                  className="text-[12px] hover:opacity-70"
                  style={{ color: 'var(--rust)' }}
                >
                  모두 지우기
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {(data.processes?.length || 0) === 0 ? (
                <EmptyCanvas dragOver={canvasDragOver} />
              ) : (
                <div className="space-y-1.5">
                  {data.processes.map((p, idx) => {
                    const block = findBlock(p.blockId)
                    if (!block) return null
                    return (
                      <ProcessRow
                        key={p.id}
                        index={idx}
                        block={block}
                        onRemove={() => removeProcess(p.id)}
                        onUp={() => moveProcess(p.id, 'up')}
                        onDown={() => moveProcess(p.id, 'down')}
                        canUp={idx > 0}
                        canDown={idx < data.processes.length - 1}
                        onReorderDragStart={() => onReorderDragStart(idx)}
                        onReorderDrop={() => onReorderDrop(idx)}
                        isLast={idx === data.processes.length - 1}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============= RIGHT: 자동 매핑 ============= */}
        <div className="lg:col-span-4 space-y-3">
          <WhyPanel
            title="왜 공정을 입력하나요?"
            body={
              <>
                회사의 실제 공정을 입력하면, ISO 13485 §7.5(생산), FDA 21 CFR 820.70 등의
                <strong> SOP·검증·검사 항목이 자동으로 발행</strong>됩니다.
                특별공정(멸균·용접·포장)은 별도 밸리데이션이 필요한데, 이것도 자동으로 표시됩니다.
              </>
            }
            refs={[
              'ISO 13485:2016 §7.5',
              'FDA 21 CFR 820.70',
              'ISO 13485 §7.5.6 (특별공정)',
            ]}
          />

          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles size={13} style={{ color: 'var(--amber)' }} />
              <span
                className="font-mono text-[10px] tracking-[0.18em] uppercase"
                style={{ color: 'var(--amber)' }}
              >
                자동 생성 — Real-time
              </span>
            </div>

            <MapBlock
              icon={FileText}
              count={mapping.sops.length}
              label="필요 SOP"
              items={mapping.sops}
              empty="공정을 추가하면 SOP가 자동 매핑됩니다"
            />
            <MapBlock
              icon={Search}
              count={mapping.inspections.length}
              label="필요 검사"
              items={mapping.inspections}
              empty=""
            />
            <MapBlock
              icon={CheckCircle2}
              count={mapping.standards.length}
              label="적용 표준·인증"
              items={mapping.standards}
              empty=""
              accent="var(--moss)"
            />

            {mapping.specialProcessCount > 0 && (
              <div
                className="mt-3 p-3 rounded-lg flex items-start gap-2"
                style={{
                  background: 'var(--amber-soft)',
                  border: '1px solid var(--amber)',
                }}
              >
                <AlertCircle
                  size={13}
                  className="mt-0.5"
                  style={{ color: 'var(--rust)' }}
                />
                <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>
                  <strong>특별공정 {mapping.specialProcessCount}개</strong>가 포함되어 있습니다.
                  ISO 13485 §7.5.6에 따라 별도 밸리데이션(IQ/OQ/PQ)이 필요합니다.
                </div>
              </div>
            )}

            {mapping.risks.length > 0 && (
              <MapBlock
                icon={ShieldAlert}
                count={mapping.risks.length}
                label="자동 식별된 위험 항목"
                items={mapping.risks}
                empty=""
                accent="var(--rust)"
              />
            )}
          </div>
        </div>
      </div>

      {/* 하단 네비 */}
      <div className="pt-2 flex justify-between">
        <button onClick={onBack} className="btn-ghost">
          <ArrowLeft size={14} />
          이전
        </button>
        <button disabled={!canProceed} onClick={onNext} className="btn-primary">
          다음 — 다중 규제 →
        </button>
      </div>

      {showCustomModal && (
        <CustomBlockModal
          onClose={() => setShowCustomModal(false)}
          onCreate={onCreateCustomBlock}
        />
      )}
    </div>
  )
}

/* ===================== Sub-components ===================== */

function BlockCard({ block, onAdd, onDragStart, onDragEnd, onDelete, isDragging }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onAdd}
      className="group w-full text-left p-2.5 rounded-lg transition relative cursor-grab active:cursor-grabbing"
      style={{
        background: isDragging ? 'var(--leaf-soft)' : 'var(--bg-soft)',
        border: `1px solid ${isDragging ? 'var(--leaf)' : 'transparent'}`,
        opacity: isDragging ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (isDragging) return
        e.currentTarget.style.borderColor = 'var(--moss)'
        e.currentTarget.style.background = 'var(--leaf-soft)'
      }}
      onMouseLeave={(e) => {
        if (isDragging) return
        e.currentTarget.style.borderColor = 'transparent'
        e.currentTarget.style.background = 'var(--bg-soft)'
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-[12.5px]"
              style={{ color: 'var(--ink)', fontWeight: 500 }}
            >
              {block.name}
            </span>
            {block.isSpecialProcess && (
              <span
                className="font-mono text-[8.5px] px-1 py-px rounded"
                style={{
                  background: 'var(--amber-soft)',
                  color: 'var(--rust)',
                  fontWeight: 600,
                }}
              >
                SP
              </span>
            )}
            {block.isCustom && (
              <span
                className="font-mono text-[8.5px] px-1 py-px rounded"
                style={{
                  background: 'var(--sky-soft)',
                  color: 'var(--sky)',
                  fontWeight: 600,
                }}
              >
                MY
              </span>
            )}
          </div>
          <div
            className="text-[10.5px] mt-0.5"
            style={{ color: 'var(--ink-mute)' }}
          >
            {block.desc}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center transition"
              style={{ background: 'var(--rust-soft)', color: 'var(--rust)' }}
              title="사용자 공정 삭제"
            >
              <X size={11} />
            </button>
          )}
          <Plus
            size={14}
            className="mt-0.5 opacity-0 group-hover:opacity-100 transition"
            style={{ color: 'var(--moss)' }}
          />
        </div>
      </div>
    </div>
  )
}

function EmptyCanvas({ dragOver }) {
  return (
    <div
      className="h-full flex flex-col items-center justify-center rounded-xl text-center px-6"
      style={{
        border: dragOver ? 'none' : '2px dashed var(--line-strong)',
        minHeight: 400,
        transition: 'background .15s ease',
      }}
    >
      {dragOver ? (
        <>
          <div
            className="font-display text-[18px]"
            style={{ color: 'var(--moss)', fontWeight: 600 }}
          >
            여기에 놓으세요
          </div>
          <div className="mt-1 text-[12.5px]" style={{ color: 'var(--moss-mid)' }}>
            놓으면 공정 순서에 추가됩니다
          </div>
        </>
      ) : (
        <>
          <div
            className="font-display text-[16px] leading-tight"
            style={{ color: 'var(--ink-mute)', fontWeight: 500 }}
          >
            왼쪽 블록을 클릭하거나
            <br />
            여기로 끌어 놓아주세요
          </div>
          <div className="mt-3 text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>
            예: 가공 → 세척 → 검사 → 멸균 → 포장
          </div>
        </>
      )}
    </div>
  )
}

function ProcessRow({
  index,
  block,
  onRemove,
  onUp,
  onDown,
  canUp,
  canDown,
  onReorderDragStart,
  onReorderDrop,
  isLast,
}) {
  return (
    <>
      <div
        draggable
        onDragStart={onReorderDragStart}
        onDrop={onReorderDrop}
        onDragOver={(e) => e.preventDefault()}
        className="group flex items-stretch gap-2 p-3 rounded-xl transition cursor-move fade-in"
        style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}
      >
        <div
          className="flex flex-col items-center gap-1 pt-0.5"
          style={{ color: 'var(--ink-faint)' }}
        >
          <GripVertical size={14} />
          <span
            className="font-mono text-[11px]"
            style={{ color: 'var(--moss)', fontWeight: 600 }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[14px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              {block.name}
            </span>
            <span
              className="font-display italic text-[11.5px]"
              style={{ color: 'var(--ink-mute)' }}
            >
              {block.en}
            </span>
            {block.isSpecialProcess && (
              <span
                className="font-mono text-[9px] px-1.5 py-0.5 rounded tracking-wider"
                style={{
                  background: 'var(--amber-soft)',
                  color: 'var(--rust)',
                  fontWeight: 600,
                }}
              >
                SPECIAL PROCESS
              </span>
            )}
            {block.isCustom && (
              <span
                className="font-mono text-[9px] px-1.5 py-0.5 rounded tracking-wider"
                style={{
                  background: 'var(--sky-soft)',
                  color: 'var(--sky)',
                  fontWeight: 600,
                }}
              >
                CUSTOM
              </span>
            )}
          </div>
          <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-mute)' }}>
            {block.desc}
          </div>
          {block.sopAuto && block.sopAuto.length > 0 && (
            <div
              className="text-[10.5px] mt-1.5 font-mono"
              style={{ color: 'var(--moss)' }}
            >
              + {block.sopAuto[0]}
              {block.sopAuto.length > 1 && ` (외 ${block.sopAuto.length - 1})`}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            disabled={!canUp}
            onClick={onUp}
            className="w-6 h-6 rounded flex items-center justify-center transition"
            style={{
              background: 'var(--bg-card)',
              color: canUp ? 'var(--ink)' : 'var(--line-strong)',
              opacity: canUp ? 1 : 0.4,
            }}
          >
            <ArrowUp size={12} />
          </button>
          <button
            disabled={!canDown}
            onClick={onDown}
            className="w-6 h-6 rounded flex items-center justify-center transition"
            style={{
              background: 'var(--bg-card)',
              color: canDown ? 'var(--ink)' : 'var(--line-strong)',
              opacity: canDown ? 1 : 0.4,
            }}
          >
            <ArrowDown size={12} />
          </button>
          <button
            onClick={onRemove}
            className="w-6 h-6 rounded flex items-center justify-center transition"
            style={{ background: 'var(--rust-soft)', color: 'var(--rust)' }}
          >
            <X size={12} />
          </button>
        </div>
      </div>
      {!isLast && (
        <div className="flex justify-center -my-0.5">
          <div className="w-px h-3" style={{ background: 'var(--line-strong)' }} />
        </div>
      )}
    </>
  )
}

function MapBlock({ icon: Icon, count, label, items, empty, accent }) {
  return (
    <div className="mt-3 first:mt-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon size={11} style={{ color: accent || 'var(--ink-mute)' }} />
          <span
            className="font-mono text-[10px] tracking-[0.16em] uppercase"
            style={{ color: 'var(--ink-mute)' }}
          >
            {label}
          </span>
        </div>
        <span
          className="font-mono text-[11px]"
          style={{
            color: count > 0 ? accent || 'var(--moss)' : 'var(--ink-faint)',
            fontWeight: 600,
          }}
        >
          {count}
        </span>
      </div>
      {count === 0 && empty ? (
        <div className="text-[11.5px] py-1.5" style={{ color: 'var(--ink-faint)' }}>
          {empty}
        </div>
      ) : (
        <ul className="space-y-0.5">
          {items.slice(0, 4).map((it, i) => (
            <li
              key={i}
              className="text-[11.5px] truncate"
              style={{ color: 'var(--ink-soft)' }}
            >
              <span style={{ color: 'var(--ink-faint)' }}>·</span> {it}
            </li>
          ))}
          {items.length > 4 && (
            <li
              className="text-[10.5px] mt-0.5"
              style={{ color: 'var(--ink-faint)' }}
            >
              + {items.length - 4}개 더
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

/* ===================== 사용자 공정 추가 모달 ===================== */

function CustomBlockModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [en, setEn] = useState('')
  const [category, setCategory] = useState(PROCESS_CATEGORIES[0].id)
  const [desc, setDesc] = useState('')
  const [sop, setSop] = useState('')
  const [inspection, setInspection] = useState('')
  const [isSpecialProcess, setIsSpecialProcess] = useState(false)

  const canCreate = name.trim().length > 0

  const submit = () => {
    if (!canCreate) return
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const block = {
      id,
      name: name.trim(),
      en: en.trim() || name.trim(),
      category,
      desc: desc.trim() || '사용자 정의 공정',
      inputs: [],
      outputs: [],
      sopAuto: sop.trim()
        ? [sop.trim()]
        : [`SOP-CUSTOM-${id.slice(-4).toUpperCase()} ${name.trim()} 작업 표준`],
      inspections: inspection.trim() ? [inspection.trim()] : [],
      standards: ['ISO 13485 §7.5.1'],
      risks: [],
      isCustom: true,
      isSpecialProcess,
    }
    onCreate(block)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,26,20,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] rounded-2xl overflow-hidden fade-in"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'var(--bg-soft)', borderBottom: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-2.5">
            <PenLine size={16} style={{ color: 'var(--moss)' }} />
            <div>
              <div className="font-display text-[16px]" style={{ fontWeight: 500 }}>
                사용자 공정 추가
              </div>
              <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
                회사 고유 공정을 라이브러리에 추가합니다
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--bg-soft)]"
          >
            <X size={14} style={{ color: 'var(--ink-mute)' }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <Field label="공정 이름" required>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 코팅 처리"
              className="input-base text-[13px]"
            />
          </Field>

          <Field label="영문 이름 (선택)">
            <input
              type="text"
              value={en}
              onChange={(e) => setEn(e.target.value)}
              placeholder="예: Coating"
              className="input-base text-[13px]"
            />
          </Field>

          <Field label="카테고리" required>
            <div className="grid grid-cols-3 gap-1.5">
              {PROCESS_CATEGORIES.map((c) => {
                const active = category === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className="px-2 py-2 rounded-lg text-[12px] transition"
                    style={{
                      background: active ? 'var(--moss)' : 'var(--bg-soft)',
                      color: active ? 'var(--bg)' : 'var(--ink)',
                      fontWeight: active ? 500 : 400,
                    }}
                  >
                    {c.name}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="공정 설명 (선택)">
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="공정에 대한 짧은 설명"
              rows={2}
              className="input-base text-[13px] resize-none"
            />
          </Field>

          <Field label="필요 SOP (선택)" hint="비워두면 자동 생성">
            <input
              type="text"
              value={sop}
              onChange={(e) => setSop(e.target.value)}
              placeholder="예: SOP-MFG-010 코팅 처리 표준"
              className="input-base text-[13px]"
            />
          </Field>

          <Field label="필요 검사 (선택)">
            <input
              type="text"
              value={inspection}
              onChange={(e) => setInspection(e.target.value)}
              placeholder="예: 코팅 두께 검사"
              className="input-base text-[13px]"
            />
          </Field>

          <label
            className="flex items-start gap-2.5 p-3 rounded-xl cursor-pointer transition"
            style={{
              background: isSpecialProcess ? 'var(--amber-soft)' : 'var(--bg-soft)',
              border: `1px solid ${isSpecialProcess ? 'var(--amber)' : 'transparent'}`,
            }}
          >
            <input
              type="checkbox"
              checked={isSpecialProcess}
              onChange={(e) => setIsSpecialProcess(e.target.checked)}
              className="mt-0.5"
            />
            <div className="flex-1 text-[12.5px]">
              <div style={{ color: 'var(--ink)', fontWeight: 500 }}>
                특별공정 (Special Process)
              </div>
              <div style={{ color: 'var(--ink-mute)', marginTop: 2 }}>
                ISO 13485 §7.5.6 — 결과를 후속 검사로 검증할 수 없는 공정 (멸균·용접·포장 등).
                별도 밸리데이션(IQ/OQ/PQ) 필요.
              </div>
            </div>
          </label>
        </div>

        <div
          className="px-6 py-3.5 flex items-center justify-end gap-2"
          style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}
        >
          <button onClick={onClose} className="btn-ghost">
            취소
          </button>
          <button onClick={submit} disabled={!canCreate} className="btn-primary">
            <Plus size={14} />
            라이브러리에 추가
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label
          className="text-[12.5px]"
          style={{ color: 'var(--ink-soft)', fontWeight: 500 }}
        >
          {label}
          {required && (
            <span className="ml-1" style={{ color: 'var(--rust)' }}>
              *
            </span>
          )}
        </label>
        {hint && (
          <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
