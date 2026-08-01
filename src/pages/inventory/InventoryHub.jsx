// src/pages/inventory/InventoryHub.jsx
// 재고·출고관리 — ISO 13485 §7.5.11 출하 전 점검 · 완제품 재고 조회 · 배포이력 · 현황분석
import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, X, Save, Edit2, Trash2, Package, ClipboardList,
  Printer, Truck, Boxes, ArrowUpRight,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { printPreservationCheckCert } from '../../lib/pdfPrint'
import { onboarding } from '../../lib/onboardingState'

// ── 상수 ─────────────────────────────────────────────────────
const LS_LOTS   = 'qualytree.preservation_lots'    // 제품보존·취급에서 관리하는 LOT 재고 (읽기 전용 참조)
const LS_CHECKS = 'qualytree.preservation_checks'  // 출하 전 점검 기록 (이 화면에서 관리)
const LS_FIN    = 'qms_pur_fin'                    // 구매·자재 완제품재고 (읽기 전용 참조)

const CHECK_VERDICTS = {
  pass:    { label: '적합',   color: '#059669', bg: '#D1FAE5' },
  fail:    { label: '부적합', color: '#DC2626', bg: '#FEE2E2' },
  pending: { label: '점검 중', color: '#D97706', bg: '#FEF3C7' },
}

const LOT_STATUSES = {
  in_stock:   { label: '재고',   color: '#2563EB', bg: '#EFF6FF' },
  quarantine: { label: '격리',   color: '#D97706', bg: '#FEF3C7' },
  released:   { label: '출하',   color: '#059669', bg: '#D1FAE5' },
  expired:    { label: '만료',   color: '#DC2626', bg: '#FEE2E2' },
  disposed:   { label: '폐기',   color: '#9CA3AF', bg: '#F3F4F6' },
}

const DEFAULT_CHECK_ITEMS = [
  '포장 외관 이상 없음 (찢김·오염·파손)',
  '라벨 정보 정확 (품목명·LOT·유효기간)',
  '보존 조건 부합 여부 확인',
  '유효기간 30일 이상 잔여',
  '멸균 인디케이터 정상 (해당 시)',
  '수량 일치 확인',
]

function chkId()   { return `PCK-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function todayStr(){ return new Date().toISOString().slice(0, 10) }
function daysDiff(d){ return d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null }
function monthKey(d){ return d ? String(d).slice(0, 7) : null }

const EMPTY_CHECK = {
  lotId: '', productName: '', lotNo: '', qty: '', destinationCustomer: '',
  checkedBy: '', checkedDate: todayStr(),
  checkItems: DEFAULT_CHECK_ITEMS.map(name => ({ name, result: null })),
  verdict: 'pending', notes: '', linkedDistId: '',
}

/* 영업(고객사 관리)에 등록된 고객명 — 다른 화면과 동일하게 검색·선택할 수 있도록 재사용 */
function salesCustomerNames() {
  try {
    const raw = localStorage.getItem('qms_sal_customers')
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list.map(c => c.name).filter(Boolean) : []
  } catch { return [] }
}

// ── 메인 ─────────────────────────────────────────────────────
export default function InventoryHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2
  const nav = useNavigate()

  const [checks, setChecks] = useState(() => { try { return JSON.parse(localStorage.getItem(LS_CHECKS) || '[]') } catch { return [] } })
  const lots = useMemo(() => { try { return JSON.parse(localStorage.getItem(LS_LOTS) || '[]') } catch { return [] } }, [])
  const fin  = useMemo(() => { try { return JSON.parse(localStorage.getItem(LS_FIN)  || '[]') } catch { return [] } }, [])

  const [tab, setTab] = useState('fin')   // fin | checks | dist | analysis

  const [showChkForm, setShowChkForm] = useState(false)
  const [chkForm, setChkForm] = useState(EMPTY_CHECK)
  const [editChkId, setEditChkId] = useState(null)
  const [certChk, setCertChk] = useState(null)

  function saveChecks(l) { setChecks(l); localStorage.setItem(LS_CHECKS, JSON.stringify(l)) }

  function submitChk() {
    if (!chkForm.lotId) return alert('점검할 LOT을 선택하세요.')
    const passCount = chkForm.checkItems.filter(i => i.result === 'pass').length
    const failCount = chkForm.checkItems.filter(i => i.result === 'fail').length
    const verdict = failCount > 0 ? 'fail' : passCount === chkForm.checkItems.length ? 'pass' : 'pending'
    const next = editChkId
      ? checks.map(c => c.id === editChkId ? { ...c, ...chkForm, verdict } : c)
      : [{ id: chkId(), createdAt: todayStr(), ...chkForm, verdict }, ...checks]
    saveChecks(next)
    setShowChkForm(false); setChkForm(EMPTY_CHECK); setEditChkId(null)
  }

  function toggleCheckItem(idx, result) {
    setChkForm(f => {
      const items = [...f.checkItems]
      items[idx] = { ...items[idx], result: items[idx].result === result ? null : result }
      return { ...f, checkItems: items }
    })
  }

  // ── 배포이력: 별도 입력 없이 출하 전 점검 '적합' 판정 건에서 자동 파생 (목록만 제공) ──
  const distLog = useMemo(() => checks.filter(c => c.verdict === 'pass').sort((a, b) => (b.checkedDate || '').localeCompare(a.checkedDate || '')), [checks])

  // ── 현황분석 ─────────────────────────────────────────────
  const analysis = useMemo(() => {
    const byProduct = {}
    lots.forEach(l => {
      const key = l.productName || '(제품명 없음)'
      if (!byProduct[key]) byProduct[key] = { productName: key, in_stock: 0, quarantine: 0, released: 0, expired: 0, disposed: 0, total: 0 }
      const qty = Number(l.qty) || 0
      byProduct[key][l.status] = (byProduct[key][l.status] || 0) + qty
      byProduct[key].total += qty
    })
    const quarantineLots = lots.filter(l => l.status === 'quarantine')
    const expiredLots    = lots.filter(l => { const d = daysDiff(l.expiryDate); return (d !== null && d < 0) || l.status === 'expired' })
    const disposedLots   = lots.filter(l => l.status === 'disposed')
    const byMonth = {}
    distLog.forEach(c => {
      const m = monthKey(c.checkedDate)
      if (!m) return
      if (!byMonth[m]) byMonth[m] = { month: m, count: 0, qty: 0 }
      byMonth[m].count += 1
      byMonth[m].qty += Number(c.qty) || 0
    })
    const monthlyShipment = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month))
    return { byProduct: Object.values(byProduct), quarantineLots, expiredLots, disposedLots, monthlyShipment }
  }, [lots, distLog])

  const shortFin = fin.filter(f => Number(f.stock) < Number(f.min)).length

  const openNewChk = () => { setChkForm({ ...EMPTY_CHECK, checkedBy: user?.name || '' }); setEditChkId(null); setShowChkForm(true) }

  return (
    <AppLayout user={user} title="재고·출고관리" subtitle="완제품 재고 · 출하 전 점검 · 배포이력 · 현황분석">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        <HubBanner
          title="재고·출고관리"
          subtitle="완제품 재고 조회 · 출하 전 점검 · 배포이력 · 현황분석"
          icon={Boxes}
          color="#0EA5E9"
          workflow={['완제품 재고 확인', '출하 전 점검', '배포(출고)', '현황 분석']}
        />

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Kpi label="완제품 품목" value={fin.length} />
          <Kpi label="재고 부족 품목" value={shortFin} warn={shortFin > 0} />
          <Kpi label="이번 배포(적합) 건" value={distLog.length} />
          <Kpi label="격리 재고 LOT" value={analysis.quarantineLots.length} warn={analysis.quarantineLots.length > 0} />
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'fin',      label: `완제품 재고 (${fin.length})` },
            { key: 'checks',   label: `출하 전 점검 (${checks.length})` },
            { key: 'dist',     label: `배포이력 (${distLog.length})` },
            { key: 'analysis', label: '현황 분석' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                border: 'none', cursor: 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 완제품 재고 탭 (구매·자재 데이터 조회 전용) ── */}
        {tab === 'fin' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>구매·자재에서 관리하는 완제품 재고를 조회합니다. 입력·수정은 구매·자재 화면에서 진행하세요.</div>
              <button onClick={() => nav('/purchase?tab=fin')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-bold"
                style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
                구매·자재에서 관리 <ArrowUpRight size={13} />
              </button>
            </div>
            {fin.length === 0 ? (
              <Empty icon={Package} text="등록된 완제품 재고가 없습니다." />
            ) : (
              <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--line)' }}>
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr style={{ background: 'var(--bg-soft)' }}>
                      {['품목', '재고', '안전재고', 'LOT', '유효기간', 'UDI', '상태'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fin.map(f => {
                      const low = Number(f.stock) < Number(f.min)
                      return (
                        <tr key={f.id} style={{ borderTop: '1px solid var(--line)', background: low ? '#FEF2F2' : 'transparent' }}>
                          <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }}>{f.name}</td>
                          <td className="px-3 py-2" style={{ color: low ? '#DC2626' : 'var(--ink)', fontWeight: low ? 700 : 400 }}>{f.stock} {f.unit}{low && ' ⚠'}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--ink-faint)' }}>{f.min} {f.unit}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--ink-faint)' }}>{f.lot}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--ink-faint)' }}>{f.expiry}</td>
                          <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink-faint)' }}>{f.udi}</td>
                          <td className="px-3 py-2">{f.status}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 출하 전 점검 탭 ── */}
        {tab === 'checks' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>출하·사용 전 보존 상태 점검 기록</div>
              {canEdit && (
                <button onClick={openNewChk}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 점검 기록 등록
                </button>
              )}
            </div>

            {showChkForm && (
              <CheckForm form={chkForm} setForm={setChkForm} lots={lots} onSave={submitChk}
                onCancel={() => { setShowChkForm(false); setChkForm(EMPTY_CHECK); setEditChkId(null) }}
                isEdit={!!editChkId} toggleItem={toggleCheckItem} />
            )}

            {checks.length === 0 ? (
              <Empty icon={ClipboardList} text="출하 전 점검 기록이 없습니다." />
            ) : (
              <div className="space-y-3">
                {checks.map(chk => {
                  const vm = CHECK_VERDICTS[chk.verdict] || CHECK_VERDICTS.pending
                  const passCount = chk.checkItems.filter(i => i.result === 'pass').length
                  const failCount = chk.checkItems.filter(i => i.result === 'fail').length
                  return (
                    <div key={chk.id} onClick={() => setCertChk(chk)} className="p-4 rounded-2xl cursor-pointer" style={{ background: 'var(--bg-card)', border: `1.5px solid ${chk.verdict === 'fail' ? '#FECACA' : 'var(--line)'}` }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{chk.id}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: vm.bg, color: vm.color }}>{vm.label}</span>
                          </div>
                          <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{chk.productName}</div>
                          <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                            LOT: {chk.lotNo || '-'} · 수량: {chk.qty || '-'} · 고객: {chk.destinationCustomer || '-'}
                          </div>
                          <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                            점검일: {chk.checkedDate} · 점검자: {chk.checkedBy || '-'}
                          </div>
                          <div className="flex gap-2 mt-1 text-[11px]">
                            <span style={{ color: '#059669' }}>적합 {passCount}항목</span>
                            {failCount > 0 && <span style={{ color: '#DC2626' }}>부적합 {failCount}항목</span>}
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setChkForm({ ...EMPTY_CHECK, ...chk }); setEditChkId(chk.id); setShowChkForm(true) }}
                              className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                              <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                            </button>
                            <button onClick={() => saveChecks(checks.filter(c => c.id !== chk.id))}
                              className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                              <Trash2 size={12} style={{ color: '#DC2626' }} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {certChk && (
              <CertModal title="출하 전 점검 성적서" onClose={() => setCertChk(null)}>
                <PreservationCheckCertificate chk={certChk} onClose={() => setCertChk(null)} />
              </CertModal>
            )}
          </div>
        )}

        {/* ── 배포이력 탭 (자동 파생 — 별도 입력 없음) ── */}
        {tab === 'dist' && (
          <div>
            <div className="mb-4 text-[12.5px] px-3 py-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
              ℹ 출하 전 점검에서 "적합" 판정된 건이 배포이력으로 자동 등록됩니다. 별도 수기 입력은 지원하지 않습니다.
            </div>
            {distLog.length === 0 ? (
              <Empty icon={Truck} text="배포 이력이 없습니다." />
            ) : (
              <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--line)' }}>
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr style={{ background: 'var(--bg-soft)' }}>
                      {['배포일', '제품명', 'LOT', '수량', '출하처 고객', '연결 추적성 ID', '점검기록'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {distLog.map(c => (
                      <tr key={c.id} style={{ borderTop: '1px solid var(--line)' }}>
                        <td className="px-3 py-2" style={{ color: 'var(--ink)' }}>{c.checkedDate}</td>
                        <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }}>{c.productName}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--ink-faint)' }}>{c.lotNo || '-'}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--ink-faint)' }}>{c.qty || '-'}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--ink-faint)' }}>{c.destinationCustomer || '-'}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--ink-faint)' }}>{c.linkedDistId || '-'}</td>
                        <td className="px-3 py-2 font-mono" style={{ color: '#7C3AED', cursor: 'pointer' }} onClick={() => setCertChk(c)}>{c.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {certChk && tab === 'dist' && (
              <CertModal title="출하 전 점검 성적서" onClose={() => setCertChk(null)}>
                <PreservationCheckCertificate chk={certChk} onClose={() => setCertChk(null)} />
              </CertModal>
            )}
          </div>
        )}

        {/* ── 현황 분석 탭 ── */}
        {tab === 'analysis' && (
          <div className="space-y-5">
            <div>
              <div className="text-[13px] font-bold mb-2" style={{ color: 'var(--ink)' }}>제품별 재고</div>
              {analysis.byProduct.length === 0 ? (
                <Empty icon={Boxes} text="LOT 재고 데이터가 없습니다." />
              ) : (
                <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--line)' }}>
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr style={{ background: 'var(--bg-soft)' }}>
                        {['제품명', '재고', '격리', '출하', '만료', '폐기', '합계'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.byProduct.map(p => (
                        <tr key={p.productName} style={{ borderTop: '1px solid var(--line)' }}>
                          <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }}>{p.productName}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--ink)' }}>{p.in_stock || 0}</td>
                          <td className="px-3 py-2" style={{ color: p.quarantine ? '#D97706' : 'var(--ink-faint)' }}>{p.quarantine || 0}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--ink-faint)' }}>{p.released || 0}</td>
                          <td className="px-3 py-2" style={{ color: p.expired ? '#DC2626' : 'var(--ink-faint)' }}>{p.expired || 0}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--ink-faint)' }}>{p.disposed || 0}</td>
                          <td className="px-3 py-2 font-bold" style={{ color: 'var(--ink)' }}>{p.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <div className="text-[13px] font-bold mb-2" style={{ color: 'var(--ink)' }}>월별 배포(출하) 현황</div>
              {analysis.monthlyShipment.length === 0 ? (
                <Empty icon={Truck} text="배포 이력이 없습니다." />
              ) : (
                <div className="flex items-end gap-3 p-4 rounded-2xl overflow-x-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', minHeight: 140 }}>
                  {analysis.monthlyShipment.map(m => {
                    const max = Math.max(...analysis.monthlyShipment.map(x => x.count), 1)
                    const h = Math.max(8, Math.round((m.count / max) * 100))
                    return (
                      <div key={m.month} className="flex flex-col items-center gap-1" style={{ minWidth: 48 }}>
                        <div className="text-[11px] font-bold" style={{ color: 'var(--ink)' }}>{m.count}건</div>
                        <div style={{ width: 28, height: h, background: 'var(--moss)', borderRadius: 6 }} />
                        <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{m.month}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {analysis.quarantineLots.length > 0 && (
              <AlertSection color="#D97706" title={`전체 격리현황 (${analysis.quarantineLots.length}건)`} bg="#FFFBEB" border="#FDE68A">
                {analysis.quarantineLots.map(l => (
                  <div key={l.id} className="text-[12px] py-1" style={{ color: '#78350F' }}>• {l.lotNo || l.id} — {l.productName} · 수량 {l.qty || '-'}</div>
                ))}
              </AlertSection>
            )}

            {analysis.expiredLots.length > 0 && (
              <AlertSection color="#DC2626" title={`유효기간 만료현황 (${analysis.expiredLots.length}건)`} bg="#FEF2F2" border="#FECACA">
                {analysis.expiredLots.map(l => (
                  <div key={l.id} className="text-[12px] py-1" style={{ color: '#7F1D1D' }}>• {l.lotNo || l.id} — {l.productName} (만료: {l.expiryDate || '-'})</div>
                ))}
              </AlertSection>
            )}

            {analysis.disposedLots.length > 0 && (
              <AlertSection color="#6B7280" title={`전체 폐기현황 (${analysis.disposedLots.length}건)`} bg="#F9FAFB" border="#E5E7EB">
                {analysis.disposedLots.map(l => (
                  <div key={l.id} className="text-[12px] py-1" style={{ color: '#374151' }}>• {l.lotNo || l.id} — {l.productName} · 수량 {l.qty || '-'}</div>
                ))}
              </AlertSection>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

// ── 출하 전 점검 폼 ───────────────────────────────────────────
function CheckForm({ form, setForm, lots, onSave, onCancel, isEdit, toggleItem }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  function removeItem(i) { setForm(f => ({ ...f, checkItems: f.checkItems.filter((_, idx) => idx !== i) })) }

  const eligibleLots = lots.filter(l => l.status === 'in_stock' || l.status === 'quarantine')
  function selectLot(id) {
    const lot = lots.find(l => l.id === id)
    if (!lot) { F('lotId', ''); return }
    // 제품 개발 화면(ProductsHub)에서 제품별로 지정한 출하 전 점검 항목이 있으면 그것을 사용하고,
    // 없으면 기본 점검 항목을 사용한다 (SSoT: 제품 레코드의 pkgCheckItems).
    const products = onboarding.load()?.products || []
    const product = products.find(p => (p.name || p.itemName || '') === lot.productName)
    const pkgItems = product?.pkgCheckItems || []
    const items = (pkgItems.length > 0 ? pkgItems.map(i => i.name).filter(Boolean) : DEFAULT_CHECK_ITEMS)
      .map(name => ({ name, result: null }))
    setForm(f => ({
      ...f, lotId: id, productName: lot.productName, lotNo: lot.lotNo,
      qty: f.qty || lot.qty, linkedDistId: lot.linkedDistId || '', checkItems: items,
    }))
  }

  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '점검 기록 수정' : '출하 전 점검 등록'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>점검 대상 LOT *</label>
          <select value={form.lotId} onChange={e => selectLot(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            <option value="">LOT 선택...</option>
            {eligibleLots.map(l => <option key={l.id} value={l.id}>{l.productName} · {l.lotNo}</option>)}
          </select>
        </div>
        <Field label="출하 수량" value={form.qty} onChange={v => F('qty', v)} />
        <Field label="출하처 고객" value={form.destinationCustomer} onChange={v => F('destinationCustomer', v)}
          list="chk-customer-list" listOptions={salesCustomerNames()} placeholder="검색 또는 입력" />
        <Field label="점검일" type="date" value={form.checkedDate} onChange={v => F('checkedDate', v)} />
      </div>
      {form.lotId && (
        <div className="mb-4 text-[12px] px-3 py-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
          제품명: <b style={{ color: 'var(--ink)' }}>{form.productName}</b> · 연결 추적성 ID: {form.linkedDistId || '자동 연결 없음'} · 점검자: {form.checkedBy || '-'} (로그인 계정 자동 기록)
        </div>
      )}

      <div className="mb-3">
        <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>점검 항목 (각 항목을 적합/부적합으로 체크)</div>
        <div className="space-y-1.5 mb-2">
          {form.checkItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
              <span className="text-[12px] flex-1" style={{ color: 'var(--ink)' }}>{item.name}</span>
              <button onClick={() => toggleItem(i, 'pass')}
                className="px-2 py-0.5 rounded-md text-[11px] font-bold"
                style={{ background: item.result === 'pass' ? '#D1FAE5' : 'var(--bg-card)', color: item.result === 'pass' ? '#059669' : 'var(--ink-faint)', border: `1px solid ${item.result === 'pass' ? '#059669' : 'var(--line)'}`, cursor: 'pointer' }}>
                적합
              </button>
              <button onClick={() => toggleItem(i, 'fail')}
                className="px-2 py-0.5 rounded-md text-[11px] font-bold"
                style={{ background: item.result === 'fail' ? '#FEE2E2' : 'var(--bg-card)', color: item.result === 'fail' ? '#DC2626' : 'var(--ink-faint)', border: `1px solid ${item.result === 'fail' ? '#DC2626' : 'var(--line)'}`, cursor: 'pointer' }}>
                부적합
              </button>
              <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={12} /></button>
            </div>
          ))}
        </div>
      </div>
      <FieldArea label="비고 / 특이사항" value={form.notes} onChange={v => F('notes', v)} rows={2} />
      <div className="flex gap-2 mt-3">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}><Save size={13} /> 저장</button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>취소</button>
      </div>
    </div>
  )
}

// ── 출하 전 점검 성적서 모달 ───────────────────────────────────
function CertModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rounded-2xl p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto"
        style={{ background: 'var(--bg-card)', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>{title || '성적서'}</h3>
          <button onClick={onClose} style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function PreservationCheckCertificate({ chk, onClose }) {
  const vm = CHECK_VERDICTS[chk.verdict] || CHECK_VERDICTS.pending
  const Row = ({ label, value }) => (
    <div className="grid grid-cols-3 gap-2 py-1.5" style={{ borderBottom: '1px solid var(--line)' }}>
      <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>{label}</span>
      <span className="col-span-2 text-[12.5px]" style={{ color: 'var(--ink)' }}>{value || '—'}</span>
    </div>
  )
  return (
    <div className="space-y-1">
      <div className="text-center mb-3">
        <div className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>출하 전 보존상태 점검 성적서</div>
        <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>Pre-shipment Preservation Check Certificate · ISO 13485 §7.5.11</div>
      </div>
      <Row label="기록 ID" value={chk.id} />
      <Row label="점검일" value={chk.checkedDate} />
      <Row label="제품명" value={chk.productName} />
      <Row label="LOT 번호" value={chk.lotNo} />
      <Row label="출하 수량" value={chk.qty} />
      <Row label="출하처 고객" value={chk.destinationCustomer} />
      <Row label="점검자" value={chk.checkedBy} />
      <Row label="연결 추적성 ID" value={chk.linkedDistId} />
      <Row label="종합 판정" value={vm.label} />
      <div className="pt-2">
        <div className="text-[11.5px] mb-1.5" style={{ color: 'var(--ink-faint)' }}>점검 항목</div>
        <div className="space-y-1">
          {chk.checkItems.map((i, idx) => (
            <div key={idx} className="flex items-center justify-between text-[12px] px-2 py-1 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
              <span style={{ color: 'var(--ink)' }}>{i.name}</span>
              <span style={{ color: i.result === 'pass' ? '#059669' : i.result === 'fail' ? '#DC2626' : 'var(--ink-faint)' }}>
                {i.result === 'pass' ? '적합' : i.result === 'fail' ? '부적합' : '미판정'}
              </span>
            </div>
          ))}
        </div>
      </div>
      <Row label="비고" value={chk.notes} />
      <div className="flex gap-2 pt-4">
        <button onClick={() => printPreservationCheckCert(chk)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Printer size={13} /> 인쇄
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>닫기</button>
      </div>
    </div>
  )
}

// ── 공용 컴포넌트 ─────────────────────────────────────────────
function Kpi({ label, value, good, warn, bad }) {
  const color  = bad ? '#DC2626' : warn ? '#D97706' : good ? '#059669' : 'var(--ink)'
  const bg     = bad ? '#FEE2E2' : warn ? '#FEF3C7' : good ? '#D1FAE5' : 'var(--bg-card)'
  const border = bad ? '#FECACA' : warn ? '#FDE68A' : good ? '#A7F3D0' : 'var(--line)'
  return (
    <div className="p-4 rounded-2xl text-center" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="text-[26px] font-bold" style={{ color }}>{value}</div>
      <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{label}</div>
    </div>
  )
}

function Empty({ icon: Icon, text }) {
  return (
    <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
      <Icon size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
      <div className="text-[14px]">{text}</div>
    </div>
  )
}

function AlertSection({ color, title, bg, border, children }) {
  return (
    <div className="p-5 rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="text-[13px] font-bold mb-2" style={{ color }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, list, listOptions }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} list={list}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
      {list && listOptions && <datalist id={list}>{listOptions.map(n => <option key={n} value={n} />)}</datalist>}
    </div>
  )
}

function FieldArea({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows}
        className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
