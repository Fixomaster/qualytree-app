-- 20260908_subscriptions_payments.sql
-- SuperAdminHub.jsx(운영자 콘솔, /operator/super)가 이미 참조하고 있으나
-- 마이그레이션이 누락되어 있던 subscriptions / payments 테이블 생성.
-- 적용: Supabase Dashboard -> SQL Editor -> Run

-- ------------------------------------------------------------
-- 1) subscriptions — 회사별 구독 플랜 (1 company = 1 row)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan        TEXT        NOT NULL DEFAULT 'free' CHECK (plan IN ('free','starter','pro','enterprise')),
  ai_used     INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_company_unique UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS subscriptions_company_idx ON public.subscriptions (company_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_operator_select" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_operator_insert" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_operator_update" ON public.subscriptions;

-- 슈퍼관리자(platform_operators)만 전체 회사의 구독을 조회/변경 가능.
-- 일반 회사 구성원은 이 테이블을 직접 볼 필요가 없음(SuperAdminHub 전용 데이터).
CREATE POLICY "subscriptions_operator_select" ON public.subscriptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.platform_operators WHERE user_id = auth.uid())
);
CREATE POLICY "subscriptions_operator_insert" ON public.subscriptions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.platform_operators WHERE user_id = auth.uid())
);
CREATE POLICY "subscriptions_operator_update" ON public.subscriptions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.platform_operators WHERE user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 2) payments — 결제 내역 (다건, 회사당 여러 행)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  amount       NUMERIC     NOT NULL DEFAULT 0,
  plan         TEXT        NOT NULL DEFAULT 'free',
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending','failed','refunded')),
  payment_key  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_company_idx ON public.payments (company_id);
CREATE INDEX IF NOT EXISTS payments_created_idx ON public.payments (created_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_operator_select" ON public.payments;

-- 결제 내역은 슈퍼관리자만 조회. 실제 결제 승인(webhook)은 service_role 키로
-- 처리되므로 별도 INSERT 정책 없이도 서버 쪽에서는 RLS를 우회해 기록할 수 있음.
CREATE POLICY "payments_operator_select" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.platform_operators WHERE user_id = auth.uid())
);
