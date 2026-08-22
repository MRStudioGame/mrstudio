-- 修复：profiles 表无 bio 列，真人资料统一用空简介
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
               '中国'::text, ''::text
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

create or replace function public.get_my_follows()
returns table (
    peer_id      uuid,
    peer_type    text,
    nickname     text,
    avatar_color text,
    ip_location  text,
    bio          text,
    followed_at  timestamptz
)
language plpgsql
stable
security definer set search_path = public
as $$
begin
    return query
    select p.id, 'user'::text, coalesce(p.nickname, '匿名用户'), '#6CB4EE',
           '中国'::text, ''::text, f.created_at
    from public.follows f
    join public.profiles p on p.id = f.followed_user_id
    where f.follower_id = auth.uid()
    union all
    select b.id, 'bot'::text, b.nickname, b.avatar_color, b.ip_location,
           coalesce(b.bio, ''), f.created_at
    from public.follows f
    join public.bots b on b.id = f.followed_bot_id
    where f.follower_id = auth.uid()
    order by followed_at desc;
end;
$$;
revoke execute on function public.get_my_follows() from anon, authenticated;
grant execute on function public.get_my_follows() to anon, authenticated, service_role;
