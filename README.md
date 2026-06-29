# Qualytree Platform

Qualytree 플랫폼 (`app.qualytree.co.kr`) — SaaS 본 제품.

홈페이지(`qualytree.co.kr`)와 별도 도메인·별도 보안 경계로 분리됩니다 (Project Instructions §11.3).

## Phase 2.1 (현재) — ENT 영역

- ✅ `#ENT-001` 로그인 (가짜 인증, 데모용)
- ✅ `#ENT-002` 메인 대시보드 (회사 등록 전·후 두 상태)

## Phase 2.2 (다음) — ONB 영역

- 🔜 `#ONB-001` 회사 등록
- 🔜 `#ONB-002` 제품 등록
- 🔜 `#ONB-003` 공정 정의 ⭐ (드래그·드롭 + 블록 라이브러리 + 즉시 미리보기 + 자동 매핑)
- 🔜 `#ONB-004` 다중 규제 동시 매핑
- 🔜 `#ONB-005` 역할·자격

---

## 로컬 실행

```bash
npm install
npm run dev
```

→ `http://localhost:5174` (홈페이지는 5173, 충돌 방지)

데모 계정: 어떤 이메일·비밀번호든 입력 → 로그인 통과.

## 빌드

```bash
npm run build
npm run preview
```

## 배포 (Vercel)

1. GitHub에 새 repo `qualytree-app` 만들기 (Public 또는 Private, 체크박스 모두 해제)
2. `git init && git add . && git commit -m "Initial: Qualytree platform v0.1"`
3. `git remote add origin https://github.com/Fixomaster/qualytree-app.git`
4. `git branch -M main && git push -u origin main`
5. https://vercel.com → Add New → Project → `qualytree-app` Import → Deploy
6. 발급된 URL 동료 공유

## 폴더 구조

```
qualytree-app/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx              ← 라우팅
│   ├── main.jsx
│   ├── index.css            ← 색 토큰 + 폰트
│   ├── lib/
│   │   └── auth.js          ← 가짜 인증 (localStorage)
│   ├── components/
│   │   ├── Logo.jsx
│   │   ├── Sidebar.jsx
│   │   ├── TopBar.jsx
│   │   └── AppLayout.jsx
│   └── pages/
│       ├── Login.jsx        ← #ENT-001
│       ├── Dashboard.jsx    ← #ENT-002
│       └── Onboarding.jsx   ← #ONB-001~005 (placeholder)
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

## 디자인 토큰 (CSS variables in `index.css`)

홈페이지와 같은 brand family를 유지하되 작업 톤에 맞게 조정:

- `--bg`: `#FAFAF8` — 거의 흰색 (작업 시간 길어 시각 피로 적게)
- `--moss`: `#143A2C` — 메인 액션·헤더
- `--leaf`: `#4A7C59` — 성공·OK 상태
- `--amber`: `#C8772D` — 임박·주의
- `--rust`: `#8B3A1F` — 위험·에러
이석호
