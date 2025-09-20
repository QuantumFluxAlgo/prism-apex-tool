create schema if not exists prism;
create or replace view prism.tickets_flat as
select
  (payload->>'date')::date        as date,
  (payload->>'strategy')          as strategy,
  (payload->>'symbol')            as symbol,
  (payload->>'side')              as side,
  coalesce((payload->>'qty')::int, 0)        as qty,
  coalesce((payload->>'price')::numeric, 0)  as price,
  (payload->>'ts')::timestamptz   as ts
from prism.tickets_raw;
