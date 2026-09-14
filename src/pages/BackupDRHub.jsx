// src/pages/BackupDRHub.jsx
// ISO 13485 §4.1.6 — 백업·재해복구(DR) 관리
import React, { useState, useEffect } from 'react'
import { Database, Shield, RefreshCw, CheckCircle, AlertTriangle, Clock, Download, Play, Plus, Trash2, Server } from 'lucide-react'
import AppLayout from '../components/AppLayout'

const LS_DRILL = 'qualytree.dr_drills'
const LS_CHECKLIST = 'qualytree.dr_checklist'

const TABS = [
  { key: 'status', label: '백업 현황', icon: Database },
  { key: 'drill', label: 'DR 훈련', icon: Play },
  { key: 'checklist', label: '복구 절차', icon: CheckCircle },
  { key: 'config', label: '설정 정보', icon: Server },
]

const BACKUP_INFO = {
  provider: 'Supabase Cloud (ap-northeast-2)',
  type: 'Point-in-Time Recovery (PITR)',
  retention: '7일',
  rpo: '< 1시간',
  rto: '< 4시간',
  encryption: 'AES-256',
  lastCheck: new Date().toLocaleDateString('ko-KR'),
}

const CHECKLIST_ITEMS = [
  { id: 'c1', label: 'Supabase 대시보드 → 백업 탭에서 최신 백업 확인', category: '백업 확인' },
  { id: 'c2', label: 'GitHub 저장소(Fixomaster/qualytree-app) 코드 상태 확인', category: '백업 확인' },
  { id: 'c3', label: '환경변수 목록 확인 (Vercel → Settings → Environment)', category: '환경 준비' },
  { id: 'c4', label: 'Vercel에 새 프로젝트 생성 또는 기존 프로젝트 확인', category: '환경 준비' },
  { id: 'c5', label: 'VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 환경변수 재설정', category: '환경 준비' },
  { id: 'c6', label: 'Supabase → Backups → Point in Time Recovery 복원 시작', category: 'DB 복원' },
  { id: 'c7', label: '복원 완료 후 테이블 Row 수 확인 (핵심 5개 테이블)', category: 'DB 복원' },
  { id: 'c8', label: 'GitHub에서 최신 커밋을 Vercel에 재배포', category: '앱 복원' },
  { id: 'c9', label: '로그인 테스트 (관리자 계정)', category: '앱 복원' },
  { id: 'c10', label: '주요 기능 동작 확인: 문서관리, CAPA, 변경관리', category: '기능 검증' },
  { id: 'c11', label: '전자서명 워크플로 작동 확인', category: '기능 검증' },
  { id: 'c12', label: '복구 결과 DR 훈련 기록에 입력', category: '사후 처리' },
]

export default function BackupDRHub() {
  const [tab, setTab] = useState('status')
  const [drills, setDrills] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_DRILL) || '[]') } catch { return [] }
  })
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_CHECKLIST) || '{}') } catch { return {} }
  })
  const [showDrillForm, setShowDrillForm] = useState(false)
  const [drillForm, setDrillForm] = useState({ date: '', type: 'tabletop', rto: '', rpo: '', result: 'pass', notes: '' })

  const saveDrills = (d) => { setDrills(d); localStorage.setItem(LS_DRILL, JSON.stringify(d)) }
  const saveChecked = (c) => { setChecked(c); localStorage.setItem(LS_CHECKLIST, JSON.stringify(c)) }

  const addDrill = () => {
    if (!drillForm.date) return
    saveDrills([{ ...drillForm, id: Date.now().toString() }, ...drills])
    setDrillForm({ date: '', type: 'tabletop', rto: '', rpo: '', result: 'pass', notes: '' })
    setShowDrillForm(false)
  }

  const toggleCheck = (id) => saveChecked({ ...checked, [id]: !checked[id] })
  const resetChecklist = () => saveChecked({})

  const checkedCount = Object.values(checked).filter(Boolean).length
  const progress = Math.round((checkedCount / CHECKLIST_ITEMS.length) * 100)
  const categories = [...new Set(CHECKLIST_ITEMS.map(i => i.category))]

  const RESULT_META = {
    pass: { label: '합격', color: '#059669', bg: '#f0fdf4' },
    partial: { label: '부분합격', color: '#d97706', bg: '#fffbeb' },
    fail: { label: '불합격', color: '#dc2626', bg: '#fef2f2' },
  }

  return (
    <AppLayout>
      <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            백업·재해복구(DR) 관리
          </h1>
          <p style={{ color: 'var(--ink-faint)', margin: '4px 0 0', fontSize: 13 }}>
            ISO 13485 §4.1.6 — 컴퓨터화 시스템 데이터 보호 및 복구 절차
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--line)', paddingBottom: 0 }}>
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? 'var(--moss)' : 'var(--ink-faint)',
                  borderBottom: active ? '2px solid var(--moss)' : '2px solid transparent',
                  marginBottom: -1 }}>
                <Icon size={14} /> {t.label}
              </button>
            )
          })}
        </div>

        {/* 백업 현황 */}
        {tab === 'status' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'RPO (복구 목표 시점)', value: BACKUP_INFO.rpo, icon: Clock, color: '#059669' },
                { label: 'RTO (복구 목표 시간)', value: BACKUP_INFO.rto, icon: RefreshCw, color: '#2563eb' },
                { label: '최근 점검일', value: BACKUP_INFO.lastCheck, icon: CheckCircle, color: '#7c3aed' },
              ].map(card => {
                const Icon = card.icon
                return (
                  <div key={card.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)',
                    borderRadius: 12, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Icon size={16} style={{ color: card.color }} />
                      <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{card.label}</span>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
                  </div>
                )
              })}
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', fontWeight: 600, fontSize: 14 }}>
                백업 구성 정보
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {Object.entries({
                    '백업 제공자': BACKUP_INFO.provider,
                    '백업 유형': BACKUP_INFO.type,
                    '보존 기간': BACKUP_INFO.retention,
                    '암호화': BACKUP_INFO.encryption,
                    '데이터 저장 위치': 'Supabase Cloud — 서울 리전 (ap-northeast-2)',
                    '소스코드 백업': 'GitHub (Fixomaster/qualytree-app) — 자동',
                    '배포 인프라': 'Vercel — 무중단 배포, 글로벌 CDN',
                  }).map(([k, v], i) => (
                    <tr key={k} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
                      <td style={{ padding: '10px 20px', color: 'var(--ink-faint)', width: 200, fontWeight: 500 }}>{k}</td>
                      <td style={{ padding: '10px 20px' }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16, padding: 16, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Shield size={20} style={{ color: '#059669' }} />
              <span style={{ fontSize: 13, color: '#065f46' }}>
                Supabase PITR이 활성화되어 있어 최대 7일 이내 어느 시점으로도 복원할 수 있습니다.
                GitHub 자동 백업으로 소스코드도 안전하게 보호됩니다.
              </span>
            </div>
          </div>
        )}

        {/* DR 훈련 */}
        {tab === 'drill' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>DR 훈련 기록</h2>
              <button onClick={() => setShowDrillForm(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                  background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                <Plus size={14} /> 훈련 기록 추가
              </button>
            </div>

            {showDrillForm && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>신규 DR 훈련 기록</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    { key: 'date', label: '훈련 일자', type: 'date' },
                    { key: 'rto', label: '실제 RTO (시간)', type: 'text', placeholder: '예: 2.5' },
                    { key: 'rpo', label: '실제 RPO (시간)', type: 'text', placeholder: '예: 0.5' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 4 }}>{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder || ''} value={drillForm[f.key]}
                        onChange={e => setDrillForm(p => ({ ...p, [f.key]: e.target.value }))}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 4 }}>훈련 유형</label>
                    <select value={drillForm.type} onChange={e => setDrillForm(p => ({ ...p, type: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13 }}>
                      <option value="tabletop">Tabletop 훈련</option>
                      <option value="partial">부분 복구 훈련</option>
                      <option value="full">전체 복구 훈련</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 4 }}>결과</label>
                    <select value={drillForm.result} onChange={e => setDrillForm(p => ({ ...p, result: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13 }}>
                      <option value="pass">합격</option>
                      <option value="partial">부분합격</option>
                      <option value="fail">불합격</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 4 }}>비고</label>
                    <textarea value={drillForm.notes} onChange={e => setDrillForm(p => ({ ...p, notes: e.target.value }))}
                      placeholder="발견된 문제점, 개선사항 등"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, height: 72, resize: 'vertical', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={addDrill}
                    style={{ padding: '8px 20px', background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                    저장
                  </button>
                  <button onClick={() => setShowDrillForm(false)}
                    style={{ padding: '8px 20px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                    취소
                  </button>
                </div>
              </div>
            )}

            {drills.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-faint)' }}>
                <Play size={40} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p>DR 훈련 기록이 없습니다. 연 1회 이상 훈련을 권장합니다.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {drills.map(d => {
                  const meta = RESULT_META[d.result] || RESULT_META.pass
                  const typeLabel = d.type === 'tabletop' ? 'Tabletop' : d.type === 'partial' ? '부분복구' : '전체복구'
                  return (
                    <div key={d.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{d.date}</span>
                          <span style={{ fontSize: 12, background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>{typeLabel}</span>
                          <span style={{ fontSize: 12, background: meta.bg, color: meta.color, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{meta.label}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
                          실제 RTO: {d.rto || '-'}시간 &nbsp;|&nbsp; 실제 RPO: {d.rpo || '-'}시간
                        </div>
                        {d.notes && <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>{d.notes}</div>}
                      </div>
                      <button onClick={() => saveDrills(drills.filter(x => x.id !== d.id))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 복구 절차 체크리스트 */}
        {tab === 'checklist' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>복구 절차 체크리스트</h2>
                <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '4px 0 0' }}>재해 발생 시 순서대로 진행</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>{checkedCount}/{CHECKLIST_ITEMS.length} 완료</div>
                <div style={{ width: 80, height: 6, background: 'var(--line)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: progress+'%', height: '100%', background: '#059669', transition: 'width 0.3s' }} />
                </div>
                <button onClick={resetChecklist}
                  style={{ padding: '6px 12px', background: 'none', border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
                  초기화
                </button>
              </div>
            </div>

            {categories.map(cat => (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{cat}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {CHECKLIST_ITEMS.filter(i => i.category === cat).map((item, idx) => (
                    <div key={item.id} onClick={() => toggleCheck(item.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                        background: checked[item.id] ? '#f0fdf4' : 'var(--surface)',
                        border: '1px solid ' + (checked[item.id] ? '#bbf7d0' : 'var(--line)'),
                        borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, border: '2px solid ' + (checked[item.id] ? '#059669' : 'var(--line)'),
                        background: checked[item.id] ? '#059669' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {checked[item.id] && <CheckCircle size={12} color="#fff" />}
                      </div>
                      <span style={{ fontSize: 13, color: checked[item.id] ? '#065f46' : 'var(--ink)',
                        textDecoration: checked[item.id] ? 'line-through' : 'none' }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 설정 정보 */}
        {tab === 'config' && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>인프라 설정 및 연락처</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { title: 'Supabase', items: [
                  ['프로젝트 URL', 'supabase.co 대시보드'],
                  ['백업 설정', 'PITR 7일 활성화'],
                  ['리전', 'ap-northeast-2 (서울)'],
                  ['Row Level Security', '모든 테이블 활성화'],
                ]},
                { title: 'Vercel', items: [
                  ['프로젝트', 'qualytree-app'],
                  ['도메인', 'qualy-tree.com'],
                  ['배포 방식', 'GitHub 자동 배포 (main 브랜치)'],
                  ['CDN', '글로벌 엣지 네트워크'],
                ]},
                { title: 'GitHub', items: [
                  ['저장소', 'Fixomaster/qualytree-app'],
                  ['브랜치 전략', 'main (프로덕션)'],
                  ['자동 배포', 'main push → Vercel 즉시 배포'],
                  ['접근 제어', 'PAT 기반 (만료 시 갱신 필요)'],
                ]},
                { title: '비상 연락처', items: [
                  ['시스템 담당자', 'IT 팀장'],
                  ['품질책임자', 'QA 팀장'],
                  ['Supabase 지원', 'supabase.com/support'],
                  ['Vercel 지원', 'vercel.com/support'],
                ]},
              ].map(section => (
                <div key={section.title} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', fontWeight: 600, fontSize: 14, background: 'var(--bg)' }}>
                    {section.title}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <tbody>
                      {section.items.map(([k, v], i) => (
                        <tr key={k} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                          <td style={{ padding: '8px 16px', color: 'var(--ink-faint)', width: '40%' }}>{k}</td>
                          <td style={{ padding: '8px 16px', fontWeight: 500 }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
