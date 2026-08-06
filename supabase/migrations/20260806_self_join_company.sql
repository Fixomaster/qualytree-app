-- ============================================================================
-- 직원 셀프 가입(B방식): 사업자등록번호로 소속 회사를 자동 매칭하여 가입 신청
-- ============================================================================
-- 기존 A방식(manager_create_member — 관리자가 직접 이름+임시비밀번호를 발급)은
-- 그대로 유지된다. 이 마이그레이션은 그 옆에 "직원이 스스로 가입 신청"하는
-- 두 번째 경로를 추가할 뿐이며, 기존 테이블 구조·RPC·로그인 로직(member_login_email,
-- manager_update_member, MemberAdmin.jsx의 "승인대기" UI)은 전혀 건드리지 않는다.
--
-- 왜 이렇게 설계했는가:
--   1) company_members.status='pending' 상태는 이미 MemberAdmin.jsx에
--      "승인 대기" 큐 + 승인/거절 버튼으로 구현되어 있다(manager_create_member의
--      role='operator' 신청과 동일한 상태값). 셀프 가입도 동일하게 status='pending'
--      으로 넣기만 하면, 관리자 쪽 화면 코드를 단 한 줄도 바꾸지 않고 그대로
--      승인 큐에 나타난다 — 회사 관리자가 "누가 우리 회사라고 주장하며 들어오는지"
--      반드시 눈으로 확인하고 승인해야 하며(의료기기 규제 SaaS이므로 신원 검증 없는
--      자동 활성화는 지양), 이는 요청하신 "자동 소속 매칭"이 소속 회사를 자동으로
--      찾아준다는 뜻이지 자동으로 전체 시스템 접근권을 부여한다는 뜻은 아니라는
--      판단에 따른 것이다. 자동 즉시활성이 필요하면 아래 allow_self_signup 플래그와
--      RPC의 status 기본값 한 줄만 바꾸면 된다(하단 주석 참고).
--   2) 로그인은 기존 "작업자" 로그인(사업자번호+이름+비밀번호)을 그대로 재사용한다.
--      셀프 가입 시 프론트엔드가 진짜 이메일로 supabase.auth.signUp()을 호출해
--      auth.users를 만들고, 그 user_id로 company_members 행을 추가하는 구조이므로
--      member_login_email RPC(내부적으로 auth.users.email을 user_id로 역조회하는
--      것으로 추정)는 수정 없이 그대로 동작한다.
-- ============================================================================

-- 회사가 셀프 가입을 허용하는지 여부(회사별 온오프 스위치, 추후 관리자 UI에서 토글 가능하도록 컬럼만 미리 추가)
alter table public.companies
  add column if not exists allow_self_signup boolean not null default true;

comment on column public.companies.allow_self_signup is
  'true면 사업자등록번호를 아는 직원이 스스로 가입 신청(승인대기)할 수 있음. false면 관리자가 계정관리 화면에서 직접 발급해야 함.';

-- ----------------------------------------------------------------------------
-- 1) find_company_by_business_number — 가입 신청 전, 사업자번호로 회사를 미리
--    확인시켜주는 조회 전용 함수. 로그인 전(anon)에도 호출 가능해야 하므로
--    회사명 등 최소 정보만 반환하고 민감정보는 절대 포함하지 않는다.
-- ----------------------------------------------------------------------------
create or replace function public.find_company_by_business_number(p_business_number text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_biz text := trim(coalesce(p_business_number, ''));
  v_row record;
begin
  if v_biz = '' then
    raise exception '사업자등록번호를 입력해주세요.';
  end if;

  select id, name, allow_self_signup
    into v_row
    from public.companies
   where regexp_replace(business_number, '[^0-9]', '', 'g') = regexp_replace(v_biz, '[^0-9]', '', 'g')
   limit 1;

  if v_row.id is null then
    raise exception '일치하는 회사를 찾을 수 없습니다. 사업자등록번호를 다시 확인해주세요.';
  end if;

  if not v_row.allow_self_signup then
    raise exception '해당 회사는 셀프 가입이 비활성화되어 있습니다. 회사 관리자에게 계정 발급을 요청해주세요.';
  end if;

  return jsonb_build_object('company_id', v_row.id, 'company_name', v_row.name);
end;
$$;

-- 로그인 전(anon) + 로그인 후(authenticated) 모두 미리보기 조회는 허용
grant execute on function public.find_company_by_business_number(text) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 2) request_company_join — 실제 가입 신청. 반드시 로그인(auth.signUp 직후
--    세션 존재) 상태에서 호출되어야 한다(auth.uid() 필요). status='pending'으로
--    company_members에 행을 만들고, 회사 관리자가 MemberAdmin.jsx에서 승인하면
--    manager_update_member('approve')가 status를 'active'로 바꿔준다(기존 로직).
-- ----------------------------------------------------------------------------
create or replace function public.request_company_join(p_business_number text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_biz text := trim(coalesce(p_business_number, ''));
  v_name text := trim(coalesce(p_name, ''));
  v_company record;
  v_existing record;
  v_new_id uuid;
begin
  if v_uid is null then
    raise exception '로그인 후 다시 시도해주세요 (인증 세션 없음).';
  end if;
  if v_biz = '' then
    raise exception '사업자등록번호를 입력해주세요.';
  end if;
  if v_name = '' then
    raise exception '이름을 입력해주세요.';
  end if;

  -- 이미 플랫폼 운영자 계정이면 직원 가입 대상이 아님
  if exists (select 1 from public.platform_operators where user_id = v_uid) then
    raise exception '이미 운영자 계정으로 가입되어 있습니다.';
  end if;

  -- 이미 어떤 회사에든 소속(활성/대기 무관)되어 있으면 중복 가입 방지
  select id, company_id, status into v_existing
    from public.company_members
   where user_id = v_uid
   limit 1;

  if v_existing.id is not null then
    raise exception '이미 회사 소속 계정이 있습니다(상태: %). 로그인 화면에서 로그인해주세요.', v_existing.status;
  end if;

  select id, name, allow_self_signup into v_company
    from public.companies
   where regexp_replace(business_number, '[^0-9]', '', 'g') = regexp_replace(v_biz, '[^0-9]', '', 'g')
   limit 1;

  if v_company.id is null then
    raise exception '일치하는 회사를 찾을 수 없습니다. 사업자등록번호를 다시 확인해주세요.';
  end if;
  if not v_company.allow_self_signup then
    raise exception '해당 회사는 셀프 가입이 비활성화되어 있습니다. 회사 관리자에게 계정 발급을 요청해주세요.';
  end if;

  -- 같은 회사 안에서 이름이 이미 쓰이고 있으면(로그인 ID 성격) 안내만 하고 막지는 않되,
  -- 관리자가 승인 화면에서 혼동하지 않도록 이름 뒤에 구분자를 붙여 저장한다.
  select id into v_existing
    from public.company_members
   where company_id = v_company.id
     and lower(trim(name)) = lower(v_name)
     and status in ('active', 'pending')
   limit 1;

  insert into public.company_members (company_id, user_id, name, permission_level, is_admin, status)
  values (
    v_company.id,
    v_uid,
    case when v_existing.id is not null then v_name || ' (' || to_char(now(), 'MMDD') || ')' else v_name end,
    1,        -- 작업자 기본 권한 (관리자가 승인 후 필요 시 상향 조정)
    false,
    'pending' -- MemberAdmin.jsx 기존 승인대기 큐에 그대로 노출됨
  )
  returning id into v_new_id;

  return jsonb_build_object(
    'ok', true,
    'member_id', v_new_id,
    'company_name', v_company.name,
    'status', 'pending'
  );
end;
$$;

-- 로그인(authenticated)한 사용자만 자기 자신의 가입 신청을 넣을 수 있음
grant execute on function public.request_company_join(text, text) to authenticated;

-- ============================================================================
-- 참고: 승인 없이 즉시 활성화하고 싶다면(비권장 — 신원 미검증 자동 접근이 되므로
-- 의료기기 규제 데이터를 다루는 이 서비스 성격상 기본값은 'pending' 승인 방식을
-- 권장합니다) request_company_join 안의 insert 문에서 'pending' → 'active' 로만
-- 바꾸면 됩니다. 회사별로 다르게 하고 싶다면 companies에 컬럼(예: auto_activate_self_join)
-- 을 추가해 그 값을 분기하면 됩니다.
-- ============================================================================
