// src/lib/recallPdf.js
// 리콜 통보 대상 고객 목록 PDF 다운로드.
// jsPDF 기본 폰트는 한글을 지원하지 않으므로, 조직도 캡처(orgChartImage.js)와 동일하게
// html2canvas로 HTML을 이미지로 캡처한 뒤 jsPDF에 삽입하는 방식을 사용한다.
import jsPDF from 'jspdf'
import { loadHtml2Canvas } from './orgChartImage'

function buildListHtml({ lot, recallClass, reason, hits }) {
  const classLabel = { I: 'Class I — 즉시 리콜', II: 'Class II — 신속 리콜', III: 'Class III — 일반 리콜' }[recallClass] || recallClass || '-'
  const totalQty = hits.reduce((s, h) => s + (parseInt(h.qty) || 0), 0)
  const rows = hits.map((h, i) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">${i + 1}</td>
      <td style="padding:8px;border:1px solid #ddd;">${h.customerName || '-'}</td>
      <td style="padding:8px;border:1px solid #ddd;">${h.customerContact || '-'}</td>
      <td style="padding:8px;border:1px solid #ddd;">${h.customerAddress || '-'}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">${h.qty || '-'}</td>
    </tr>`).join('')
  return `
    <div style="width:760px;padding:32px;background:#fff;font-family:'Malgun Gothic','Noto Sans KR',sans-serif;color:#1a1a1a;">
      <div style="font-size:20px;font-weight:800;text-align:center;margin-bottom:4px;">리콜 통보 대상 고객 목록</div>
      <div style="font-size:11px;text-align:center;color:#666;margin-bottom:20px;">Recall Notification Customer List &middot; ISO 13485 &sect;8.3</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px;">
        <tr><th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;text-align:left;width:120px;">대상 LOT</th><td style="padding:8px;border:1px solid #ddd;">${lot || '-'}</td>
            <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;text-align:left;width:120px;">리콜 등급</th><td style="padding:8px;border:1px solid #ddd;">${classLabel}</td></tr>
        <tr><th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;text-align:left;">통보 대상</th><td style="padding:8px;border:1px solid #ddd;">${hits.length}건</td>
            <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;text-align:left;">총 수량</th><td style="padding:8px;border:1px solid #ddd;">${totalQty}</td></tr>
        <tr><th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;text-align:left;">리콜 사유</th><td colspan="3" style="padding:8px;border:1px solid #ddd;">${reason || '(미입력)'}</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead><tr>
          <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">번호</th>
          <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;text-align:left;">고객명</th>
          <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;text-align:left;">연락처</th>
          <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;text-align:left;">주소</th>
          <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">수량</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="padding:12px;text-align:center;color:#999;">통보 대상 고객 없음</td></tr>'}</tbody>
      </table>
      <div style="font-size:10px;color:#999;margin-top:20px;">생성일시: ${new Date().toLocaleString('ko-KR')}</div>
    </div>`
}

export async function downloadRecallCustomerListPdf({ lot, recallClass, reason, hits }) {
  const html2canvas = await loadHtml2Canvas()
  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-9999px'
  wrapper.style.top = '0'
  wrapper.innerHTML = buildListHtml({ lot, recallClass, reason, hits })
  document.body.appendChild(wrapper)
  try {
    const target = wrapper.firstElementChild
    const canvas = await html2canvas(target, { backgroundColor: '#ffffff', scale: 2 })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pageWidth - 40
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 20
    pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight)
    heightLeft -= (pageHeight - 40)
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 20
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight)
      heightLeft -= (pageHeight - 40)
    }
    pdf.save(`리콜통보목록_${lot || 'LOT'}_${new Date().toISOString().slice(0, 10)}.pdf`)
  } finally {
    document.body.removeChild(wrapper)
  }
}
