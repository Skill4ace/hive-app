-- public.delete_account() is security invoker, so its body runs as the calling
-- authenticated role and needs execute on the inner security-definer function.
-- The previous migration revoked it from public without re-granting, which left
-- the RPC returning "permission denied for function delete_account". Grant it to
-- authenticated, matching the convention used by the other hive_private wrappers.
grant execute on function hive_private.delete_account() to authenticated;
