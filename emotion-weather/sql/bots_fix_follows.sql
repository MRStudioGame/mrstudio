-- get_my_follows 修复：UNION 排序包子查询
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
    select t.peer_id, t.peer_type, t.nickname, t.avatar_color, t.ip_location, t.bio, t.followed_at
    from (
        select p.id as peer_id, 'user'::text as peer_type, coalesce(p.nickname, '匿名用户') as nickname,
               '#6CB4EE'::text as avatar_color, '中国'::text as ip_location, ''::text as bio,
               f.created_at as followed_at
        from public.follows f
        join public.profiles p on p.id = f.followed_user_id
        where f.follower_id = auth.uid()
        union all
        select b.id as peer_id, 'bot'::text as peer_type, b.nickname as nickname,
               b.avatar_color as avatar_color, b.ip_location as ip_location, coalesce(b.bio, '') as bio,
               f.created_at as followed_at
        from public.follows f
        join public.bots b on b.id = f.followed_bot_id
        where f.follower_id = auth.uid()
    ) t
    order by t.followed_at desc;
end;
$$;
revoke execute on function public.get_my_follows() from anon, authenticated;
grant execute on function public.get_my_follows() to anon, authenticated, service_role;
