// src/lib/orgChartImage.js
// 조직도(회사·조직 페이지 또는 온보딩에서 캡처한) 이미지 — 품질문서(품질매뉴얼 "조직도" 챕터)에
// 그대로 삽입하기 위한 저장소. localStorage 기반 단일 값.
const KEY = 'qualytree.orgChartImage'

export function saveOrgChartImage(dataUrl) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ dataUrl, capturedAt: new Date().toISOString() }))
    return true
  } catch {
    return false
  }
}

export function loadOrgChartImage() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// html2canvas — CDN 런타임 로드(번들/의존성 불필요, mammoth 로더와 동일 패턴)
export function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas)
  return new Promise((resolve, reject) => {
    const sc = document.createElement('script')
    sc.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
    sc.onload = () => resolve(window.html2canvas)
    sc.onerror = () => reject(new Error('이미지 캡처 모듈(html2canvas) 로드 실패 — 네트워크를 확인하세요.'))
    document.head.appendChild(sc)
  })
}
