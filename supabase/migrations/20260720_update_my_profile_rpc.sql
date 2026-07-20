-- update_my_profile: 로그인한 본인의 표시 이름(name)을 갱신하는 RPC.
-- platform_operators(운영자) 또는 company_members(직원) 중 auth.uid()와 일치하는
-- 행을 찾아 name 컬럼만 갱신한다. 남의 row는 절대 건드릴 수 없다(auth.uid() 고정).
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 이 파일 내용 전체를 붙여넣고 Run.
-- (프론트엔드 anon key만으로는 테이블 UPDATE 권한이 없을 수 있어 SECURITY DEFINER로
--  이 함수 안에서만 제한적으로 우회한다 — 이 프로젝트의 다른 RPC들(manager_update_member 등)과
--  같은 패턴이다.)

create or replace function public.update_my_profile(p_name text)
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
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name is required';
  end if;

  -- 1) 플랫폼 운영자 계정인 경우
  update public.platform_operators
     set name = trim(p_name)
   where user_id = v_uid
  returning jsonb_build_object('kind', 'operator', 'name', name) into v_updated;

  if v_updated is not null then
    return v_updated;
  end if;

  -- 2) 회사 소속 직원 계정인 경우 (활성 상태만)
  update public.company_members
     set name = trim(p_name)
   where user_id = v_uid
     and status = 'active'
  returning jsonb_build_object('kind', 'company_member', 'name', name) into v_updated;

  if v_updated is not null then
    return v_updated;
  end if;

  raise exception 'no profile row found for this user (operator/company_member 어디에도 없음)';
end;
$$;

-- 로그인한 사용자(authenticated role)만 호출 가능
grant execute on function public.update_my_profile(text) to authenticated;
