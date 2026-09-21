import React, { useState } from 'react'
import AppLayout from '../../components/AppLayout'

const LS_KEY = 'qualytree.qms_scope'
function loadScope() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') } catch { return null }
}
const DEFAULT_SCOPE = {
  org: '',
  products: '',
  sites: '',
  exclusions: '§7.3 설계·개발 (해당없음 시 제외 가능)',
  standard: 'ISO 13485:2016, 의료기기 제조 및 품질관리 기준(KGMP)',
  certBody: '',
  version: '1.0',
  revised: ''
}

const PROCESSES = [
  { id: 'mgmt', label: '경영 책임', color: '#1e40af', items: ['품질방침·목표', '경영검토', '자원 배분', '의사소통'] },
  { id: 'resource', label: '자원 관리', color: '#0369a1', items: ['인원·역량', '인프라', '작업환경', '공급업체'] },
  { id: 'realization', label: '제품 실현', color: '#065f46', items: ['설계·개발', '구매·수입검사', '생산·서비스', '검사·출하'] },
  { id: 'measurement', label: '측정·분석·개선', color: '#7c2d12', items: ['내부심사', 'CAPA', '고객만족', '데이터 분석'] },
]

export default function ProcessDiagramHub() {
  const [tab, setTab] = useState('diagram')
  const [scope, setScope] = useState(() => loadScope() || DEFAULT_SCOPE)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(scope)

  function saveScope() {
    localStorage.setItem(LS_KEY, JSON.stringify(draft))
    setScope(draft)
    setEditing(false)
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">QMS 범위 및 프로세스 상호작용</h1>
          <p className="text-sm text-gray-500 mt-1">ISO 13485 §4.1 — 품질경영시스템 적용 범위 정의 및 프로세스 상호작용 다이어그램</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {[{ k:'diagram', label:'프로세스 상호작용 다이어그램' }, { k:'scope', label:'QMS 적용 범위' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={'px-4 py-2 text-sm font-medium border-b-2 -mb-px ' + (tab === t.k ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 다이어그램 탭 */}
        {tab === 'diagram' && (
          <div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <svg viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg" className="w-full">
                {/* Background */}
                <rect x="0" y="0" width="800" height="520" fill="#f8fafc" rx="12"/>

                {/* Title */}
                <text x="400" y="34" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#1e293b">ISO 13485 QMS 프로세스 상호작용 모델</text>

                {/* Customer left */}
                <rect x="20" y="190" width="80" height="120" fill="#dbeafe" rx="8" stroke="#3b82f6" strokeWidth="1.5"/>
                <text x="60" y="244" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1e40af">고객</text>
                <text x="60" y="260" textAnchor="middle" fontSize="10" fill="#1e40af">요구사항</text>
                <text x="60" y="278" textAnchor="middle" fontSize="10" fill="#1e40af">및 기대</text>
                <path d="M100 250 L130 250" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow)"/>

                {/* Customer right */}
                <rect x="700" y="190" width="80" height="120" fill="#dcfce7" rx="8" stroke="#16a34a" strokeWidth="1.5"/>
                <text x="740" y="244" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#15803d">고객</text>
                <text x="740" y="260" textAnchor="middle" fontSize="10" fill="#15803d">만족도</text>
                <path d="M670 250 L700 250" stroke="#16a34a" strokeWidth="2" markerEnd="url(#arrowGreen)"/>

                {/* Arrow defs */}
                <defs>
                  <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#3b82f6"/>
                  </marker>
                  <marker id="arrowGreen" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#16a34a"/>
                  </marker>
                  <marker id="arrowGray" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#64748b"/>
                  </marker>
                </defs>

                {/* Management box (top) */}
                <rect x="130" y="55" width="540" height="80" fill="#eff6ff" rx="8" stroke="#1e40af" strokeWidth="1.5" strokeDasharray="6,3"/>
                <text x="400" y="84" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1e40af">경영 책임 (Management Responsibility)</text>
                <text x="400" y="102" textAnchor="middle" fontSize="10" fill="#3b82f6">품질방침·목표 수립  |  경영검토  |  의사소통  |  자원 배분</text>
                <text x="400" y="120" textAnchor="middle" fontSize="10" fill="#3b82f6">고객중심  |  법적 요건 준수  |  리스크 기반 사고</text>

                {/* Resource box (left inner) */}
                <rect x="130" y="175" width="150" height="170" fill="#f0f9ff" rx="8" stroke="#0369a1" strokeWidth="1.5"/>
                <text x="205" y="205" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0369a1">자원 관리</text>
                <text x="205" y="222" textAnchor="middle" fontSize="9.5" fill="#0369a1">(Resource Management)</text>
                <line x1="145" y1="232" x2="265" y2="232" stroke="#bae6fd" strokeWidth="1"/>
                {['인원 및 역량 관리', '인프라 관리', '작업환경 관리', '공급업체 관리', '교육·훈련'].map((t,i) => (
                  <text key={i} x="205" y={250 + i*22} textAnchor="middle" fontSize="9" fill="#0c4a6e">• {t}</text>
                ))}

                {/* Product realization (center) */}
                <rect x="300" y="175" width="210" height="170" fill="#f0fdf4" rx="8" stroke="#16a34a" strokeWidth="2"/>
                <text x="405" y="205" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#15803d">제품 실현 프로세스</text>
                <text x="405" y="220" textAnchor="middle" fontSize="9.5" fill="#16a34a">(Product Realization)</text>
                <line x1="315" y1="230" x2="495" y2="230" stroke="#bbf7d0" strokeWidth="1"/>
                {['설계·개발 관리', '구매·수입 검사', '생산 및 서비스 제공', '공정·최종 검사', '식별 및 추적성', '출하 승인'].map((t,i) => (
                  <text key={i} x="405" y={246 + i*19} textAnchor="middle" fontSize="9" fill="#14532d">• {t}</text>
                ))}

                {/* Measurement box (right inner) */}
                <rect x="530" y="175" width="140" height="170" fill="#fff7ed" rx="8" stroke="#c2410c" strokeWidth="1.5"/>
                <text x="600" y="205" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#9a3412">측정·분석·개선</text>
                <text x="600" y="220" textAnchor="middle" fontSize="9.5" fill="#c2410c">(Measurement)</text>
                <line x1="545" y1="230" x2="655" y2="230" stroke="#fed7aa" strokeWidth="1"/>
                {['내부심사', 'CAPA·개선', '고객만족 모니터링', '데이터 분석', '부적합 관리'].map((t,i) => (
                  <text key={i} x="600" y={248 + i*22} textAnchor="middle" fontSize="9" fill="#7c2d12">• {t}</text>
                ))}

                {/* Horizontal arrows between boxes */}
                <path d="M280 250 L300 250" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrowGray)"/>
                <path d="M510 250 L530 250" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrowGray)"/>

                {/* Vertical arrows: management <-> others */}
                <path d="M205 175 L205 135" stroke="#64748b" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowGray)"/>
                <path d="M405 175 L405 135" stroke="#64748b" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowGray)"/>
                <path d="M600 175 L600 135" stroke="#64748b" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowGray)"/>

                {/* Support/Doc box (bottom) */}
                <rect x="130" y="375" width="540" height="75" fill="#faf5ff" rx="8" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="6,3"/>
                <text x="400" y="400" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#6d28d9">문서화 요건 및 지원 시스템</text>
                <text x="400" y="418" textAnchor="middle" fontSize="10" fill="#7c3aed">품질매뉴얼  |  절차서(SOP)  |  작업표준  |  기록  |  의료기기 파일(DMR)  |  설계이력파일(DHF)</text>
                <text x="400" y="436" textAnchor="middle" fontSize="10" fill="#7c3aed">문서 관리  |  기록 관리  |  변경 관리  |  전자서명</text>

                {/* Arrows: bottom to main */}
                <path d="M205 375 L205 345" stroke="#7c3aed" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowGray)"/>
                <path d="M405 375 L405 345" stroke="#7c3aed" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowGray)"/>
                <path d="M600 375 L600 345" stroke="#7c3aed" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowGray)"/>

                {/* Continuous improvement arc label */}
                <text x="400" y="480" textAnchor="middle" fontSize="10" fill="#64748b" fontStyle="italic">↻ 지속적 개선 (Continual Improvement)</text>
                <path d="M180 470 Q400 500 620 470" stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeDasharray="5,4"/>

                {/* ISO Ref */}
                <text x="400" y="510" textAnchor="middle" fontSize="9" fill="#94a3b8">ISO 13485:2016 §4.1 — 품질경영시스템 일반 요구사항</text>
              </svg>
            </div>

            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { color: '#eff6ff', border: '#1e40af', label: '경영 책임', desc: '최고경영자 주도, 품질방침 수립' },
                { color: '#f0f9ff', border: '#0369a1', label: '자원 관리', desc: '인원·인프라·환경 제공' },
                { color: '#f0fdf4', border: '#16a34a', label: '제품 실현', desc: '설계부터 출하까지 핵심 프로세스' },
                { color: '#fff7ed', border: '#c2410c', label: '측정·분석', desc: '성과 모니터링 및 지속 개선' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2 p-2 rounded-lg border" style={{ backgroundColor: item.color, borderColor: item.border }}>
                  <div className="w-3 h-3 rounded mt-0.5 flex-shrink-0" style={{ backgroundColor: item.border }}></div>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: item.border }}>{item.label}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QMS 적용 범위 탭 */}
        {tab === 'scope' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-800">QMS 적용 범위 정의</h2>
              {!editing ? (
                <button onClick={() => { setDraft(scope); setEditing(true) }}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">편집</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">취소</button>
                  <button onClick={saveScope} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">저장</button>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
              {[
                { key: 'org', label: '조직명', placeholder: '회사명 및 사업장 정보' },
                { key: 'products', label: '적용 제품·서비스 범위', placeholder: '예: 의료기기 (클래스 I·II) 제조 및 판매' },
                { key: 'sites', label: '적용 사업장', placeholder: '예: 본사(서울시 ○○구 ○○로), 공장(경기도 ○○시)' },
                { key: 'standard', label: '적용 표준', placeholder: 'ISO 13485:2016, KGMP' },
                { key: 'certBody', label: '인증기관', placeholder: '예: SGS Korea, KR (한국선급)' },
                { key: 'exclusions', label: '적용 제외 조항 (§7.3 등)', placeholder: '§7.3 설계·개발 — 해당 공정 없음 시 제외 기재' },
                { key: 'version', label: '문서 버전', placeholder: '1.0' },
                { key: 'revised', label: '개정일', placeholder: '2026-01-01' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                  {editing ? (
                    f.key === 'products' || f.key === 'exclusions' || f.key === 'sites' ? (
                      <textarea value={draft[f.key]} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                        rows={3} placeholder={f.placeholder}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                    ) : (
                      <input value={draft[f.key]} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                    )
                  ) : (
                    <div className="text-sm text-gray-800 bg-gray-50 rounded-md px-3 py-2 min-h-8 whitespace-pre-wrap">
                      {scope[f.key] || <span className="text-gray-400">{f.placeholder}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
