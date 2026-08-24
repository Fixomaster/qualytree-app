// src/components/ErrorBoundary.jsx
// #16 (전체) — "가끔 메뉴 넘어가다보면 Blank 화면에서 멈추는 경향" 버그 수정.
// 원인: src/App.jsx의 모든 페이지가 React.lazy(() => import(...))로 지연 로드되는데,
// 배포(재배포) 직후 브라우저에 남아있던 이전 index.html/청크 참조로 다음 페이지 이동 시
// 새 청크 파일을 찾지 못해 dynamic import가 실패하거나("Failed to fetch dynamically
// imported module"), 네트워크가 일시적으로 불안정해 청크 로드가 실패하는 경우가 있다.
// 이 예외는 <Suspense> 내부에서 렌더링 중 발생하는데, 이를 잡아줄 ErrorBoundary가 전혀
// 없었기 때문에 React 트리 전체가 언마운트되며 화면이 완전히 빈 채로 멈춰버렸다.
// (또한 각 lazy 선언에 달린 try/catch는 import()가 비동기이므로 실제로는 아무 예외도
// 잡지 못하는 죽은 코드였다 — 청크 로드 실패는 항상 Suspense 렌더링 시점에 던져진다.)
//
// 해결: 렌더링 에러를 잡는 ErrorBoundary를 두고, "청크를 찾을 수 없음" 계열 에러는
// 배포로 인한 낡은 캐시가 원인일 가능성이 높으므로 자동으로 1회 새로고침을 시도한다.
// (무한 새로고침 루프 방지를 위해 sessionStorage에 재시도 여부를 기록) 그 외의 일반
// 렌더링 에러는 사용자가 상황을 파악하고 수동으로 복구할 수 있도록 안내 화면을 보여준다.
import React from 'react'

const RELOAD_FLAG = 'qualytree.chunkReloadAttempted'

function isChunkLoadError(err) {
  const msg = String(err?.message || err || '')
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|dynamically imported module/i.test(msg)
    || err?.name === 'ChunkLoadError'
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error)) {
      // 배포 직후 낡은 청크 참조로 실패한 것으로 추정 — 최신 index.html을 다시 받아오도록
      // 딱 한 번만 자동 새로고침한다(무한 루프 방지).
      let alreadyTried = false
      try { alreadyTried = sessionStorage.getItem(RELOAD_FLAG) === '1' } catch { /* noop */ }
      if (!alreadyTried) {
        try { sessionStorage.setItem(RELOAD_FLAG, '1') } catch { /* noop */ }
        window.location.reload()
        return
      }
    }
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error)
  }

  handleReload = () => {
    try { sessionStorage.removeItem(RELOAD_FLAG) } catch { /* noop */ }
    window.location.reload()
  }

  handleHome = () => {
    try { sessionStorage.removeItem(RELOAD_FLAG) } catch { /* noop */ }
    window.location.href = '/home'
  }

  render() {
    if (this.state.hasError) {
      if (isChunkLoadError(this.state.error)) {
        // 자동 새로고침이 곧 실행되므로 짧은 대기 안내만 표시한다.
        return (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-faint, #9ca3af)' }}>
            새 버전을 불러오는 중입니다…
          </div>
        )
      }
      return (
        <div style={{
          minHeight: '60vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 48, textAlign: 'center',
        }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink, #111827)', marginBottom: 8 }}>
            화면을 불러오는 중 문제가 발생했습니다
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-faint, #9ca3af)', marginBottom: 20, maxWidth: 420 }}>
            일시적인 오류일 수 있습니다. 새로고침해도 계속되면 관리자에게 문의해주세요.
          </p>
          {this.state.error && (
            <pre style={{
              fontSize: 11, color: 'var(--ink-faint, #9ca3af)', marginBottom: 16,
              maxWidth: 520, textAlign: 'left', background: '#f9fafb',
              padding: '8px 12px', borderRadius: 6, overflow: 'auto',
              wordBreak: 'break-all', border: '1px solid #e5e7eb'
            }}>
              {String(this.state.error?.message || this.state.error)}
            </pre>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={this.handleReload} className="btn-primary" style={{ cursor: 'pointer' }}>
              새로고침
            </button>
            <button onClick={this.handleHome} className="btn-ghost" style={{ cursor: 'pointer' }}>
              홈으로
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
