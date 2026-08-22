-- get_publisher_profile 改进：真人支持按 匿名ID 或 UUID 查询（机器人仍按 UUID）
create or replace function public.get_publisher_profile(p_peer_type text, p_peer_id text)
returns table (peer_id uuid, nickname text, avatar_color text, ip_location text, bio text)
language plpgsql
stable
security definer set search_path = public
as $$
declare
    v_uid uuid;
begin
    if p_peer_type = 'user' then
        -- 先按匿名ID查，再按UUID查
        select id into v_uid from public.profiles where anonymous_id = p_peer_id;
        if v_uid is null then
            begin
                v_uid := p_peer_id::uuid;
            exception when others then
                return;
            end;
        end if;
        return query
        select p.id, coalesce(p.nickname, '匿名用户'), '#6CB4EE',
               '中国'::text, coalesce(p.bio, '')
        from public.profiles p
        where p.id = v_uid;
    else
        return query
        select b.id, b.nickname, b.avatar_color, b.ip_location, coalesce(b.bio, '')
        from public.bots b
        where b.id = p_peer_id::uuid;
    end if;
end;
$$;
revoke execute on function public.get_publisher_profile(text, text) from anon, authenticated;
grant execute on function public.get_publisher_profile(text, text) to anon, authenticated, service_role;
