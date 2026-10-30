-- 20261030_billing_live.sql
-- 토스페이먼츠 라이브 전환 전 필수: 결제 함수(api/payments/*)가 저장하는 컬럼이 테이블에 없어
-- 카드 결제가 되어도 결제 기록·구독·빌링키가 저장되지 않던 문제를 해결한다.
-- (2026-10-30 운영 DB 확인: subscriptions.expires_at/billing_key/customer_key,
--  payments.order_id/method/raw 컬럼 없음, subscriptions.plan 이 옛 플랜명만 허용)
-- 여러 번 실행해도 안전하다(IF NOT EXISTS).

-- 1) subscriptions — 현재 요금제 id(kgmp, kgmp_importer …)를 받을 수 있게 옛 제약 제거
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS expires_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_key   TEXT,          -- 토스 빌링키(재조회 불가 — 반드시 보관)
  ADD COLUMN IF NOT EXISTS customer_key  TEXT,
  ADD COLUMN IF NOT EXISTS amount        NUMERIC,       -- 정기결제 1회 금액(서버가 요금제에서 계산)
  ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'none'
    CHECK (billing_status IN ('none','card_registered','active','past_due','canceled'));

-- 2) payments — 결제 1건의 주문번호·결제수단·토스 응답 원문
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS order_id    TEXT,
  ADD COLUMN IF NOT EXISTS method      TEXT,
  ADD COLUMN IF NOT EXISTS raw         JSONB,
  ADD COLUMN IF NOT EXISTS fail_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS payments_order_id_unique ON public.payments (order_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payments_payment_key_unique ON public.payments (payment_key) WHERE payment_key IS NOT NULL;

-- 참고: subscriptions 조회는 RLS 상 운영자만 가능(20260908 정책). billing_key 는 그 범위 밖으로 나가지 않는다.
