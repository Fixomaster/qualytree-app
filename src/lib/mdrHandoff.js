// src/lib/mdrHandoff.js
// #13 — 이상사례보고(MDR) 품질부서 핸드오프
//
// 고객불만(ComplaintHub, 수주고객 도메인)에서 MDR 대상으로 표시된 항목을 품질검사 도메인
// (QualityHub)에서도 직접 조회·처리할 수 있도록 같은 localStorage 데이터를 공유한다.
// 별도 데이터 복제 없이 "qualytree.complaints"를 단일 소스로 유지하되, 품질부서 소유
// 필드(qualityReviewedAt/qualityReviewedBy/qualityReviewNote)를 추가로 기록해
// "고객불만 접수(영업) → 이상사례 검토·MDR 보고(품질)"의 실제 부서간 핸드오프를 만든다.

const LS_KEY = 'qualytree.complaints'

function loadAllComplaints() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function saveAllComplaints(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

export const mdrHandoff = {
  // MDR(이상사례) 보고 대상으로 표시된 고객불만만 반환 — 품질부서 처리 대상 큐
  loadAll() {
    return loadAllComplaints()
      .filter((c) => c.mdrRequired)
      .sort((a, b) => (b.receivedDate || '').localeCompare(a.receivedDate || ''))
  },

  // 품질부서 검토 내용 저장 (조사 참고, MFDS 보고일 등) — 원본 고객불만 레코드에 병합
  updateReview(id, patch) {
    const list = loadAllComplaints()
    const next = list.map((c) => (c.id === id ? { ...c, ...patch } : c))
    saveAllComplaints(next)
    return next
  },

  // 품질부서 검토 완료 처리
  markReviewed(id, byName) {
    return this.updateReview(id, {
      qualityReviewedAt: new Date().toISOString().slice(0, 10),
      qualityReviewedBy: byName || '',
    })
  },
  clearReviewed(id) {
    return this.updateReview(id, { qualityReviewedAt: '', qualityReviewedBy: '' })
  },
}
