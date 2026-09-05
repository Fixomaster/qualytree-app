# CSV-001 컴퓨터화 시스템 기술서 (System Description)

| 항목 | 내용 |
|------|------|
| 문서번호 | CSV-001 |
| 시스템명 | Qualytree QMS |
| 버전 | 1.0 |
| 작성일 | 2026-09-04 |
| 작성자 | QA Manager |
| 분류 | GAMP 5 카테고리 4 (Configured Software) |

---

## 1. 시스템 개요

Qualytree QMS는 ISO 13485:2016 및 KGMP 요구사항을 지원하는 웹 기반 품질경영시스템(QMS) 소프트웨어이다.  
의료기기 제조업체의 품질 문서, 교육 기록, 심사, 시정조치 등 품질 활동 전반을 디지털로 관리한다.

## 2. 시스템 아키텍처

| 계층 | 구성요소 | 버전/사양 |
|-------|-----------|-----------|
| P��론트엔드 | React + Vite | React 18, Vite 5 |
| 백엔드/DB | Supabase (PostgreSQL) | Supabase Cloud |
| 인증 | Supabase Auth (이메일/소셜) | JWT 기반 |
| 저장소 | Supabase Storage + localStorage | — |
| 배포 | Vercel (CDN) | — |
| 도메인 | qualy-tree.com | HTTPS/TLS 1.3 |

## 3. 주요 기능 모듈

| 모듈 | 설명 | ISO 13485 조항 |
|------|------|---------------|
| NCR (부적합보고서) | 부적합 발생 등록·추적 | 8.3 |
| CAPA | 시정조치·예방조치 관리 | 8.5.2, 8.5.3 |
| 내부심사 | 심사계획·체크리스트·결과 | 8.2.2 |
| 공급업체 심사 (CAR) | 공급업체 평가·심사 | 7.4 |
| 개선제안 | 지속적 개선 관리 | 8.5.1 |
| 작업지시서 | 생산 작업지시 발행 | 7.5 |
| 검사성적서 | IQC/출하검사 성적서 | 8.2.4 |
| 청정도 인증서 | 클린룸 청정도 검증 | 7.5.1 |
| 멸균배치 기록 | 멸균 공정 배치 기록 | 7.5.1 |
| 위탁제조 관리 | 외주 생산 관리 | 7.4 |
| 품목 인허가 가이드 | 의료기기 등급별 인허가 안내 | — |
| 회사 마스터데이터 | 회사 기본정보 중앙 관리 | 4.2 |
| PDF 인쇄 | 모든 품질 문서 표준 PDF 출력 | 4.2.4 |

## 4. 데이터 흐름

```
사용자 브라우저 → React SPA (Vite 빌드)
    ↕ HTTPS REST/RPC
Supabase API Gateway
    ↕
PostgreSQL DB (행 수준 보안: RLS 정책)
    ↕
Supabase Storage (첨부파일)
```

로컬 스토리지(`localStorage`)는 회사 마스터데이터(`qualytree.company_master`) 및 세션 캐시 목적으로만 사용한다.

## 5. 접근 제어

- 역할(Role): 관리자(Admin), QA 담당자, 일반 사용자
- Supabase RLS(Row Level Security)로 테이블 단위 접근 제어
- JWT 만료 시 자동 재인증

## 6. 변경 이력

| 버전 | 일자 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0 | 2026-09-04 | 최초 작성 | QA Manager |
