-- 20260818_fix_company_data_schema.sql
-- cloudSync.js 실제 컬럼명과 SQL 스키마 불일치 교정
-- 적용: Supabase Dashboard -> SQL Editor -> Run
-- ------------------------------------------------------------
-- 1) 기존 테이블 컬럼명 교정 (storage_key->data_key, value->payload)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='company_data' AND column_name='storage_key')
  THEN ALTER TABLE public.company_data RENAME COLUMN storage_key TO data_key; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='company_data' AND column_name='value')
  THEN ALTER TABLE public.company_data RENAME COLUMN value TO payload; END IF;
END $$;

ALTER TABLE public.company_data ADD COLUMN IF NOT EXISTS data_type text NOT NULL DEFAULT 'localStorage_sync';
ALTER TABLE public.company_data ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;

ALTER TABLE public.company_data DROP CONSTRAINT IF EXISTS company_data_company_id_storage_key_key;
ALTER TABLE public.company_data DROP CONSTRAINT IF EXISTS company_data_company_id_data_key_key;
ALTER TABLE public.company_data DROP CONSTRAINT IF EXISTS company_data_unique_data_key;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='company_data' AND constraint_name='company_data_unique_data_key')
  THEN ALTER TABLE public.company_data ADD CONSTRAINT company_data_unique_data_key UNIQUE (company_id, data_type, data_key); END IF;
END $$;

-- ------------------------------------------------------------
-- 2) 테이블 미존재시 신규 생성 (올바른 스키마)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_data (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  data_type       text        NOT NULL DEFAULT 'localStorage_sync',
  data_key        text        NOT NULL,
  payload         jsonb,
  version         bigint      NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_name text,
  CONSTRAINT company_data_unique_data_key UNIQUE (company_id, data_type, data_key)
);

CREATE INDEX IF NOT EXISTS company_data_cid_idx ON public.company_data (company_id);
CREATE INDEX IF NOT EXISTS company_data_type_idx ON public.company_data (company_id, data_type);
CREATE INDEX IF NOT EXISTS company_data_ts_idx ON public.company_data (updated_at DESC);

-- ------------------------------------------------------------
-- 3) Row Level Security
-- ------------------------------------------------------------
ALTER TABLE public.company_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_data_select" ON public.company_data;
DROP POLICY IF EXISTS "company_data_insert" ON public.company_data;
DROP POLICY IF EXISTS "company_data_update" ON public.company_data;
DROP POLICY IF EXISTS "company_data_delete" ON public.company_data;
DROP POLICY IF EXISTS "members can read company data" ON public.company_data;
DROP POLICY IF EXISTS "members can write company data" ON public.company_data;

CREATE POLICY "company_data_select" ON public.company_data FOR SELECT USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));
CREATE POLICY "company_data_insert" ON public.company_data FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));
CREATE POLICY "company_data_update" ON public.company_data FOR UPDATE USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));
CREATE POLICY "company_data_delete" ON public.company_data FOR DELETE USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- ------------------------------------------------------------
-- 4) updated_at 자동 갱신 트리거
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS company_data_updated_at ON public.company_data;
CREATE TRIGGER company_data_updated_at
  BEFORE UPDATE ON public.company_data
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
