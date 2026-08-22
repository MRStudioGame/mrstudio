-- ==================== 情绪气象台：机器人系统 RPC ====================

-- 6. get_bot_clouds：返回所有机器人当前云朵（无则自动生成一朵存库，附发布者资料）
--    返回结构与真人云朵统一，昵称/头像/属地完全伪装，不暴露机器人身份
create or replace function public.get_bot_clouds()
returns table (
    id                     uuid,
    content                text,
    emotion                text,
    lat                    double precision,
    lng                    double precision,
    publisher_anonymous_id text,
    publisher_bot_id       uuid,
    warm_value             int,
    created_at             timestamptz,
    nickname               text,
    avatar_color           text,
    ip_location            text,
    bio                     text
)
language plpgsql
security definer set search_path = public
as $$
declare
    v_bot record;
    v_content text;
    v_emotion text;
begin
    for v_bot in select * from public.bots order by created_at loop
        if not exists (
            select 1 from public.clouds c
            where c.publisher_bot_id = v_bot.id and c.expires_at > now()
        ) then
            v_content := (array[
                '今天考试有点慌','放学路上的晚霞真美','耳机里单曲循环第8遍了',
                '窗外下小雨，心情却很好','刚跑完步，好爽','想找人一起看星星',
                '今天的云像棉花糖','作业终于写完了','喝到了喜欢的奶茶',
                '被朋友的一句话暖到','突然有点想家','图书馆靠窗的位置真舒服',
                '今晚的月亮特别亮','种的小花发芽了','公交车上被让座，说了谢谢',
                '食堂阿姨多打了一勺菜','晚自习的风好凉快','周末想去爬山'
            ])[1 + floor(random() * 18)::int];
            v_emotion := (array['happy','calm','anxious','confused','lonely','touched','tired','angry'])
                [1 + floor(random() * 8)::int];
            insert into public.clouds (content, emotion, lat, lng, publisher_bot_id, warm_value, expires_at)
            values (v_content, v_emotion,
                    v_bot.lat + (random() - 0.5) * 0.02,
                    v_bot.lng + (random() - 0.5) * 0.02,
                    v_bot.id, 0, now() + interval '24 hours');
        end if;
    end loop;
    return query
    select c.id, c.content, c.emotion, c.lat, c.lng,
           null::text, c.publisher_bot_id,
           c.warm_value, c.created_at,
           b.nickname, b.avatar_color, b.ip_location, coalesce(b.bio, '')
    from public.clouds c
    join public.bots b on b.id = c.publisher_bot_id
    where c.expires_at > now()
    order by c.created_at desc;
end;
$$;
revoke execute on function public.get_bot_clouds() from anon, authenticated;
grant execute on function public.get_bot_clouds() to anon, authenticated, service_role;

-- 7. get_publisher_profile：统一资料卡（真人或机器人，App 不感知类型差异）
create or replace function public.get_publisher_profile(p_peer_type text, p_peer_id text)
returns table (peer_id uuid, nickname text, avatar_color text, ip_location text, bio text)
language plpgsql
stable
security definer set search_path = public
as $$
begin
    if p_peer_type = 'user' then
        return query
        select p.id, coalesce(p.nickname, '匿名用户'), '#6CB4EE',
               '中国'::text, coalesce(p.bio, '')
        from public.profiles p
        where p.id = p_peer_id::uuid;
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

-- 8. 关注 / 取关 / 关注状态 / 我的关注列表
create or replace function public.follow_target(p_peer_type text, p_peer_id text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
begin
    if v_uid is null then raise exception 'not authenticated'; end if;
    if p_peer_type = 'user' then
        insert into public.follows (follower_id, followed_user_id)
        values (v_uid, p_peer_id::uuid)
        on conflict (follower_id, followed_user_id) where followed_user_id is not null do nothing;
    else
        insert into public.follows (follower_id, followed_bot_id)
        values (v_uid, p_peer_id::uuid)
        on conflict (follower_id, followed_bot_id) where followed_bot_id is not null do nothing;
    end if;
end;
$$;
revoke execute on function public.follow_target(text, text) from anon, authenticated;
grant execute on function public.follow_target(text, text) to anon, authenticated, service_role;

create or replace function public.unfollow_target(p_peer_type text, p_peer_id text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
begin
    if v_uid is null then raise exception 'not authenticated'; end if;
    if p_peer_type = 'user' then
        delete from public.follows where follower_id = v_uid and followed_user_id = p_peer_id::uuid;
    else
        delete from public.follows where follower_id = v_uid and followed_bot_id = p_peer_id::uuid;
    end if;
end;
$$;
revoke execute on function public.unfollow_target(text, text) from anon, authenticated;
grant execute on function public.unfollow_target(text, text) to anon, authenticated, service_role;

create or replace function public.is_following(p_peer_type text, p_peer_id text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
    select exists (
        select 1 from public.follows
        where follower_id = auth.uid()
          and ((p_peer_type = 'user' and followed_user_id = p_peer_id::uuid)
            or (p_peer_type = 'bot' and followed_bot_id = p_peer_id::uuid))
    );
$$;
revoke execute on function public.is_following(text, text) from anon, authenticated;
grant execute on function public.is_following(text, text) to anon, authenticated, service_role;

-- 9. get_my_follows：我的关注列表（真人和机器人统一资料，按关注时间倒序）
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
           '中国'::text, coalesce(p.bio, ''), f.created_at
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

-- 10. light_lantern 改造：机器人云朵不接受路灯（提示语不暴露身份）
create or replace function public.light_lantern(p_cloud_id uuid)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
    v_warm int;
    v_bot  uuid;
begin
    if auth.uid() is null then raise exception 'not authenticated'; end if;
    select publisher_bot_id into v_bot from public.clouds where id = p_cloud_id;
    if v_bot is not null then
        raise exception 'cloud not lightable';
    end if;
    if exists (
        select 1 from public.lanterns
        where cloud_id = p_cloud_id and user_id = auth.uid()
    ) then
        raise exception 'already lit';
    end if;
    insert into public.lanterns (cloud_id, user_id)
    values (p_cloud_id, auth.uid());
    update public.clouds
    set warm_value = warm_value + 1
    where id = p_cloud_id
    returning warm_value into v_warm;
    return v_warm;
end;
$$;
revoke execute on function public.light_lantern(uuid) from anon, authenticated;
grant execute on function public.light_lantern(uuid) to anon, authenticated, service_role;

-- 11. get_today_warm_ranking 改造：机器人云朵不上温暖榜
create or replace function public.get_today_warm_ranking()
returns table (
    rank       int,
    cloud_id   uuid,
    content    text,
    emotion    text,
    warm_value int,
    lat        double precision,
    lng        double precision
)
language sql
stable
security definer set search_path = public
as $$
    select
        row_number() over (order by c.warm_value desc, c.created_at asc)::int as rank,
        c.id, c.content, c.emotion, c.warm_value, c.lat, c.lng
    from public.clouds c
    where c.created_at::date = current_date
      and c.expires_at > now()
      and c.publisher_bot_id is null
    order by c.warm_value desc
    limit 10;
$$;
revoke execute on function public.get_today_warm_ranking() from anon, authenticated;
grant execute on function public.get_today_warm_ranking() to anon, authenticated, service_role;
