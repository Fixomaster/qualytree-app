-- #374: 부서 선택을 계정(Supabase)에 영구 저장하기 위한 컬럼 + RPC.
-- 지금까지 부서 선택은 브라우저 localStorage(qualytree.dept)에만 저장되어, 캐시를
-- 지우거나 다른 기기로 로그인하면 매번 다시 골라야 했다. company_members에 last_dept
-- 컬럼을 추가하고, 본인 행만 수정 가능한 SECURITY DEFINER RPC로 갱신한다
-- (update_my_profile과 동일한 패턴 — 프론트엔드 anon key만으로는 테이블 UPDATE 권한이
--  없을 수 있어 이 함수 안에서만 제한적으로 우회한다).
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 이 파일 내용 전체를 붙여넣고 Run.

alter table public.company_members
  add column if not exists last_dept text;

comment on column public.company_members.last_dept is
  '이 사용자가 마지막으로 선택한 부서 코드(DEPT_LIST, 예: SAL/MFG/QUA/ALL 등) — 로그인 시 기기 간 이어받기용.';

create or replace function public.update_my_last_dept(p_dept text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_updated jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_dept is null or length(trim(p_dept)) = 0 then
    raise exception 'dept is required';
  end if;

  update public.company_members
     set last_dept = trim(p_dept)
   where user_id = v_uid
     and status = 'active'
  returning jsonb_build_object('kind', 'company_member', 'last_dept', last_dept) into v_updated;

  if v_updated is not null then
    return v_updated;
  end if;

  raise exception 'no active company_members row found for this user';
end;
$$;

grant execute on function public.update_my_last_dept(text) to authenticated;
