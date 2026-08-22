-- ==================== 管理端：机器人管理 RPC ====================

-- 12. admin_list_bots：机器人列表（含云朵数）
create or replace function public.admin_list_bots(p_password text)
returns table (
    id           uuid,
    nickname     text,
    avatar_color text,
    ip_location  text,
    bio          text,
    lat          double precision,
    lng          double precision,
    created_at   timestamptz,
    cloud_count  bigint
)
language plpgsql
stable
security definer set search_path = public
as $$
begin
    if p_password <> '2013' then raise exception 'invalid password'; end if;
    return query
    select b.id, b.nickname, b.avatar_color, b.ip_location, coalesce(b.bio, ''),
           b.lat, b.lng, b.created_at,
           (select count(*) from public.clouds c where c.publisher_bot_id = b.id) as cloud_count
    from public.bots b
    order by b.created_at desc;
end;
$$;
revoke execute on function public.admin_list_bots(text) from anon, authenticated;
grant execute on function public.admin_list_bots(text) to anon, authenticated, service_role;

-- 13. admin_add_bot：添加机器人（昵称/属地/简介，头像自动生成纯色+首字母；坐标随机分配全国城市）
create or replace function public.admin_add_bot(
    p_password text,
    p_nickname text,
    p_ip_location text,
    p_bio text
)
returns public.bots
language plpgsql
security definer set search_path = public
as $$
declare
    v_bot public.bots;
    v_lat double precision;
    v_lng double precision;
    v_color text;
begin
    if p_password <> '2013' then raise exception 'invalid password'; end if;
    if p_nickname is null or trim(p_nickname) = '' then raise exception 'nickname required'; end if;
    -- 随机分配全国城市坐标
    select lat, lng into v_lat, v_lng from (
        values
        (39.9042, 116.4074, '北京'), (31.2304, 121.4737, '上海'),
        (23.1291, 113.2644, '广州'), (22.5431, 114.0579, '深圳'),
        (30.5728, 104.0668, '成都'), (29.5630, 106.5516, '重庆'),
        (30.5928, 114.3055, '武汉'), (30.2741, 120.1551, '杭州'),
        (32.0603, 118.7969, '南京'), (34.3416, 108.9398, '西安'),
        (28.2282, 112.9388, '长沙'), (31.2989, 120.5853, '苏州'),
        (34.7466, 113.6254, '郑州'), (39.3434, 117.3616, '天津'),
        (36.0671, 120.3826, '青岛'), (24.4798, 118.0894, '厦门')
    ) as cities(lat, lng, name)
    order by random()
    limit 1;
    -- 随机头像色（柔和色板）
    v_color := (array['#FFB74D','#7986CB','#F06292','#4DB6AC','#FF8A65','#9575CD','#FFD54F','#64B5F6','#81C784','#FFA726','#A1887F','#5C6BC0','#4DD0E1','#F48FB1','#FF8A80','#90A4AE','#AED581','#80CBC4'])[1 + floor(random() * 18)::int];
    insert into public.bots (nickname, avatar_color, ip_location, bio, lat, lng)
    values (trim(p_nickname), v_color, p_ip_location, coalesce(p_bio, ''), v_lat + (random()-0.5)*0.05, v_lng + (random()-0.5)*0.05)
    returning * into v_bot;
    return v_bot;
end;
$$;
revoke execute on function public.admin_add_bot(text, text, text, text) from anon, authenticated;
grant execute on function public.admin_add_bot(text, text, text, text) to anon, authenticated, service_role;

-- 14. admin_delete_bot：删除机器人（级联：关注、云朵、消息）
create or replace function public.admin_delete_bot(p_password text, p_bot_id text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
    v_id uuid := p_bot_id::uuid;
begin
    if p_password <> '2013' then raise exception 'invalid password'; end if;
    -- 关注关系（follows 已 on delete cascade，这里显式清一遍确保）
    delete from public.follows where followed_bot_id = v_id;
    -- 机器人云朵（clouds 已 on delete cascade）
    -- 机器人相关消息（用户发给机器人 或 管理员仿冒机器人回复的）
    delete from public.messages where to_user_id = v_id::text and to_user_type = 'bot';
    delete from public.messages where from_user_id = v_id::text;
    -- 机器人本体
    delete from public.bots where id = v_id;
end;
$$;
revoke execute on function public.admin_delete_bot(text, text) from anon, authenticated;
grant execute on function public.admin_delete_bot(text, text) to anon, authenticated, service_role;

-- 15. admin_list_bot_messages：用户发给机器人的消息（管理端待回复列表）
--     显示：发送用户匿名ID+手机号、目标机器人昵称、消息内容、发送时间、是否已回复
create or replace function public.admin_list_bot_messages(p_password text)
returns table (
    id              uuid,
    from_user_id    text,
    from_anonymous  text,
    from_phone      text,
    bot_id          text,
    bot_nickname    text,
    content         text,
    created_at      timestamptz,
    replied         boolean
)
language plpgsql
stable
security definer set search_path = public
as $$
begin
    if p_password <> '2013' then raise exception 'invalid password'; end if;
    return query
    select m.id,
           m.from_user_id,
           coalesce(p.anonymous_id, '') as from_anonymous,
           coalesce(p.phone, '') as from_phone,
           m.to_user_id as bot_id,
           coalesce(b.nickname, '已删除') as bot_nickname,
           m.content,
           m.created_at,
           exists (
               select 1 from public.messages r
               where r.from_user_id = m.to_user_id
                 and r.to_user_id = m.from_user_id
                 and r.to_user_type = 'real'
                 and r.created_at > m.created_at
           ) as replied
    from public.messages m
    left join public.profiles p on p.id::text = m.from_user_id
    left join public.bots b on b.id::text = m.to_user_id
    where m.to_user_type = 'bot'
    order by (exists (
        select 1 from public.messages r
        where r.from_user_id = m.to_user_id
          and r.to_user_id = m.from_user_id
          and r.to_user_type = 'real'
          and r.created_at > m.created_at
    )) asc, m.created_at desc;
end;
$$;
revoke execute on function public.admin_list_bot_messages(text) from anon, authenticated;
grant execute on function public.admin_list_bot_messages(text) to anon, authenticated, service_role;

-- 16. admin_reply_as_bot：管理员仿冒机器人回复用户
--     写入 messages：from=机器人ID, to=原发送用户, to_user_type='real'
--     用户端显示为机器人本人回复（昵称/头像与机器人完全一致）
create or replace function public.admin_reply_as_bot(
    p_password text,
    p_message_id text,
    p_content text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
    v_msg public.messages;
begin
    if p_password <> '2013' then raise exception 'invalid password'; end if;
    select * into v_msg from public.messages where id = p_message_id::uuid;
    if v_msg.id is null then raise exception 'message not found'; end if;
    if v_msg.to_user_type <> 'bot' then raise exception 'not a bot message'; end if;
    if p_content is null or trim(p_content) = '' then raise exception 'content required'; end if;
    insert into public.messages (from_user_id, to_user_id, content, to_user_type)
    values (v_msg.to_user_id, v_msg.from_user_id, trim(p_content), 'real');
end;
$$;
revoke execute on function public.admin_reply_as_bot(text, text, text) from anon, authenticated;
grant execute on function public.admin_reply_as_bot(text, text, text) to anon, authenticated, service_role;
