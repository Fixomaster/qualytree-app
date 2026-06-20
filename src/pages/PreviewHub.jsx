// src/pages/PreviewHub.jsx
// 운영자 전용 페이지 미리보기 허브 — 전체 페이지 탐색 + 데모 데이터 + 역할 전환
import React from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { auth } from '../lib/auth'
import { LEVELS, LEVEL_LABEL } from '../lib/permissions'
import { runDemoSeed, clearAllData } from '../lib/demoSeed'

const PAGES = [
  {
    g: '고객 화면',
    items: [
      ['대시보드', '/dashboard'],
      ['온보딩', '/onboarding'],
      ['작업지시 큐', '/operations'],
      ['품질 허브', '/quality'],
      ['품질 트리', '/tree'],
      ['제품 허브', '/products'],
      ['규제 허브', '/regulatory'],
    ],
  },
  {
    g: '운영자 / 관리자',
    items: [
      ['운영자 콘솔', '/operator'],
      ['플랜 관리', '/operator/plans'],
      ['멤버 관리', '/manager/accounts'],
    ],
  },
]

export default function PreviewHub() {
  const navigate = useNavigate()
  const [, force] = React.useReducer((x) => x + 1, 0)
  const cur = auth.current()
  const kind = cur && cur.identityKind

  if (cur && kind === 'company_member') {
    return <Navigate to="/dashboard" replace />
  }

  const ensureDemo = () => {
    if (!auth.isSignedIn()) auth.signInDemo('preview@demo.local', '미리보기', LEVELS.MANAGER)
  }
  const seed = () => {
    ensureDemo()
    try { runDemoSeed({ withFailures: true, withCcrHistory: true }) }
    catch (e) { alert('시드 실패: ' + (e && e.message)) }
    force()
  }
  const clear = () => { try { clearAllData() } catch (e) {} force() }
  const setLevel = (lv) => { ensureDemo(); auth.setLevel(lv); force() }
  const demoLogin = () => { auth.signInDemo('preview@demo.local', '미리보기', LEVELS.MANAGER); force() }
  const signOut = () => { auth.signOut(); force() }

  const signedIn = auth.isSignedIn()
  const lv = cur ? cur.level : null

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <h1 style={S.h1}>페이지 미리보기 <span style={S.tag}>운영자 전용</span></h1>
        <div style={S.row}>
          <span style={S.badge}>세션: {signedIn ? (kind || 'demo') : '없음'}</span>
          <span style={S.badge}>권한: {lv ? (LEVEL_LABEL[lv] || lv) : '-'}</span>
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>데모 데이터</div>
          <div style={S.btnRow}>
            {!signedIn && <button style={S.btn} onClick={demoLogin}>데모 로그인</button>}
            <button style={S.btnPri} onClick={seed}>데모 데이터 채우기</button>
            <button style={S.btn} onClick={clear}>초기화</button>
            {signedIn && <button style={S.btn} onClick={signOut}>로그아웃</button>}
          </div>
          <div style={S.hint}>각 페이지에 회사·제품·작업지시·품질 데이터를 한 번에 채워 승인 이후 화면을 재현합니다.</div>
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>역할 전환</div>
          <div style={S.btnRow}>
            {[LEVELS.OPERATOR, LEVELS.INSPECTOR, LEVELS.MANAGER].map((l) => (
              <button key={l} onClick={() => setLevel(l)} style={{ ...S.btn, ...(lv === l ? S.btnOn : {}) }}>
                {LEVEL_LABEL[l] || l}
              </button>
            ))}
          </div>
          <div style={S.hint}>권한 레벨에 따라 페이지 내 작성·승인·삭제 버튼 노출이 달라집니다.</div>
        </div>

        {PAGES.map((sec) => (
          <div key={sec.g} style={S.card}>
            <div style={S.cardTitle}>{sec.g}</div>
            <div style={S.grid}>
              {sec.items.map(([label, to]) => (
                <Link key={to} to={to} style={S.tile}>
                  <div style={S.tileLabel}>{label}</div>
                  <div style={S.tilePath}>{to}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div style={S.note}>
          동적 페이지(전자배치기록·검사단계·GMP 섹션)는 위 목록 페이지에서 항목을 눌러 진입하세요.
        </div>
        <button style={S.linkBtn} onClick={() => navigate('/operator')}>← 운영자 콘솔</button>
      </div>
    </div>
  )
}

const S = {
  page: { minHeight: '100vh', background: '#f5f5f4', padding: '32px 16px', fontFamily: 'Pretendard, -apple-system, sans-serif' },
  wrap: { maxWidth: 880, margin: '0 auto' },
  h1: { fontSize: 22, fontWeight: 700, color: '#1c1917', marginBottom: 12 },
  tag: { fontSize: 12, fontWeight: 600, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 999, padding: '2px 10px', marginLeft: 8, verticalAlign: 'middle' },
  row: { display: 'flex', gap: 8, marginBottom: 16 },
  badge: { fontSize: 12.5, color: '#44403c', background: '#fff', border: '1px solid #e7e5e4', borderRadius: 999, padding: '4px 12px' },
  card: { background: '#fff', border: '1px solid #e7e5e4', borderRadius: 12, padding: '16px 18px', marginBottom: 14 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#16352b', marginBottom: 12 },
  btnRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btn: { padding: '8px 14px', background: '#f5f5f4', color: '#1c1917', border: '1px solid #d6d3d1', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnPri: { padding: '8px 14px', background: '#16352b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnOn: { background: '#1c1917', color: '#fff', borderColor: '#1c1917' },
  hint: { fontSize: 12, color: '#78716c', marginTop: 10, lineHeight: 1.5 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 },
  tile: { display: 'block', padding: '12px 14px', border: '1px solid #d6d3d1', borderRadius: 10, textDecoration: 'none', background: '#fafaf9' },
  tileLabel: { fontSize: 14, fontWeight: 600, color: '#1c1917' },
  tilePath: { fontSize: 11.5, color: '#78716c', marginTop: 3, fontFamily: 'monospace' },
  note: { fontSize: 12.5, color: '#78716c', background: '#fff', border: '1px dashed #d6d3d1', borderRadius: 9, padding: '12px 14px', marginBottom: 14, lineHeight: 1.5 },
  linkBtn: { padding: '8px 14px', background: 'transparent', color: '#78716c', border: 'none', fontSize: 13, cursor: 'pointer' },
}
