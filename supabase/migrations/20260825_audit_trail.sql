-- ================================================
-- 감사 추적 (Audit Trail) + 전자서명 승인 테이블
-- ISO 13485 §4.2.5 / 식약처 전자문서 기준
-- Migration: 20260825_audit_trail.sql
-- ================================================

-- 1) 감사 추적 로그 (변경 불가 — UPDATE/DELETE 정책 없음)
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   TEXT NOT NULL,
  user_id      UUID,
  user_email   TEXT NOT NULL,
  user_name    TEXT,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  before_data  JSONB,
  after_data   JSONB,
  sign_reason  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "audit_insert" ON audit_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "audit_select" ON audit_logs
  FOR SELECT USING (company_id = (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid() LIMIT 1
  ));

-- 2) 전자서명 승인 기록 (localStorage qt_approvals 대체)
CREATE TABLE IF NOT EXISTS approvals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      TEXT NOT NULL,
  record_id       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft',
  history         JSONB DEFAULT '[]',
  signed_at       TIMESTAMPTZ,
  signed_by_email TEXT,
  signed_by_name  TEXT,
  sign_reason     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, record_id)
);

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "approvals_select" ON approvals
  FOR SELECT USING (company_id = (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() LIMIT 1
  ));

CREATE POLICY IF NOT EXISTS "approvals_insert" ON approvals
  FOR INSERT WITH CHECK (company_id = (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() LIMIT 1
  ));

CREATE POLICY IF NOT EXISTS "approvals_update" ON approvals
  FOR UPDATE USING (
    status != 'approved'
    AND company_id = (
      SELECT company_id FROM company_members WHERE user_id = auth.uid() LIMIT 1
    )
  );
