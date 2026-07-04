-- Lock down SECURITY DEFINER function execution (Supabase advisor 0028/0029).
-- Postgres grants EXECUTE to PUBLIC by default, which exposes these via
-- PostgREST /rest/v1/rpc/* to anonymous visitors.

-- Trigger functions: only ever fired by triggers, never callable via API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_group() from public, anon, authenticated;

-- RLS helpers: policies evaluate them as the signed-in user, so
-- `authenticated` keeps EXECUTE; anonymous visitors lose it
revoke execute on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;

revoke execute on function public.is_group_owner(uuid) from public, anon;
grant execute on function public.is_group_owner(uuid) to authenticated;

-- Join-by-code RPC: signed-in users only
revoke execute on function public.join_group_by_code(text) from public, anon;
grant execute on function public.join_group_by_code(text) to authenticated;
