-- 20260810_company_data_sync.sql
-- Qualytree: localStorage 전면 → Supabase 동기화 인프라
--
-- 배경: 현재 인허가/GMP신청/수주고객/구매자재/품질검사/생산제조/설계개발/문서관리/
-- 교육인력/경영전략 등 실제 업무 데이터(약 85개 storage key, 100개 이상 화면) 전체가
-- 브라우저 localStorage에만 저장되어 있어, 같은 회사 소속 사용자끼리도 데이터가
-- 공유되지 않고 브라우저 캐시 삭제 시 소실됩니다.
--
-- 해결 방식: 회사(company_id) 단위로 "storage_key → value(jsonb)" 형태의 범용 테이블을
-- 두고, 프론트엔드에서 localStorage 읽기/쓰기를 가로채 자동으로 이 테이블과 동기화합니다.
-- 기존 100개 이상 화면의 개별 코드를 전부 다시 작성하지 않고도, 전체 업무 데이터를
-- 회사 단위로 실시간 공유되는 실제 멀티유저 백엔드로 전환하기 위한 구조입니다.
--
-- 적용 방법: Supabase Dashboard → SQL Editor 에서 이 파일 전체를 실행하세요.
-- (anon key로는 DDL 실행 권한이 없어 자동 적용이 불가능합니다.)

create table if not exists public.company_data (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  storage_key text not null,
  value jsonb not null default 'null'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (company_id, storage_key)
);

comment on table public.company_data is
  'Qualytree 회사별 업무 데이터 범용 저장소. storage_key는 프론트엔드 localStorage 키(qualytree.*, qms_*)와 1:1 대응. value는 해당 키의 JSON 전체 스냅샷.';

create index if not exists company_data_company_id_idx on public.company_data (company_id);
create index if not exists company_data_updated_at_idx on public.company_data (updated_at desc);

alter table public.company_data enable row level security;

-- 같은 회사(company_members.status='active') 소속 사용자만 자기 회사 데이터를 읽고 쓸 수 있음
drop policy if exists company_data_select on public.company_data;
create policy company_data_select on public.company_data
  for select
  using (
    company_id in (
      select company_id from public.company_members
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists company_data_insert on public.company_data;
create policy company_data_insert on public.company_data
  for insert
  with check (
    company_id in (
      select company_id from public.company_members
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists company_data_update on public.company_data;
create policy company_data_update on public.company_data
  for update
  using (
    company_id in (
      select company_id from public.company_members
      where user_id = auth.uid() and status = 'active'
    )
  )
  with check (
    company_id in (
      select company_id from public.company_members
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists company_data_delete on public.company_data;
create policy company_data_delete on public.company_data
  for delete
  using (
    company_id in (
      select company_id from public.company_members
      where user_id = auth.uid() and status = 'active'
    )
  );

-- updated_at 자동 갱신
create or replace function public.touch_company_data_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_company_data_touch on public.company_data;
create trigger trg_company_data_touch
  before update on public.company_data
  for each row
  execute function public.touch_company_data_updated_at();
