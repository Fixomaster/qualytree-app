// 허가증 PDF 업로드 → AI 자동 추출 (기허가 제품 등록)
//
// 1) 클라이언트에서 pdf.js(CDN)로 PDF의 텍스트만 추출한다(파일 자체는 서버로 전송하지 않음 — 텍스트만 전송).
// 2) 추출한 텍스트를 /api/extract-license 로 보내 Claude가 품목명/분류번호/등급/허가번호/허가일/모델목록을
//    구조화하여 반환한다. 실패해도 UI는 막지 않고 null을 반환해 사용자가 수동 입력을 계속할 수 있게 한다.
// - mammoth(Documents.jsx) / html2canvas(orgChartImage.js)와 동일한 lazy CDN 로드 패턴을 따른다.

const PDFJS_VERSION = '3.11.174'

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib)
  return new Promise((resolve, reject) => {
    const sc = document.createElement('script')
    sc.src = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.js`
    sc.onload = () => {
      const lib = window.pdfjsLib
      if (lib) lib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`
      resolve(lib)
    }
    sc.onerror = () => reject(new Error('PDF 분석 모듈(pdf.js) 로드 실패 — 네트워크를 확인하세요.'))
    document.head.appendChild(sc)
  })
}

/** PDF 파일에서 모든 페이지의 텍스트를 추출한다. */
export async function extractPdfText(file) {
  const pdfjsLib = await loadPdfJs()
  const ab = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise
  const parts = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    parts.push(content.items.map((it) => it.str).join(' '))
  }
  return parts.join('\n')
}

/**
 * 허가증 PDF 파일을 받아 텍스트를 추출하고 AI 분석 API를 호출한다.
 * 성공 시 { itemName, classNo, grade, licenseNo, issueDate, models:[{code,name}] } 반환.
 * 실패(네트워크 오류, 텍스트 없음, API 오류 등) 시 절대 예외를 던지지 않고 null을 반환한다 — UI는 계속 수동 입력 가능해야 한다.
 */
export async function extractLicenseFromPdf(file) {
  try {
    const text = await extractPdfText(file)
    if (!text || !text.trim()) return null
    const r = await fetch('/api/extract-license', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    const j = await r.json()
    if (!j || !j.ok) return null
    return {
      itemName: j.itemName || '',
      classNo: j.classNo || '',
      grade: j.grade || '',
      licenseNo: j.licenseNo || '',
      issueDate: j.issueDate || '',
      models: Array.isArray(j.models) ? j.models : [],
    }
  } catch {
    return null
  }
}
