import React, { useState, useMemo, useCallback } from 'react'
import { ClipboardList, CheckCircle2, XCircle, AlertCircle, MinusCircle, BarChart2, FileDown, RotateCcw, ChevronDown, ChevronRight, Shield } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

const LS_KEY = 'qualytree.gmp_self_inspection'

const CATEGORIES = [
  {
    id: 'doc', label: '문서 및 기록 관리',
    items: [
      { id: 'd1', label: '품질 매뉴얼이 수립·유지되고 있는가?' },
      { id: 'd2', label: '문서 관리 절차(승인, 배포, 개정)가 있는가?' },
      { id: 'd3', label: '기록 관리 절차(보존기간, 폐기)가 있는가?' },
      { id: 'd4', label: '외부 출처 문서(규격, 법령)가 파악·관리되는가?' },
      { id: 'd5', label: '구식 문서의 오용 방지 조치가 있는가?' },
    ]
  },
  {
    id: 'mgmt', label: '경영 책임',
    items: [
      { id: 'm1', label: '품질 방침이 문서화·전달·검토되는가?' },
      { id: 'm2', label: '품질 목표가 수립되고 달성 여부를 모니터링하는가?' },
      { id: 'm3', label: '경영 검토가 정기적으로 실시되는가?' },
      { id: 'm4', label: '품질 책임자(QM)가 지정되어 있는가?' },
      { id: 'm5', label: '고객 요구사항을 파악하고 충족시키기 위한 절차가 있는가?' },
    ]
  },
  {
    id: 'resource', label: '자원 관리',
    items: [
      { id: 'r1', label: '직원 역량 요건이 정의되고 교육이 실시되는가?' },
      { id: 'r2', label: '교육 효과성이 평가되는가?' },
      { id: 'r3', label: '제조 설비 및 장비 목록이 관리되는가?' },
      { id: 'r4', label: '작업환경(온도, 습도, 청결도) 기준이 있는가?' },
      { id: 'r5', label: '시험·검사 장비의 교정이 정기적으로 실시되는가?' },
    ]
  },
  {
    id: 'production', label: '제품 실현',
    items: [
      { id: 'p1', label: '제품 실현 계획이 수립되어 있는가?' },
      { id: 'p2', label: '고객 요구사항 검토 절차가 있는가?' },
      { id: 'p3', label: '설계 및 개발 절차가 있는가?(해당 시)' },
      { id: 'p4', label: '공급업체 평가·선정·모니터링 절차가 있는가?' },
      { id: 'p5', label: '제조 공정이 문서화되어 있는가?(SOP, 작업표준서)' },
      { id: 'p6', label: '제품 식별 및 추적성이 유지되는가?' },
      { id: 'p7', label: '고객 재산(원자재, 금형 등)의 관리 절차가 있는가?' },
      { id: 'p8', label: '제품 보존(보관, 포장) 절차가 있는가?' },
    ]
  },
  {
    id: 'quality', label: '측정·분석·개선',
    items: [
      { id: 'q1', label: '수입검사 절차가 있고 실시되는가?' },
      { id: 'q2', label: '공정 중·최종 검사 절차가 있는가?' },
      { id: 'q3', label: '부적합품 관리 절차가 있는가?' },
      { id: 'q4', label: '고객 불만 수집·분석·처리 절차가 있는가?' },
      { id: 'q5', label: '내부 감사가 계획·실시되는가?' },
      { id: 'q6', label: 'CAPA(시정 및 예방 조치) 절차가 있는가?' },
      { id: 'q7', label: '이상사례 보고 절차가 있는가?(시판 후)' },
      { id: 'q8', label: 'KPI 등 성과 지표를 분석하는가?' },
    ]
  },
]

const STATUS_OPTIONS = [
  { value: 'pass', label: '적합', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-300' },
  { value: 'fail', label: '부적합', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-300' },
  { value: 'obs', label: '관찰사항', icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-300' },
  { value: 'na', label: '해당없음', icon: MinusCircle, color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200' },
]

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function save(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch {}
}

function calcScore(results) {
  const applicable = Object.values(results).filter(v => v !== 'na')
  const pass = applicable.filter(v => v === 'pass').length
  return applicable.length === 0 ? null : Math.round((pass / applicable.length) * 100)
}

function calcCatScore(cat, results) {
  const applicable = cat.items.map(it => results[it.id]).filter(v => v && v !== 'na')
  const pass = applicable.filter(v => v === 'pass').length
  return applicable.length === 0 ? null : Math.round((pass / applicable.length) * 100)
}

function scoreColor(pct) {
  if (pct === null) return 'text-gray-400'
  if (pct >= 80) return 'text-green-600'
  if (pct >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

export default function GmpSelfInspectionHub() {
  const user = auth.getUser()
  const [results, setResults] = useState(() => load())
  const [openCats, setOpenCats] = useState(() => Object.fromEntries(CATEGORIES.map(c => [c.id, true])))
  const [note, setNote] = useState('')

  const setStatus = useCallback((itemId, val) => {
    setResults(prev => {
      const next = { ...prev, [itemId]: val }
      save(next)
      return next
    })
  }, [])

  const totalScore = useMemo(() => calcScore(results), [results])
  const answered = Object.values(results).filter(Boolean).length
  const totalItems = CATEGORIES.reduce((s, c) => s + c.items.length, 0)

  function handleReset() {
    if (!window.confirm('모든 답변을 초기화하시겠습니까?')) return
    setResults({})
    save({})
  }

  function handleExport() {
    const date = new Date().toLocaleDateString('ko-KR')
    let lines = ['KGMP 자가점검 보고서', '점검일: ' + date, '']
    CATEGORIES.forEach(cat => {
      const score = calcCatScore(cat, results)
      lines.push('[' + cat.label + '] ' + (score !== null ? score + '%' : '-'))
      cat.items.forEach(it => {
        const s = results[it.id]
        const opt = STATUS_OPTIONS.find(o => o.value === s)
        lines.push('  ' + it.label + ': ' + (opt ? opt.label : '미응답'))
      })
      lines.push('')
    })
    if (note) lines.push('비고: ' + note)
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = 'GMP_SelfInspection_' + date.replace(/\./g, '') + '.txt'
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <AppLayout user={user} title="GMP 심사 자가점검">
      <HubBanner icon={Shield} title="GMP 심사 자가점검" subtitle="KGMP 요건 기반 자가점검 체크리스트" color="#7C3AED" />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* 전체 점수 카드 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">전체 준수율</p>
              <p className={`text-4xl font-bold mt-0.5 ${scoreColor(totalScore)}`}>
                {totalScore !== null ? totalScore + '%' : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">{answered} / {totalItems} 항목 응답</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleExport}
                className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                <FileDown className="w-4 h-4" />보고서
              </button>
              <button onClick={handleReset}
                className="flex items-center gap-1.5 text-sm border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50">
                <RotateCcw className="w-4 h-4" />초기화
              </button>
            </div>
          </div>
          {/* 카테고리별 미니 점수 */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map(cat => {
              const sc = calcCatScore(cat, results)
              return (
                <div key={cat.id} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                  <p className="text-gray-500 truncate">{cat.label}</p>
                  <p className={`font-semibold ${scoreColor(sc)}`}>{sc !== null ? sc + '%' : '—'}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* 카테고리별 체크리스트 */}
        {CATEGORIES.map(cat => {
          const isOpen = openCats[cat.id]
          const sc = calcCatScore(cat, results)
          return (
            <div key={cat.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition"
                onClick={() => setOpenCats(o => ({ ...o, [cat.id]: !o[cat.id] }))}>
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <span className="font-medium text-gray-800 text-sm">{cat.label}</span>
                </div>
                <span className={`text-sm font-semibold ${scoreColor(sc)}`}>{sc !== null ? sc + '%' : '—'}</span>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {cat.items.map(item => {
                    const cur = results[item.id]
                    return (
                      <div key={item.id} className="px-5 py-3">
                        <p className="text-sm text-gray-700 mb-2">{item.label}</p>
                        <div className="flex flex-wrap gap-2">
                          {STATUS_OPTIONS.map(opt => {
                            const Icon = opt.icon
                            const active = cur === opt.value
                            return (
                              <button key={opt.value}
                                onClick={() => setStatus(item.id, active ? undefined : opt.value)}
                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition ${active ? opt.bg + ' font-semibold ' + opt.color : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                <Icon className="w-3.5 h-3.5" />
                                {opt.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* 비고 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <label className="text-sm font-medium text-gray-700 block mb-2">비고 / 종합 의견</label>
          <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
            placeholder="점검 결과에 대한 종합 의견을 입력하세요..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>

      </div>
    </AppLayout>
  )
}
