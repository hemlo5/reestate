alter table public.properties
  add column if not exists broker_rera_authority text not null default '',
  add column if not exists broker_rera_id text not null default '';

update public.properties p
set broker_rera_id = coalesce(bp.rera_id, ''),
    broker_rera_authority = coalesce(
      nullif(bp.verification_docs ->> 'reraAuthority', ''),
      case
        when lower(u.city) like '%bengaluru%' or lower(u.city) like '%karnataka%' then 'Karnataka RERA'
        when lower(u.city) like '%mumbai%' or lower(u.city) like '%maharashtra%' or lower(u.city) like '%pune%' then 'MahaRERA'
        when lower(u.city) like '%kerala%' or lower(u.city) like '%kochi%' or lower(u.city) like '%thiruvananthapuram%' then 'K-RERA'
        else ''
      end
    )
from public.broker_profiles bp
join public.users u on u.id = bp.user_id
where p.broker_id = bp.user_id;
