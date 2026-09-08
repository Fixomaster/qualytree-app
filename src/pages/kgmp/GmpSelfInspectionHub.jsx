import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, ChevronDown, ChevronRight, ExternalLink,
  BarChart2, FileText, Save, RotateCcw, AlertTriangle, CheckCircle2,
  XCircle, MinusCircle, Info, Printer
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

const LS_KEY = 'qualytree.gmp_self_inspection_v3'

// ── 공식 심사기준표 (2026-46호) ───────────────────────────────────────────
const SECTIONS = [
  {
    id: 's4', clause: '4', label: '품질경영시스템',
    color: '#2563EB',
    items: [
      {
        id: '4.1.1', label: '품질경영시스템 문서화 및 효과성 유지',
        detail: '조직은 이 기준 요구사항과 적용되는 법적 요구사항에 따라 품질경영시스템을 문서화하여야 하며 품질경영시스템의 효과성을 유지하여야 한다.',
        links: [{ label: '품질매뉴얼', path: '/quality-manual' }]
      },
      {
        id: '4.1.2', label: '프로세스 결정 및 위험기반 접근방법 적용',
        detail: '조직은 품질경영시스템에 필요한 프로세스를 결정하고 조직 전반에 적용하며, 위험기반 접근방법을 적용하여 프로세스 순서 및 상호작용을 결정하여야 한다.',
        links: [{ label: '품질계획', path: '/quality-plan' }]
      },
      {
        id: '4.1.3', label: '각 프로세스 운영·모니터링·기록 관리',
        detail: '각 품질경영시스템 프로세스에 대해 기준 및 방법 결정, 자원 보장, 계획된 결과 달성을 위한 조치 실행, 모니터링·측정·분석, 기록 유지를 실행하여야 한다.',
        links: [{ label: '기록관리', path: '/record-master' }]
      },
      {
        id: '4.1.4', label: '품질경영시스템 변경 시 적합성 유지',
        detail: '조직은 이 기준 요구사항과 적용되는 법적 요구사항에 적합하게 품질경영시스템 변경을 계획하고 관리하여야 한다.',
        links: [{ label: '변경관리', path: '/change-control' }]
      },
      {
        id: '4.2.1', label: '문서화 요구사항 — 품질방침·매뉴얼·절차·기록 포함',
        detail: '품질경영시스템 문서화에는 문서화된 품질방침 및 목표, 품질매뉴얼, 이 기준이 요구하는 문서화된 절차 및 기록, 프로세스의 효과적 기획·운영·관리를 위해 필요한 문서들이 포함되어야 한다.',
        links: [{ label: '문서관리', path: '/doc-control' }]
      },
      {
        id: '4.2.2', label: '품질매뉴얼 — 적용범위·절차참조·프로세스 상호작용 포함',
        detail: '조직은 품질경영시스템 적용범위(적용제외 포함), 문서화된 절차 및 참조문서, 프로세스 간 상호작용 기술을 포함한 품질매뉴얼을 문서화하여야 한다.',
        links: [{ label: '품질매뉴얼', path: '/quality-manual' }]
      },
      {
        id: '4.2.3', label: '의료기기파일(제품표준서) — 모델별 작성·유지',
        detail: '각 의료기기 모델 또는 품목에 대해 요구사항 적합성 입증 문서를 포함하거나 참조하는 의료기기파일을 만들어 유지하여야 한다. (제품 사양, 제조·보관·취급 절차, 측정·모니터링 절차 등 포함)',
        links: [{ label: '의료기기파일', path: '/medical-device-file' }]
      },
      {
        id: '4.2.5', label: '기록관리 — 식별·보관·보존기간(제조후 5년·시판후 2년)',
        detail: '기록의 식별, 보관, 보안 및 완전성, 검색, 보존기간(최소 제조일로부터 5년, 시판 후 2년) 및 처리에 필요한 관리방법을 규정한 절차를 문서화하고 개인건강정보 보호 방법을 실행하여야 한다.',
        links: [{ label: '기록관리', path: '/record-master' }]
      },
    ]
  },
  {
    id: 's5', clause: '5', label: '경영책임',
    color: '#7C3AED',
    items: [
      {
        id: '5.1', label: '경영의지 — 품질방침·목표·경영검토·자원 제공',
        detail: '최고 경영자는 품질경영시스템의 개발·실행·효과성 유지를 위한 의지의 증거를 법적·고객 요구사항 충족의 중요성 의사소통, 품질방침·목표 수립, 경영검토 수행, 자원 보장을 통해 제시하여야 한다.',
        links: [{ label: '경영방침', path: '/management-policy' }]
      },
      {
        id: '5.2', label: '고객중심 — 고객·법적 요구사항 결정 및 충족 보장',
        detail: '최고 경영자는 고객 요구사항과 적용되는 법적 요구사항이 결정되고 충족됨을 보장하여야 한다.',
        links: [{ label: '고객요구사항', path: '/customer-req' }]
      },
      {
        id: '5.3', label: '품질방침 — 목적 적절성·준수 의지·목표 수립 틀 제공',
        detail: '품질방침은 조직의 목적에 적절하고, 요구사항 준수 및 품질경영시스템 효과성 유지 의지를 포함하며, 품질목표를 수립하고 검토하기 위한 틀을 제공하여야 한다.',
        links: [{ label: '경영방침', path: '/management-policy' }]
      },
      {
        id: '5.5.2', label: '품질책임자(QMR) 선임 — 문서화·경영진 보고·인식 증진',
        detail: '최고 경영자는 품질경영시스템 프로세스 문서화 보장, 최고 경영진에게 품질경영시스템 효과성 및 개선 필요성 보고, 법적·QMS 요구사항 인식 증진 책임을 갖는 품질책임자를 선임하여야 한다.',
        links: [{ label: '조직책임', path: '/org-responsibility' }]
      },
      {
        id: '5.5.3', label: '내부 의사소통 프로세스 수립',
        detail: '최고 경영자는 조직 내에서 적절한 의사소통 프로세스가 수립되고, 품질경영시스템 효과성에 대하여 의사소통이 이루어지고 있음을 보장하여야 한다.',
        links: []
      },
      {
        id: '5.6.1', label: '경영검토 계획·실시·기록 (정기 주기)',
        detail: '최고 경영자는 문서화된 계획된 주기로 품질경영시스템을 검토하여 지속적인 적합성·적절성·효과성을 보장하여야 하며, 품질방침·목표 변경 필요성 평가를 포함하고 기록을 유지하여야 한다.',
        links: [{ label: '경영검토', path: '/management-review' }]
      },
      {
        id: '5.6.2', label: '경영검토 입력사항 — 피드백·불만·감사·CAPA 등 포함',
        detail: '경영검토 입력사항에는 피드백, 불만처리, 규제당국 보고, 감사, 프로세스/제품 모니터링·측정, 시정조치, 예방조치, 이전 경영검토 후속조치, 변경사항, 개선 권고사항이 포함되어야 한다.',
        links: [{ label: '경영검토', path: '/management-review' }]
      },
    ]
  },
  {
    id: 's6', clause: '6', label: '자원관리',
    color: '#D97706',
    items: [
      {
        id: '6.2', label: '인적자원 — 역량 결정·훈련 제공·효과성 평가·기록',
        detail: '제품 품질에 영향을 미치는 인원에게 필요한 역량을 결정하고, 필요한 훈련을 제공하며, 취해진 조치의 효과성을 평가하고, 교육·훈련·숙련도·경험에 대한 기록을 유지하여야 한다.',
        links: [{ label: '역량관리', path: '/competency' }]
      },
      {
        id: '6.3', label: '기반시설 — 건물·장비·지원서비스 요구사항 문서화·유지보수',
        detail: '제품 요구사항 적합성 확보 및 혼입 방지를 위해 필요한 기반시설(건물, 프로세스 장비, 운송·통신 등 지원서비스) 요구사항을 문서화하고, 유지보수 활동에 대한 요구사항을 문서화하여야 한다.',
        links: [{ label: '인프라관리', path: '/infrastructure' }]
      },
    ]
  },
  {
    id: 's7', clause: '7', label: '제품실현',
    color: '#059669',
    items: [
      {
        id: '7.1', label: '제품실현 기획 — 위험관리·품질목표·검증활동 계획',
        detail: '조직은 제품실현에 필요한 프로세스를 계획·개발하여야 하며, 위험관리 프로세스를 문서화하고, 제품별 품질목표·자원·검증·유효성확인·모니터링·추적 활동을 결정하여야 한다.',
        links: [{ label: '품질계획', path: '/quality-plan' }, { label: '위험관리', path: '/risk' }]
      },
      {
        id: '7.2.1', label: '고객 및 법적 요구사항 결정',
        detail: '조직은 고객이 규정한 요구사항, 이미 알려진 명시된 사용 요구사항, 법적 요구사항, 안전한 사용을 위해 필요한 사용자 훈련, 조직이 결정한 추가 요구사항을 결정하여야 한다.',
        links: [{ label: '고객요구사항', path: '/customer-req' }]
      },
      {
        id: '7.2.2', label: '제품 관련 요구사항 검토 및 기록',
        detail: '제품 공급 전에 요구사항을 검토하여 요구사항이 정의되고 충족 능력이 있음을 확인하여야 하며, 검토 결과 및 후속조치에 대한 기록을 유지하여야 한다.',
        links: [{ label: '고객요구사항', path: '/customer-req' }]
      },
      {
        id: '7.3.2', label: '설계·개발 계획 — 단계·검토·검증·책임·추적성 문서화',
        detail: '설계·개발 계획에 단계, 각 단계별 검토, 검증·유효성확인·설계이관 활동, 책임과 권한, 설계 입력-출력 추적성 방법, 필요 자원을 문서화하여야 한다.',
        links: [{ label: '설계이력파일', path: '/dhf' }]
      },
      {
        id: '7.3.3', label: '설계·개발 입력 — 기능·법적·위험관리 요구사항 기록',
        detail: '제품 요구사항 관련 입력사항(기능·성능·사용적합성·안전, 법적 요구사항 및 표준, 위험관리 출력물, 이전 유사설계 정보)을 결정하고 기록을 유지하여야 한다.',
        links: [{ label: '설계이력파일', path: '/dhf' }, { label: '위험관리', path: '/risk' }]
      },
      {
        id: '7.3.6', label: '설계·개발 검증(Verification) 수행 및 기록',
        detail: '설계·개발 출력이 입력 요구사항을 충족하는지 계획된 방법에 따라 검증을 수행하고, 검증 방법·합격기준·통계기법을 포함한 계획을 문서화하며 결과를 기록하여야 한다.',
        links: [{ label: '설계이력파일', path: '/dhf' }]
      },
      {
        id: '7.3.7', label: '설계·개발 유효성확인(Validation) 수행 및 기록',
        detail: '결과 제품이 의도된 사용 요구사항에 적합함을 보장하기 위해 계획된 방법에 따라 유효성 확인을 수행하고, 방법·합격기준을 포함한 계획을 문서화하며 결과를 기록하여야 한다.',
        links: [{ label: '설계이력파일', path: '/dhf' }]
      },
      {
        id: '7.3.9', label: '설계·개발 변경관리 — 검토·검증·승인·영향 평가',
        detail: '설계·개발 변경을 파악하고 실행 전에 검토·검증·유효성확인·승인을 수행하여야 하며, 구성부품·제품·위험관리 입력/출력·제품실현 프로세스에 대한 영향을 평가하고 기록을 유지하여야 한다.',
        links: [{ label: '변경관리', path: '/change-control' }, { label: '설계이력파일', path: '/dhf' }]
      },
      {
        id: '7.3.10', label: '설계·개발 파일(DHF) — 모델별 유지',
        detail: '각 의료기기 모델에 대한 설계·개발 파일을 유지하여야 하며, 요구사항 적합성 입증 기록과 설계·개발 변경 기록을 포함하거나 참조하여야 한다.',
        links: [{ label: '설계이력파일', path: '/dhf' }]
      },
      {
        id: '7.4.1', label: '구매 프로세스 — 공급자 평가·선정·재평가 절차',
        detail: '구매 제품이 규정된 요구사항에 적합함을 보장하는 절차를 문서화하고, 요구사항 충족 능력을 기준으로 공급자를 평가·선정하며, 재평가 기준을 수립하고 결과를 기록하여야 한다.',
        links: [{ label: '공급업체관리', path: '/supplier' }]
      },
      {
        id: '7.4.3', label: '구매품 검증(수입검사) — 위험 비례 검사 수행 및 기록',
        detail: '구매한 제품이 규정된 요구사항에 적합함을 보장하는 검사를 수립·실행하여야 하며, 검증 범위는 공급자 평가 결과 및 위험에 비례하여야 하고 기록을 유지하여야 한다.',
        links: [{ label: '구매정보·수입검사', path: '/purchase-inspection' }]
      },
      {
        id: '7.5.1', label: '생산관리 — 절차문서·장비 적격성·공정 모니터링',
        detail: '생산 및 서비스 제공이 제품 사양 일치를 보장하도록 계획·실행·모니터링·관리되어야 하며, 생산 관리 절차·방법 문서화, 기반시설 적격성, 공정 매개변수 및 제품 특성 모니터링 등을 포함하여야 한다.',
        links: [{ label: '생산관리', path: '/manufacturing' }]
      },
      {
        id: '7.5.6', label: '생산 프로세스 유효성확인 — 절차·장비·합격기준 문서화',
        detail: '모니터링·측정으로 검증 불가한 생산 프로세스에 대해 유효성을 확인하고, 프로세스 검토·승인 기준, 장비·인원 적격성, 방법·절차·합격기준, 통계기법, 기록 요구사항을 문서화하여야 한다.',
        links: [{ label: '공정유효성확인', path: '/process-validation' }]
      },
      {
        id: '7.5.9', label: '추적성 — 부품·원자재·유통 판매기록 유지',
        detail: '추적관리대상 의료기기는 부품·원자재·작업환경 조건 기록을 포함하여야 하며, 유통서비스 공급자/판매업자의 판매 기록 유지를 요구하고, 출고 인수자 성명·주소 기록을 유지하여야 한다.',
        links: [{ label: '제품추적성', path: '/traceability' }]
      },
      {
        id: '7.5.11', label: '제품 보존 — 가공·보관·취급·유통 중 적합성 유지',
        detail: '조직은 가공, 보관, 취급, 유통 시 제품 적합성을 보존하기 위한 요구사항을 문서화하여야 하며, 해당되는 경우 멸균·청정 요구사항을 포함하여야 한다.',
        links: [{ label: '제품보존취급', path: '/product-preservation' }]
      },
    ]
  },
  {
    id: 's8', clause: '8', label: '측정·분석·개선',
    color: '#DC2626',
    items: [
      {
        id: '8.2.1', label: '고객 피드백 수집·모니터링 — 생산전후 자료 포함 절차',
        detail: '고객 요구사항 충족 여부 정보를 수집·모니터링하고, 획득·활용 방법을 문서화하며, 생산 및 생산 후 활동으로부터 자료를 수집하기 위한 피드백 절차를 문서화하여야 한다.',
        links: [{ label: '고객불만', path: '/complaint' }]
      },
      {
        id: '8.2.2', label: '불만처리 — 법적 요구사항에 따른 적시 처리 절차',
        detail: '조직은 적용되는 법적 요구사항에 따라 적절한 시기에 불만을 처리하는 절차를 문서화하여야 한다.',
        links: [{ label: '고객불만', path: '/complaint' }]
      },
      {
        id: '8.2.4', label: '내부감사 — 계획된 주기·범위·방법·기록',
        detail: '계획된 주기로 내부감사를 수행하는 절차를 문서화하고, 감사 범위·주기·방법·책임을 규정하며, 감사 결과 및 후속조치에 대한 기록을 유지하여야 한다.',
        links: [{ label: '내부심사', path: '/audit' }]
      },
      {
        id: '8.2.6', label: '제품 모니터링·측정 — 합격판정 근거·출하 승인자 기록',
        detail: '제품 요구사항 충족 검증을 위해 제품 특성을 모니터링·측정하고, 합격판정 기준 적합 증거, 출하 승인자 신원, 사용 시험 장비를 기록으로 유지하여야 한다.',
        links: [{ label: '공정·최종검사', path: '/inspection' }]
      },
      {
        id: '8.3', label: '부적합품 관리 — 식별·분리·처리 절차 및 기록',
        detail: '요구사항에 부적합한 제품을 식별하고 의도하지 않은 사용을 방지하기 위해 관리하는 절차를 문서화하고, 처리(재작업·불합격·폐기 등) 및 재검증 결과를 기록하여야 한다.',
        links: [{ label: 'NCR/부적합', path: '/ncr' }]
      },
      {
        id: '8.4', label: '데이터 분석 — 피드백·공급자·감사·경향 등 분석 절차',
        detail: '품질경영시스템 적합성·효과성 입증을 위한 데이터를 결정·수집·분석하는 절차를 문서화하여야 하며, 피드백, 제품 요구사항 적합성, 프로세스/제품 경향, 공급자, 감사, 서비스 보고서를 포함하여야 한다.',
        links: [{ label: '품질KPI대시보드', path: '/quality-dashboard' }]
      },
      {
        id: '8.5.2', label: '시정조치(CA) — 근본원인 분석·조치 실행·효과성 검증',
        detail: '부적합의 원인을 제거하는 시정조치 절차를 문서화하고, 부적합 검토, 원인 결정, 재발 방지 조치 필요성 평가, 필요한 조치 결정·실행·기록, 조치 효과성 검토를 포함하여야 한다.',
        links: [{ label: 'CAPA', path: '/improvement' }]
      },
      {
        id: '8.5.3', label: '예방조치(PA) — 잠재 부적합 원인 결정·조치·효과성 검토',
        detail: '잠재적 부적합의 원인을 제거하는 예방조치 절차를 문서화하고, 잠재 부적합 및 원인 결정, 예방조치 필요성 평가, 필요한 조치 결정·실행·기록, 조치 효과성 검토를 포함하여야 한다.',
        links: [{ label: 'CAPA', path: '/improvement' }]
      },
    ]
  },
]

const GRADE = {
  A: { label: 'A  적절함',   short: 'A', bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-400',  dot: 'bg-green-500'  },
  B: { label: 'B  보완필요', short: 'B', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400', dot: 'bg-yellow-500' },
  C: { label: 'C  부적절함', short: 'C', bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-400',    dot: 'bg-red-500'    },
  D: { label: 'D  해당없음', short: 'D', bg: 'bg-gray-100',   text: 'text-gray-500',   border: 'border-gray-300',   dot: 'bg-gray-400'   },
}

function loadData() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function saveData(d) {
  localStorage.setItem(LS_KEY, JSON.stringify(d))
}

// ── 섹션별 진행률 바 ─────────────────────────────────────────────────────
function SectionBar({ section, grades }) {
  const items = section.items
  const counts = { A: 0, B: 0, C: 0, D: 0, '': 0 }
  items.forEach(it => { const g = grades[it.id] || ''; counts[g]++ })
  const total = items.length
  const rated = total - counts['']
  const pct = Math.round((rated / total) * 100)
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className="w-16 font-medium" style={{ color: section.color }}>§{section.clause}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
        <div className="bg-green-400 h-full transition-all" style={{ width: `${(counts.A / total) * 100}%` }} />
        <div className="bg-yellow-400 h-full transition-all" style={{ width: `${(counts.B / total) * 100}%` }} />
        <div className="bg-red-400 h-full transition-all" style={{ width: `${(counts.C / total) * 100}%` }} />
        <div className="bg-gray-300 h-full transition-all" style={{ width: `${(counts.D / total) * 100}%` }} />
      </div>
      <span className="w-16 text-right">{rated}/{total} 평가됨</span>
      {counts.B > 0 && <span className="text-yellow-600 font-medium">B×{counts.B}</span>}
      {counts.C > 0 && <span className="text-red-600 font-medium">C×{counts.C}</span>}
    </div>
  )
}

// ── 단일 항목 행 ──────────────────────────────────────────────────────────
function ItemRow({ item, grade, note, onGrade, onNote, sectionColor }) {
  const [open, setOpen] = useState(false)
  const [editNote, setEditNote] = useState(false)
  const navigate = useNavigate()
  const g = GRADE[grade] || null

  return (
    <div className={`border rounded-lg mb-2 transition-all ${grade === 'B' ? 'border-yellow-300 bg-yellow-50' : grade === 'C' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      {/* 헤더 행 */}
      <div className="flex items-start gap-3 p-3">
        {/* 조항 번호 */}
        <span className="flex-none mt-0.5 text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: sectionColor + '18', color: sectionColor }}>
          §{item.id}
        </span>
        {/* 레이블 + 아코디언 토글 */}
        <button className="flex-1 text-left text-sm font-medium text-gray-800 leading-snug hover:text-gray-900" onClick={() => setOpen(p => !p)}>
          {item.label}
          <span className="ml-1 text-gray-400">{open ? '▲' : '▼'}</span>
        </button>
        {/* A/B/C/D 버튼 */}
        <div className="flex-none flex gap-1">
          {Object.entries(GRADE).map(([k, v]) => (
            <button
              key={k}
              onClick={() => onGrade(grade === k ? null : k)}
              className={`w-8 h-8 rounded text-xs font-bold border-2 transition-all ${
                grade === k ? `${v.bg} ${v.text} ${v.border}` : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
              }`}
            >{v.short}</button>
          ))}
        </div>
      </div>

      {/* 아코디언 펼치면: 원문 + 관련문서 + 비고 */}
      {open && (
        <div className="px-4 pb-3 border-t border-gray-100 pt-3 space-y-3">
          {/* 원문 */}
          <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-2 rounded">
            📋 <span className="font-medium">심사기준 원문:</span> {item.detail}
          </p>
          {/* 관련 허브 바로가기 */}
          {item.links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 self-center">관련 문서:</span>
              {item.links.map(lk => (
                <button
                  key={lk.path}
                  onClick={() => navigate(lk.path)}
                  className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <ExternalLink size={10} />
                  {lk.label}
                </button>
              ))}
            </div>
          )}
          {/* 비고/메모 */}
          <div>
            {editNote ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  className="flex-1 text-xs border rounded px-2 py-1"
                  defaultValue={note || ''}
                  onBlur={e => { onNote(e.target.value); setEditNote(false) }}
                  onKeyDown={e => { if (e.key === 'Enter') { onNote(e.target.value); setEditNote(false) } }}
                  placeholder="보완 사항 또는 메모 입력..."
                />
              </div>
            ) : (
              <button
                onClick={() => setEditNote(true)}
                className={`text-xs px-2 py-1 rounded border ${note ? 'border-yellow-300 bg-yellow-50 text-yellow-800' : 'border-dashed border-gray-300 text-gray-400 hover:border-gray-400'}`}
              >
                {note || '＋ 비고 추가'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export default function GmpSelfInspectionHub() {
  const navigate = useNavigate()
  const [data, setData] = useState(loadData)
  const [activeSection, setActiveSection] = useState('s4')
  const [saved, setSaved] = useState(false)

  const grades = data.grades || {}
  const notes  = data.notes  || {}

  const allItems = SECTIONS.flatMap(s => s.items)
  const stats = useMemo(() => {
    const c = { A: 0, B: 0, C: 0, D: 0, total: allItems.length, rated: 0 }
    allItems.forEach(it => {
      const g = grades[it.id]
      if (g) { c[g]++; c.rated++ }
    })
    c.readiness = c.total > 0 ? Math.round((c.A / c.total) * 100) : 0
    return c
  }, [grades])

  function setGrade(itemId, g) {
    const next = { ...data, grades: { ...(data.grades || {}), [itemId]: g } }
    if (g === null) delete next.grades[itemId]
    next.lastUpdated = new Date().toISOString().slice(0, 10)
    setData(next); saveData(next); setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }
  function setNote(itemId, txt) {
    const next = { ...data, notes: { ...(data.notes || {}), [itemId]: txt } }
    if (!txt) delete next.notes[itemId]
    setData(next); saveData(next)
  }
  function handleReset() {
    if (!window.confirm('모든 자가점검 결과를 초기화할까요?')) return
    setData({}); saveData({})
  }

  const section = SECTIONS.find(s => s.id === activeSection)

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#16A34A22' }}>
            <ClipboardList size={22} color="#16A34A" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">GMP 심사 자가점검</h1>
            <p className="text-sm text-gray-500">의료기기 제조 및 품질관리 기준 심사기준표 기반 (2026-46호)</p>
          </div>
          <div className="ml-auto flex gap-2">
            {saved && <span className="text-xs text-green-600 self-center">✓ 저장됨</span>}
            <button onClick={handleReset} className="text-xs px-3 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 flex items-center gap-1">
              <RotateCcw size={12} /> 초기화
            </button>
            <button onClick={() => window.print()} className="text-xs px-3 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 flex items-center gap-1">
              <Printer size={12} /> 출력
            </button>
          </div>
        </div>

        {/* 종합 현황 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="col-span-2 md:col-span-1 bg-white border rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-gray-900">{stats.readiness}<span className="text-lg text-gray-400">%</span></div>
            <div className="text-xs text-gray-500 mt-1">심사 준비도<br/><span className="text-gray-400">(A항목 기준)</span></div>
          </div>
          {[
            { k: 'A', label: '적절함',   color: 'text-green-600',  bg: 'bg-green-50'  },
            { k: 'B', label: '보완필요', color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { k: 'C', label: '부적절함', color: 'text-red-600',    bg: 'bg-red-50'    },
            { k: 'rated', label: '평가 완료', color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(({ k, label, color, bg }) => (
            <div key={k} className={`${bg} border rounded-xl p-4 text-center`}>
              <div className={`text-2xl font-bold ${color}`}>{stats[k]}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* 섹션별 진행률 */}
        <div className="bg-white border rounded-xl p-4 mb-6 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><BarChart2 size={15} /> 섹션별 현황</h2>
          {SECTIONS.map(s => <SectionBar key={s.id} section={s} grades={grades} />)}
        </div>

        {/* 섹션 탭 */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {SECTIONS.map(s => {
            const sItems = s.items
            const bCount = sItems.filter(it => grades[it.id] === 'B').length
            const cCount = sItems.filter(it => grades[it.id] === 'C').length
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeSection === s.id ? 'text-white shadow-sm' : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
                style={activeSection === s.id ? { backgroundColor: s.color } : {}}
              >
                §{s.clause} {s.label}
                {(bCount > 0 || cCount > 0) && (
                  <span className="ml-1.5 text-xs opacity-80">
                    {cCount > 0 && `⚠${cCount}`}{bCount > 0 && `△${bCount}`}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 항목 목록 */}
        {section && (
          <div className="bg-white border rounded-xl p-4">
            <h2 className="text-base font-semibold text-gray-800 mb-4" style={{ color: section.color }}>
              §{section.clause} {section.label}
              <span className="ml-2 text-sm font-normal text-gray-400">{section.items.length}개 항목</span>
            </h2>
            {/* 판정 기준 안내 */}
            <div className="flex gap-3 mb-4 text-xs text-gray-500 bg-gray-50 rounded p-2 flex-wrap">
              <span className="font-medium text-gray-600">판정기준:</span>
              <span className="text-green-700">A 적절함 — 요구사항 준수 인정</span>
              <span className="text-yellow-700">B 보완필요 — 미이행 또는 입증근거 미흡</span>
              <span className="text-red-700">C 부적절함 — 보완 미조치 또는 법령 위반</span>
              <span className="text-gray-500">D 해당없음</span>
            </div>
            {section.items.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                grade={grades[item.id] || null}
                note={notes[item.id] || ''}
                onGrade={g => setGrade(item.id, g)}
                onNote={t => setNote(item.id, t)}
                sectionColor={section.color}
              />
            ))}
          </div>
        )}

        {/* 최종 판정 안내 */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
          <p className="font-semibold mb-1">📌 공식 판정기준 (2026-46호 부칙)</p>
          <p>✅ <strong>적ݕ�:</strong> 모든 항목 A — 또는 4.1~6.3(4.2.3 제외), 8.2.4 항목에서 B가 있으나 직전 심사 동일항목 B/C 없는 경우</p>
          <p>🔄 <strong>보완:</strong> 일부 항목 B (C 없음)</p>
          <p>❌ <strong>부적합:</strong> C 항목 있는 경우</p>
        </div>
      </div>
    </AppLayout>
  )
}
