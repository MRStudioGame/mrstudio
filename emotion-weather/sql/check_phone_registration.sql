-- 注册前检查手机号占用状态（解决历史脏数据 "User already registered" 冲突）
-- 返回：
--   'ok'     = 可注册（无 auth 记录，或 auth 记录是脏数据已自动清理）
--   'taken'  = 已注册且有完整 profile（提示直接登录）
create or replace function public.check_phone_registration(p_phone text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
    v_email text := trim(p_phone) || '@emw.local';
    v_uid uuid;
    v_has_profile boolean;
begin
    select id into v_uid from auth.users where email = v_email;
    if v_uid is null then
        return 'ok';
    end if;
    -- 有 auth 记录：检查是否有完整 profile（anonymous_id 非空 = 注册流程走完）
    select exists(
        select 1 from public.profiles
        where id = v_uid and anonymous_id is not null
    ) into v_has_profile;
    if v_has_profile then
        return 'taken';
    end if;
    -- 脏数据（有 auth 无完整 profile）：删除该 auth 用户，允许重新注册
    -- profiles/devices/follows 等通过外键级联清理
    delete from auth.users where id = v_uid;
    return 'ok';
end;
$$;
revoke execute on function public.check_phone_registration(text) from anon, authenticated;
grant execute on function public.check_phone_registration(text) to anon, authenticated, service_role;
