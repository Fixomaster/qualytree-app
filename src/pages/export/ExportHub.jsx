// src/pages/export/ExportHub.jsx
// QMS 기록 내보내기 허브 — PDF 출력 / 기록 관리
import React, { useState, useMemo } from 'react'
import {
  FileText, Download, Printer, Search,
  Filter, CheckCircle2, AlertTriangle, Clock,
  ChevronRight, BarChart2, ClipboardList,
  Workflow, TrendingUp,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import {
  printNCR, printCAPA, printAudit, printCAR,
  printImprovement, printWorkOrder, printAuditChecklist,
} from '../../lib/pdfPrint'

// ── localStorage 읽기 ─────────────────────────────────────────
function lsRead(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    if (key === 'qualytree.operations' && p?.workOrders) return p.workOrders
    return Array.isArray(p) ? p : fallback
  } catch { return fallback }
}

// ── 상태 라벨/색 ─────────────────────────────────────────────
const STATUS_LABEL = {
  open: '미결', under_review: '검토 중', correcting: '조치 중',
  closed: '종결', verified: '검증완료', pending: '대기',
  in_progress: '진행 중', done: '완료', completed: '완료',
  planned: '계획', idea: '아이디어', approved: '승인됨',
}
const STATUS_COLOR = {
  open: '#EF4444', under_review: '#F59E0B', correcting: '#F59E0B',
  closed: '#10B981', verified: '#10B981', pending: '#6B7280',
  in_progress: '#3B82F6', done: '#10B981', completed: '#3B82F6',
  planned: '#6B7280', idea: '#6B7280', approved: '#3B82F6',
}

// ── 레코드 타입 정의 ──────────────────────────────────────────
function useAllRecords() {
  const ncrs   = lsRead('qualytree.ncrs')
  const capas  = lsRead('qualytree.capas')
  const wos    = lsRead('qualytree.operations')
  const audits = lsRead('qualytree.audits')
  const cars   = lsRead('qualytree.audit_cars')
  const imps   = lsRead('qualytree.improvements')
  const clChecks = (() => { try { return JSON.parse(localStorage.getItem('qualytree.audit_checklist') || '{}') } catch { return {} } })()
  return { ncrs, capas, wos, audits, cars, imps, clChecks }
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function ExportHub() {
  const user = auth.current()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { ncrs, capas, wos, audits, cars, imps, clChecks } = useAllRecords()

  const stats = {
    ncr: ncrs.length,
    capa: capas.length,
    wo: wos.length,
    audit: audits.length,
    car: cars.length,
    imp: imps.length,
  }

  const TABS = [
    { key: 'all',   label: '전체',       icon: FileText },
    { key: 'ncr',   label: 'NCR',        icon: AlertTriangle, count: stats.ncr },
    { key: 'capa',  label: 'CAPA',       icon: CheckCircle2,  count: stats.capa },
    { key: 'wo',    label: '작업지시',   icon: Workflow,      count: stats.wo },
    { key: 'audit', label: '내부감사',   icon: Search,        count: stats.audit },
    { key: 'car',   label: 'CAR',        icon: ClipboardList, count: stats.car },
    { key: 'imp',   label: '개선활동',   icon: TrendingUp,    count: stats.imp },
  ]

  const buildRows = () => {
    const rows = []
    if (tab === 'all' || tab === 'ncr') {
      ncrs.forEach(r => rows.push({ type: 'NCR', id: r.id, title: r.title || r.id, status: r.status, date: r.detectedAt?.slice(0,10), severity: r.severity, raw: r }))
    }
    if (tab === 'all' || tab === 'capa') {
      capas.forEach(r => rows.push({ type: 'CAPA', id: r.id, title: r.title || r.id, status: r.status, date: r.createdAt?.slice(0,10), severity: null, raw: r }))
    }
    if (tab === 'all' || tab === 'wo') {
      wos.forEach(r => rows.push({ type: 'WO', id: r.woId || r.id, title: r.productName || r.woId, status: r.status, date: r.issuedAt?.slice(0,10) || r.createdAt?.slice(0,10), severity: r.priority === 'urgent' ? 'urgent' : null, raw: r }))
    }
    if (tab === 'all' || tab === 'audit') {
      audits.forEach(r => rows.push({ type: 'AUD', id: r.id, title: r.title || r.id, status: r.status, date: r.auditDate, severity: null, raw: r }))
    }
    if (tab === 'all' || tab === 'car') {
      cars.forEach(r => rows.push({ type: 'CAR', id: r.id, title: r.finding?.slice(0,40) || r.id, status: r.status, date: r.createdAt?.slice(0,10), severity: r.severity, raw: r }))
    }
    if (tab === 'all' || tab === 'imp') {
      imps.forEach(r => rows.push({ type: 'IMP', id: r.id, title: r.title || r.id, status: r.status, date: r.createdAt?.slice(0,10), severity: r.priority === 'high' ? 'high' : null, raw: r }))
    }
    return rows
  }

  const filteredRows = useMemo(() => {
    let rows = buildRows()
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(r => (r.id + r.title).toLowerCase().includes(q))
    }
    if (statusFilter !== 'all') {
      rows = rows.filter(r => r.status === statusFilter)
    }
    return rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [tab, search, statusFilter, ncrs.length, capas.length])

  const handlePrint = (row) => {
    const carList = lsRead('qualytree.audit_cars')
    switch (row.type) {
      case 'NCR':   return printNCR(row.raw)
      case 'CAPA':  return printCAPA(row.raw)
      case 'WO':    return printWorkOrder(row.raw)
      case 'AUD':   return printAudit(row.raw, carList)
      case 'CAR':   return printCAR(row.raw)
      case 'IMP':   return printImprovement(row.raw)
    }
  }

  const TYPE_COLORS = {
    NCR: '#EF4444', CAPA: '#F59E0B', WO: '#3B82F6',
    AUD: '#8B5CF6', CAR: '#EF4444', IMP: '#10B981',
  }

  const TYPE_ICONS = {
    NCR: AlertTriangle, CAPA: CheckCircle2, WO: Workflow,
    AUD: Search, CAR: ClipboardList, IMP: TrendingUp,
  }

  return (
    <AppLayout user={user} title="기록 내보내기" subtitle="QMS 기록 PDF 출력 · ISO 13485 문서 출력">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        {/* 상단 통계 카드 */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'NCR', count: stats.ncr, color: '#EF4444', icon: AlertTriangle },
            { label: 'CAPA', count: stats.capa, color: '#F59E0B', icon: CheckCircle2 },
            { label: '작업지시', count: stats.wo, color: '#3B82F6', icon: Workflow },
            { label: '내부감사', count: stats.audit, color: '#8B5CF6', icon: Search },
            { label: 'CAR', count: stats.car, color: '#EF4444', icon: ClipboardList },
            { label: '개선활동', count: stats.imp, color: '#10B981', icon: TrendingUp },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <s.icon size={16} style={{ color: s.color, margin: '0 auto 4px' }} />
              <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{s.count}</div>
              <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 특별 출력 버튼 */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <button
            onClick={() => printAuditChecklist(clChecks)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ background: '#8B5CF620', color: '#8B5CF6', border: '1px solid #8B5CF640', cursor: 'pointer' }}
          >
            <Printer size={14} /> ISO 13485 체크리스트 출력
          </button>
          <div className="text-[12px] flex items-center" style={{ color: 'var(--ink-faint)' }}>
            ← 체크리스트에 입력한 결과가 반영됩니다
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--bg-soft)', width: 'fit-content' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition flex-shrink-0"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--ink)' : 'var(--ink-faint)',
                border: 'none', cursor: 'pointer',
                boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <t.icon size={13} />
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className="text-[10px] px-1.5 rounded-full font-bold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 검색 & 필터 */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[200px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <Search size={14} style={{ color: 'var(--ink-faint)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="문서 번호 또는 제목 검색..."
              className="flex-1 text-[13px] outline-none"
              style={{ background: 'none', border: 'none', color: 'var(--ink)' }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-[13px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}
          >
            <option value="all">전체 상태</option>
            <option value="open">미결</option>
            <option value="in_progress">진행 중</option>
            <option value="closed">종결</option>
            <option value="done">완료</option>
          </select>
        </div>

        {/* 기록 목록 */}
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <FileText size={40} strokeWidth={1.2} className="mb-3" style={{ color: 'var(--ink-faint)', opacity: 0.4 }} />
            <div className="text-[15px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>
              {search ? '검색 결과 없음' : '출력 가능한 기록 없음'}
            </div>
            <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>
              각 허브에서 데이터를 입력하면 여기서 PDF로 출력할 수 있습니다
            </div>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            {/* 테이블 헤더 */}
            <div
              className="grid gap-3 px-5 py-3 text-[11px] font-semibold"
              style={{
                gridTemplateColumns: '90px 1fr 90px 90px 90px 90px',
                color: 'var(--ink-faint)',
                borderBottom: '1px solid var(--line)',
                background: 'var(--bg-soft)',
              }}
            >
              <span>유형</span>
              <span>제목</span>
              <span>문서 번호</span>
              <span>날짜</span>
              <span>상태</span>
              <span className="text-right">출력</span>
            </div>

            {/* 기록 행 */}
            {filteredRows.map((row, i) => {
              const Icon = TYPE_ICONS[row.type] || FileText
              const typeColor = TYPE_COLORS[row.type] || '#6B7280'
              const stColor = STATUS_COLOR[row.status] || '#6B7280'
              const stLabel = STATUS_LABEL[row.status] || row.status || '-'

              return (
                <div
                  key={`${row.type}-${row.id}-${i}`}
                  className="grid gap-3 px-5 py-3.5 items-center hover:bg-opacity-50 transition"
                  style={{
                    gridTemplateColumns: '90px 1fr 90px 90px 90px 90px',
                    borderBottom: i < filteredRows.length - 1 ? '1px solid var(--line)' : 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-soft)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  {/* 유형 뱃지 */}
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${typeColor}18` }}
                    >
                      <Icon size={12} style={{ color: typeColor }} />
                    </div>
                    <span
                      className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${typeColor}15`, color: typeColor }}
                    >
                      {row.type}
                    </span>
                  </div>

                  {/* 제목 */}
                  <div className="truncate text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
                    {row.title || '-'}
                  </div>

                  {/* 문서 번호 */}
                  <div className="font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                    {row.id || '-'}
                  </div>

                  {/* 날짜 */}
                  <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                    {row.date || '-'}
                  </div>

                  {/* 상태 */}
                  <div>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${stColor}18`, color: stColor }}
                    >
                      {stLabel}
                    </span>
                  </div>

                  {/* 출력 버튼 */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => handlePrint(row)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition"
                      style={{
                        background: `${typeColor}12`,
                        color: typeColor,
                        border: `1px solid ${typeColor}30`,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = `${typeColor}22`}
                      onMouseLeave={e => e.currentTarget.style.background = `${typeColor}12`}
                      title={`${row.type} ${row.id} PDF 출력`}
                    >
                      <Printer size={12} /> PDF
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 안내 */}
        <div className="mt-5 p-4 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
          <div className="text-[12.5px] font-semibold mb-2" style={{ color: 'var(--ink-soft)' }}>📄 출력 안내</div>
          <div className="text-[12px] space-y-1.5" style={{ color: 'var(--ink-faint)', lineHeight: 1.6 }}>
            <div>• PDF 버튼 클릭 → 새 창에서 인쇄 미리보기 자동 실행 → <strong style={{ color: 'var(--ink-soft)' }}>"PDF로 저장"</strong> 선택</div>
            <div>• 출력 형식: A4, ISO 13485 QMS 양식 (회사명, 문서번호, 서명란 포함)</div>
            <div>• 팝업 차단 해제 필요: 주소창 오른쪽 팝업 허용 클릭</div>
            <div>• SAL·MFG·PUR 데이터는 Supabase 연동(월요일) 후 자동 집계 예정</div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
