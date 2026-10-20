-- Storage object policies execute these immutable validation helpers as the
-- authenticated caller. The foundation migration revoked EXECUTE from that
-- role, which causes otherwise-authorised uploads to fail during policy
-- evaluation before an object reaches the private bucket.

grant execute on function public.get_document_file_max_size(text) to authenticated;
grant execute on function public.is_allowed_document_content_type(text, text) to authenticated;

comment on function public.get_document_file_max_size(text) is
  'Returns the fixed upload limit for an approved private AlliDesk bucket; executable by authenticated users because Storage RLS evaluates it.';

comment on function public.is_allowed_document_content_type(text, text) is
  'Checks fixed bucket and MIME allowlists; executable by authenticated users because Storage RLS evaluates it.';
