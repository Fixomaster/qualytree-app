import React from 'react'
import { Navigate } from 'react-router-dom'

// #290: 설계·개발 도메인 통합 — 개발 현황(DevHub)의 10개 카드 그리드를 제거하고
// 제품·공정(ProductsHub)으로 직접 리다이렉트한다.
// DHF/DMR/위험관리/밸리데이션/생산제어계획/고객요구사항은 이제 각 제품 상세 탭에서
// productKey로 스코핑되어 바로 접근 가능하다 (ProductsHub.jsx 참조).
export default function DevHub() {
  return <Navigate to="/products" replace />
}
