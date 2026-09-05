-- AI 사용량 로그 테이블 (ai_usage_log)
-- 실행: Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL,
  month       TEXT        NOT NULL,  -- 'YYYY-MM'
  plan        TEXT        NOT NULL DEFAULT 'free',
  count       INTEGER     NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT  uq_ai_usage_company_month UNIQUE (company_id, month)
);

-- RLS
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- 자기 회사 사용량 읽기 허용
CREATE POLICY "own company usage read"
  ON ai_usage_log FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Service role만 삽입/수정 (Edge Function이 service key로 호출)
CREATE POLICY "service role insert"
  ON ai_usage_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "service role update"
  ON ai_usage_log FOR UPDATE
  USING (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_usage_company_month ON ai_usage_log (company_id, month);

-- Edge Function 시크릿 설정 명령 (터미널에서 실행)
-- supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
-- supabase functions deploy generate-draft
