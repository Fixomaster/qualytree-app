import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// #16 — ErrorBoundary(src/components/ErrorBoundary.jsx)가 청크 로드 실패 시 1회 자동
// 새로고침하도록 sessionStorage 플래그를 남기는데, 앱이 실제로 정상 부팅되면 그 플래그를
// 지워 다음에 진짜로 청크 로드가 실패했을 때도 다시 자동 복구가 동작하도록 한다.
try { sessionStorage.removeItem('qualytree.chunkReloadAttempted') } catch { /* noop */ }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
